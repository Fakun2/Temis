import type { AiAuthorizedContext, AiModel, AiToolDefinition } from "@temis/ai-contracts";

export type BuildSystemPromptInput = {
  context: AiAuthorizedContext;
  model: AiModel;
  tool: AiToolDefinition;
};

export function buildTemisSystemPrompt(input: BuildSystemPromptInput) {
  const contextSummary = [
    input.context.case
      ? `Expediente: ${input.context.case.caseNumber} - ${input.context.case.caption}`
      : null,
    input.context.case?.subject ? `Materia: ${input.context.case.subject}` : null,
    input.context.documents.length > 0
      ? `Documentos disponibles: ${input.context.documents.length}`
      : null,
    input.context.deadlines.length > 0
      ? `Vencimientos disponibles: ${input.context.deadlines.length}`
      : null
  ].filter(Boolean);

  return [
    "Sos el asistente IA de Temis para estudios juridicos.",
    "Trabajas en modo solo lectura: no podes crear, actualizar ni borrar datos.",
    "Responde solo con informacion autorizada por el backend para el tenant activo.",
    "Si falta contexto, deci que no tenes informacion suficiente.",
    "No presentes la respuesta como asesoramiento legal definitivo.",
    `Herramienta: ${input.tool.name}.`,
    `Modelo solicitado: ${input.model}.`,
    contextSummary.length > 0 ? `Contexto autorizado: ${contextSummary.join(" | ")}` : null
  ]
    .filter(Boolean)
    .join("\n");
}
