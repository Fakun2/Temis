import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTemisAiProvider, type TemisAiProvider } from "@temis/ai-core";
import type { AiModel } from "../ai.schemas";
import type { AiProviderRequest, AiProviderResponse } from "../types/ai-provider.types";

const providerCreditMessage =
  "No hay creditos disponibles para generar la respuesta con IA. Revisa la facturacion del proveedor y vuelve a intentar.";

@Injectable()
export class AiProviderService {
  private readonly provider: TemisAiProvider;

  constructor(config: ConfigService) {
    this.provider = createTemisAiProvider(toProviderConfig(config));
  }

  async generate(request: AiProviderRequest): Promise<AiProviderResponse> {
    try {
      return await this.provider.generate(request);
    } catch (error) {
      throw toSafeProviderException(error);
    }
  }
}

function toProviderConfig(config: ConfigService): Parameters<typeof createTemisAiProvider>[0] {
  const strategy = config.get<string>("AI_PROVIDER") ?? "preview";

  if (strategy !== "openai-compatible") {
    return { strategy: "preview" };
  }

  const apiKey = config.get<string>("AI_OPENAI_API_KEY") ?? config.get<string>("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "AI_OPENAI_API_KEY u OPENAI_API_KEY es requerido para AI_PROVIDER=openai-compatible."
    );
  }

  return {
    apiKey,
    baseURL: config.get<string>("AI_OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
    maxOutputTokens: toOptionalNumber(config.get<string>("AI_MAX_OUTPUT_TOKENS")),
    modelResolver: createModelResolver(config),
    name: config.get<string>("AI_OPENAI_PROVIDER_NAME") ?? "openai",
    strategy: "openai-compatible",
    temperature: toOptionalNumber(config.get<string>("AI_TEMPERATURE"))
  };
}

function createModelResolver(config: ConfigService) {
  const fallbackModel =
    config.get<string>("AI_OPENAI_MODEL") || config.get<string>("AI_DEFAULT_MODEL");
  const modelMap: Record<AiModel, string | undefined> = {
    "temis-legal":
      config.get<string>("AI_MODEL_TEMIS_LEGAL") ||
      config.get<string>("AI_MODEL_JUSTINIA_LEGAL") ||
      config.get<string>("AI_MODEL_BOGAPP_LEGAL") ||
      fallbackModel,
    fast: config.get<string>("AI_MODEL_FAST") || fallbackModel,
    reasoning: config.get<string>("AI_MODEL_REASONING") || fallbackModel
  };

  return (model: AiModel) => {
    const providerModel = modelMap[model];
    if (!providerModel) {
      throw new Error(`No hay modelo proveedor configurado para ${model}.`);
    }

    return providerModel;
  };
}

function toOptionalNumber(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function toSafeProviderException(error: unknown) {
  const statusCode = getProviderStatusCode(error);
  const searchableError = getSearchableErrorText(error);

  if (isCreditOrBillingError(statusCode, searchableError)) {
    return new HttpException(providerCreditMessage, HttpStatus.PAYMENT_REQUIRED);
  }

  if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
    return new HttpException(
      "El proveedor de IA esta limitando temporalmente las solicitudes. Espera unos minutos y vuelve a intentar.",
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  if (statusCode === HttpStatus.UNAUTHORIZED || statusCode === HttpStatus.FORBIDDEN) {
    return new HttpException(
      "No se pudo autenticar con el proveedor de IA. Revisa la configuracion de la credencial.",
      HttpStatus.BAD_GATEWAY
    );
  }

  if (statusCode === HttpStatus.NOT_FOUND) {
    return new HttpException(
      "El modelo de IA configurado no esta disponible para esta credencial.",
      HttpStatus.BAD_GATEWAY
    );
  }

  return new HttpException(
    "No se pudo generar la respuesta con IA. Vuelve a intentar en unos minutos.",
    HttpStatus.SERVICE_UNAVAILABLE
  );
}

function getProviderStatusCode(error: unknown) {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === "number" ? statusCode : undefined;
  }

  return undefined;
}

function getSearchableErrorText(error: unknown) {
  const parts: string[] = [];

  if (error instanceof Error) {
    parts.push(error.message);
  }

  if (error && typeof error === "object") {
    const providerError = error as {
      data?: unknown;
      responseBody?: unknown;
    };

    parts.push(stringifyUnknown(providerError.data));
    parts.push(stringifyUnknown(providerError.responseBody));
  }

  return parts.join(" ").toLowerCase();
}

function isCreditOrBillingError(statusCode: number | undefined, text: string) {
  const hasCreditSignal =
    text.includes("insufficient_quota") ||
    text.includes("quota") ||
    text.includes("billing") ||
    text.includes("credit") ||
    text.includes("credits") ||
    text.includes("hard_limit");

  return hasCreditSignal || statusCode === HttpStatus.PAYMENT_REQUIRED;
}

function stringifyUnknown(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
