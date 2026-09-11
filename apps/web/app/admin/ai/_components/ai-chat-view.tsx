"use client";

import { useMemo, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools
} from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/http";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import { CaseAiState } from "@/app/admin/(workspace)/cases/[id]/_components/ai/case-ai-state";
import type {
  CaseAiMessage,
  CaseAiStatus
} from "@/app/admin/(workspace)/cases/[id]/_components/ai/case-ai-types";
import {
  aiKeys,
  listAiTools,
  startAiChat,
  type AiModel,
  type AiModelOption,
  type AiTool,
  type AiToolOption
} from "../_api/ai.api";

const defaultModel: AiModel = "temis-legal";
const defaultTool: AiTool = "general";

const fallbackModel: AiModelOption = {
  id: defaultModel,
  name: "Temis Legal",
  provider: "openai"
};
const fallbackTool: AiToolOption = {
  description: "Responde sin consultar datos operativos del tenant.",
  id: defaultTool,
  name: "Chat general",
  requiredPermissions: [],
  requiresCase: false
};

const initialMessages: CaseAiMessage[] = [
  {
    id: "assistant-global-welcome",
    content:
      "Soy el asistente IA de Temis. Puedo ayudarte a orientar consultas generales.\n\nPara preguntas con datos de un expediente, abri el expediente correspondiente y usa el panel contextual.",
    createdAtLabel: "Preview",
    role: "assistant"
  }
];

export function AiChatView() {
  const [messages, setMessages] = useState<CaseAiMessage[]>(initialMessages);
  const [model, setModel] = useState<AiModel>(defaultModel);
  const [status, setStatus] = useState<CaseAiStatus>("idle");
  const [tool, setTool] = useState<AiTool>(defaultTool);
  const [lastError, setLastError] = useState<string | null>(null);
  const toolsQuery = useDashboardQuery({
    permission: "ai:case_chat",
    queryFn: listAiTools,
    queryKey: aiKeys.tools()
  });
  const chatMutation = useDashboardMutation({
    permission: "ai:case_chat",
    mutationFn: (variables: { input: { model: AiModel; prompt: string; tool: AiTool } }, context) =>
      startAiChat({ ...variables, ...context })
  });
  const chatStatus = status === "loading" ? "submitted" : undefined;
  const modelOptions = toolsQuery.data?.models.length ? toolsQuery.data.models : [fallbackModel];
  const toolOptions = useMemo(() => {
    const globalTools = toolsQuery.data?.tools.filter((option) => !option.requiresCase) ?? [];
    return globalTools.length ? globalTools : [fallbackTool];
  }, [toolsQuery.data?.tools]);
  const selectedModel = modelOptions.find((option) => option.id === model) ?? fallbackModel;
  const selectedTool = toolOptions.find((option) => option.id === tool) ?? fallbackTool;
  const disabled = status === "loading" || toolsQuery.isLoading || !toolsQuery.hasPermission;

  async function handleSubmit(content: string) {
    setLastError(null);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${Date.now()}`,
        content,
        createdAtLabel: "Ahora",
        role: "user"
      }
    ]);
    setStatus("loading");

    try {
      const response = await chatMutation.mutateAsync({
        input: {
          model: selectedModel.id,
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
          role: response.message.role
        }
      ]);
      setStatus("idle");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setLastError(message);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${Date.now()}`,
          confidence: "low",
          content: message,
          createdAtLabel: "Error",
          role: "assistant"
        }
      ]);
      setStatus("error");
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-8 sm:px-24 lg:px-48">
      <Conversation className="h-full w-full flex-1 overflow-y-auto  [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ConversationContent className="w-full gap-4 px-2 md:px-3">
          {messages.map((message) => (
            <Message className="max-w-full" from={message.role} key={message.id}>
              <MessageContent>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold">
                    {message.role === "assistant" ? "Asistente" : "Vos"}
                  </span>
                  <span className="text-muted-foreground">{message.createdAtLabel}</span>
                </div>
                <MessageResponse>{message.content}</MessageResponse>
                {message.confidence === "low" ? (
                  <Badge
                    className="mt-3 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    variant="outline"
                  >
                    Baja confianza
                  </Badge>
                ) : null}
              </MessageContent>
            </Message>
          ))}
          {status === "loading" ? <CaseAiState status="loading" /> : null}
          {toolsQuery.isError ? (
            <CaseAiState onRetry={() => void toolsQuery.refetch()} status="error" />
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="self-center z-10 w-full max-w-2xl shrink-0 px-2 md:p-2 flex justify-center items-center">
        <PromptInput
          className="w-full"
          onSubmit={({ text }) => {
            const trimmedText = text.trim();
            if (!trimmedText || disabled) {
              return;
            }

            void handleSubmit(trimmedText);
          }}
        >
          <PromptInputTextarea
            aria-label="Mensaje para el asistente IA"
            disabled={disabled}
            placeholder={lastError ?? "Escribi tu prompt"}
          />
          <PromptInputFooter>
            <PromptInputTools className="flex-wrap">
              <ModelSelector>
                <ModelSelectorTrigger asChild>
                  <Button className="h-8 gap-2 px-2.5 text-xs" type="button" variant="ghost">
                    <ModelSelectorLogo provider={selectedModel.provider} />
                    {selectedModel.name}
                  </Button>
                </ModelSelectorTrigger>
                <ModelSelectorContent title="Seleccionar modelo">
                  <ModelSelectorInput placeholder="Buscar modelo..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No hay modelos.</ModelSelectorEmpty>
                    <ModelSelectorGroup heading="Modelos">
                      {modelOptions.map((option) => (
                        <ModelSelectorItem
                          key={option.id}
                          onSelect={() => setModel(option.id)}
                          value={option.name}
                        >
                          <ModelSelectorLogo provider={option.provider} />
                          <ModelSelectorName>{option.name}</ModelSelectorName>
                        </ModelSelectorItem>
                      ))}
                    </ModelSelectorGroup>
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>

              <PromptInputSelect onValueChange={(value) => setTool(value as AiTool)} value={tool}>
                <PromptInputSelectTrigger className="h-8 text-xs">
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {toolOptions.map((option) => (
                    <PromptInputSelectItem key={option.id} value={option.id}>
                      {option.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={disabled} status={chatStatus} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
