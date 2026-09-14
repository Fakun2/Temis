export type { AiAuthorizedContext, AiModel, AiTool } from "@temis/ai-contracts";

export type AiModelProvider = "ollama" | "openai" | "mock";

export type AiModelConfig = {
  provider: AiModelProvider;
  model: string;
};
