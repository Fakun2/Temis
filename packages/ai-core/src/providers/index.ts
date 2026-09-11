import type {
  AiModel,
  AiProviderRequest,
  AiProviderResponse,
  AiTool
} from "@temis/ai-contracts";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { estimateTokens } from "../tokens";

export type GenerateTextInput = {
  system: string;
  prompt: string;
  temperature?: number;
};

export type GenerateTextResult = {
  content: string;
  model: string;
};

export interface AiProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}

export interface TemisAiProvider {
  generate(request: AiProviderRequest): Promise<AiProviderResponse>;
}

export type AiProviderStrategyName = "openai-compatible" | "preview";

export type AiProviderStrategyConfig =
  | { strategy: "preview" }
  | {
      apiKey: string;
      baseURL: string;
      maxOutputTokens?: number;
      modelResolver: AiProviderModelResolver;
      name?: string;
      strategy: "openai-compatible";
      temperature?: number;
    };

export type AiProviderModelResolver = (model: AiModel) => string;

export function createTemisAiProvider(config: AiProviderStrategyConfig): TemisAiProvider {
  if (config.strategy === "openai-compatible") {
    return new OpenAICompatibleTemisAiProvider(config);
  }

  return new PreviewTemisAiProvider();
}

export class PreviewTemisAiProvider implements TemisAiProvider {
  async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
    return {
      content: buildPreviewResponse(request.tool, request.context.case?.caseNumber),
      finishReason: "stop",
      usage: {
        inputTokens: estimateTokens(`${request.systemPrompt}\n${request.prompt}`),
        outputTokens: 42
      }
    };
  }
}

export class OpenAICompatibleTemisAiProvider implements TemisAiProvider {
  private readonly provider;

  constructor(private readonly config: Extract<AiProviderStrategyConfig, { strategy: "openai-compatible" }>) {
    this.provider = createOpenAICompatible({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      name: config.name ?? "openai-compatible"
    });
  }

  async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
    const providerModel = this.config.modelResolver(request.model);
    const response = await generateText({
      maxOutputTokens: this.config.maxOutputTokens,
      model: this.provider.chatModel(providerModel),
      prompt: request.prompt,
      system: request.systemPrompt,
      temperature: this.config.temperature
    });

    return {
      content: response.text,
      finishReason: toTemisFinishReason(response.finishReason),
      usage: {
        inputTokens:
          response.usage.inputTokens ?? estimateTokens(`${request.systemPrompt}\n${request.prompt}`),
        outputTokens: response.usage.outputTokens ?? estimateTokens(response.text)
      }
    };
  }
}

function buildPreviewResponse(tool: AiTool, caseNumber?: string) {
  if (tool === "general") {
    return "Validacion completada. Puedo iniciar una conversacion general sin consultar datos operativos del tenant.";
  }

  const caseLabel = caseNumber ? ` para el expediente ${caseNumber}` : "";

  return `Validacion completada. Puedo responder${caseLabel} usando solo datos de lectura autorizados del tenant activo.`;
}

function toTemisFinishReason(finishReason: string): AiProviderResponse["finishReason"] {
  if (finishReason === "stop" || finishReason === "length") {
    return finishReason;
  }

  return "error";
}
