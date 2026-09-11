"use client";

import { useMemo, useState } from "react";
import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue
} from "@/components/ai-elements/prompt-input";
import { getApiErrorMessage } from "@/lib/http";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import {
  aiKeys,
  listAiTools,
  startAiChat,
  type AiModel,
  type AiTool,
  type AiToolOption
} from "@/app/admin/ai/_api/ai.api";
import type { CaseDetailDto } from "../../../_types/cases.types";
import { CaseAiComposer } from "./case-ai-composer";
import { CaseAiMessageList } from "./case-ai-message-list";
import { CaseAiState } from "./case-ai-state";
import type { CaseAiMessage, CaseAiSource, CaseAiStatus } from "./case-ai-types";

const defaultModel: AiModel = "temis-legal";
const defaultTool: AiTool = "case_summary";
const fallbackTool: AiToolOption = {
  description: "Prepara respuestas usando solo datos de lectura del expediente indicado.",
  id: defaultTool,
  name: "Resumen de expediente",
  requiredPermissions: ["cases:read"],
  requiresCase: true
};

export function CaseAiChat({ canUseAi, caseItem }: { canUseAi: boolean; caseItem: CaseDetailDto }) {
  const initialMessages = useMemo(() => getInitialMessages(caseItem), [caseItem]);
  const [messages, setMessages] = useState<CaseAiMessage[]>(initialMessages);
  const [tool, setTool] = useState<AiTool>(defaultTool);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [status, setStatus] = useState<CaseAiStatus>(
    canUseAi ? (caseItem.id ? "idle" : "no-context") : "no-permission"
  );
  const toolsQuery = useDashboardQuery({
    enabled: canUseAi,
    permission: "ai:case_chat",
    queryFn: listAiTools,
    queryKey: aiKeys.tools()
  });
  const chatMutation = useDashboardMutation({
    permission: "ai:case_chat",
    mutationFn: (
      variables: { input: { caseId: string; model: AiModel; prompt: string; tool: AiTool } },
      context
    ) => startAiChat({ ...variables, ...context })
  });
  const contextualTools = useMemo(() => {
    const tools = toolsQuery.data?.tools.filter((option) => option.requiresCase) ?? [];
    return tools.length ? tools : [fallbackTool];
  }, [toolsQuery.data?.tools]);
  const selectedTool = contextualTools.find((option) => option.id === tool) ?? contextualTools[0];

  const isBlocked =
    status === "loading" ||
    status === "no-permission" ||
    status === "no-context" ||
    toolsQuery.isLoading ||
    !selectedTool;

  async function handleSubmit(content: string) {
    if (!selectedTool) {
      return;
    }

    const userMessage: CaseAiMessage = {
      id: `user-${Date.now()}`,
      content,
      createdAtLabel: "Ahora",
      role: "user"
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setLastPrompt(content);
    setStatus("loading");

    try {
      const response = await chatMutation.mutateAsync({
        input: {
          caseId: caseItem.id,
          model: defaultModel,
          prompt: content,
          tool: selectedTool.id
        }
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: response.id,
          content: response.message.content,
          createdAtLabel: "Ahora",
          role: response.message.role,
          sources: buildSources(caseItem)
        }
      ]);
      setStatus("idle");
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${Date.now()}`,
          confidence: "low",
          content: getApiErrorMessage(error),
          createdAtLabel: "Error",
          role: "assistant",
          sources: buildSources(caseItem)
        }
      ]);
      setStatus("error");
    }
  }

  function handleRegenerate() {
    if (lastPrompt) {
      void handleSubmit(lastPrompt);
    }
  }

  function handleCopy(content: string) {
    void navigator.clipboard?.writeText(content);
  }

  return (
    <div className="grid gap-4">
      <CaseAiMessageList messages={messages} onCopy={handleCopy} onRegenerate={handleRegenerate} />
      {status === "loading" ? <CaseAiState status="loading" /> : null}
      {status === "error" ? <CaseAiState onRetry={() => setStatus("idle")} status="error" /> : null}
      {status === "no-permission" ? <CaseAiState status="no-permission" /> : null}
      {status === "no-context" ? <CaseAiState status="no-context" /> : null}
      {toolsQuery.isError ? (
        <CaseAiState onRetry={() => void toolsQuery.refetch()} status="error" />
      ) : null}
      <CaseAiComposer
        disabled={isBlocked}
        footer={
          <PromptInputSelect onValueChange={(value) => setTool(value as AiTool)} value={selectedTool?.id}>
            <PromptInputSelectTrigger className="h-8 text-xs">
              <PromptInputSelectValue />
            </PromptInputSelectTrigger>
            <PromptInputSelectContent>
              {contextualTools.map((option) => (
                <PromptInputSelectItem key={option.id} value={option.id}>
                  {option.name}
                </PromptInputSelectItem>
              ))}
            </PromptInputSelectContent>
          </PromptInputSelect>
        }
        onSubmit={(message) => void handleSubmit(message)}
        status={status}
      />
    </div>
  );
}

function getInitialMessages(caseItem: CaseDetailDto): CaseAiMessage[] {
  return [
    {
      id: "assistant-welcome",
      content:
        `Puedo ayudarte a revisar el expediente ${caseItem.caseNumber}, resumir el estado actual y preparar un borrador de proximos pasos.\n\n` +
        "Las respuestas se generan usando el gateway de IA y solo el contexto autorizado para este tenant.",
      createdAtLabel: "IA",
      role: "assistant",
      sources: buildSources(caseItem)
    }
  ];
}

function buildSources(caseItem: CaseDetailDto): CaseAiSource[] {
  const provinceName = caseItem.province?.name ?? caseItem.provinceText ?? "Sin provincia";
  const forumName = caseItem.forum?.name ?? caseItem.jurisdictionText ?? "Sin fuero";

  return [
    {
      id: "case-summary",
      detail: `${caseItem.caption} - ${provinceName} / ${forumName}`,
      label: `Expediente ${caseItem.caseNumber}`,
      type: "case"
    },
    {
      id: "case-tasks",
      detail: `${caseItem.metrics.pendingTasks} tareas pendientes sobre ${caseItem.metrics.totalTasks} tareas totales.`,
      label: "Tareas del expediente",
      type: "task"
    },
    {
      id: "case-expenses",
      detail: `${caseItem.metrics.pendingPayments} en pagos pendientes registrados.`,
      label: "Gastos y vencimientos",
      type: "expense"
    }
  ];
}
