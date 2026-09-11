import type { AiModel, AiTool } from "@temis/ai-contracts";
import { aiModelIds, aiToolIds } from "@temis/ai-contracts";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

// Accept the previous logical ID from clients open during a rolling deployment.
export const aiModelSchema = z.union([z.enum(aiModelIds), z.literal("justinia-legal")])
  .transform((model) => model === "justinia-legal" ? "temis-legal" as const : model);
export const aiToolSchema = z.enum(aiToolIds);

export const aiChatSchema = z.object({
  caseId: z.string().uuid().optional(),
  model: aiModelSchema.default("temis-legal"),
  prompt: z.string().trim().min(1).max(4000),
  tool: aiToolSchema.default("general")
});

export class AiChatDto extends createZodDto(aiChatSchema) { }

export type AiChatInput = z.infer<typeof aiChatSchema>;
export type { AiModel, AiTool };

export class AiToolDto {
  id!: AiTool;
  name!: string;
  description!: string;
  requiredPermissions!: string[];
}

export class AiModelDto {
  id!: AiModel;
  name!: string;
  provider!: string;
}

export class AiToolsResponseDto {
  models!: AiModelDto[];
  tools!: AiToolDto[];
}

export class AiChatMessageDto {
  role!: "assistant";
  content!: string;
}

export class AiChatGuardrailsDto {
  mode!: "read_only";
  requiredPermissions!: string[];
}

export class AiChatResponseDto {
  id!: string;
  model!: AiModel;
  tool!: AiTool;
  status!: "accepted";
  guardrails!: AiChatGuardrailsDto;
  message!: AiChatMessageDto;
}
