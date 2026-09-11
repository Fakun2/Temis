import type { AiToolDefinition } from "@temis/ai-contracts";

export type AiSafetyPolicy = {
  allowSensitiveCaseData: boolean;
  requireHumanReview: boolean;
  maxContextCharacters: number;
};

export const defaultAiSafetyPolicy: AiSafetyPolicy = {
  allowSensitiveCaseData: false,
  requireHumanReview: true,
  maxContextCharacters: 24_000
};

export function isReadOnlyTool(tool: Pick<AiToolDefinition, "requiredPermissions">) {
  return tool.requiredPermissions.every((permission) => permission.endsWith(":read"));
}

export function getMissingToolPermissions(
  userPermissions: ReadonlySet<string>,
  tool: Pick<AiToolDefinition, "requiredPermissions">
) {
  return tool.requiredPermissions.filter((permission) => !userPermissions.has(permission));
}

export function canUseAiTool(
  userPermissions: ReadonlySet<string>,
  tool: Pick<AiToolDefinition, "requiredPermissions">
) {
  return isReadOnlyTool(tool) && getMissingToolPermissions(userPermissions, tool).length === 0;
}
