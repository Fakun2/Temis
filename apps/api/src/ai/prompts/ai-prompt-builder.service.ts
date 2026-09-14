import { Injectable } from "@nestjs/common";
import { buildTemisSystemPrompt } from "@temis/ai-core";
import type { AiChatInput } from "../ai.schemas";
import type { AiToolDefinition } from "../ai.catalog";
import type { AiContext } from "../types/ai-context.types";

@Injectable()
export class AiPromptBuilderService {
  buildSystemPrompt(tool: AiToolDefinition, context: AiContext, input: AiChatInput) {
    return buildTemisSystemPrompt({
      context,
      model: input.model,
      tool
    });
  }
}
