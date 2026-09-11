import { dashboardHttpClient } from "@/lib/http";
import type { TemisSession } from "@/lib/auth/session";

export type AiModel = "temis-legal" | "reasoning" | "fast";
export type AiTool = "general" | "case_summary" | "case_documents" | "case_deadlines";

export type AiModelOption = {
  id: AiModel;
  name: string;
  provider: string;
};

export type AiToolOption = {
  id: AiTool;
  name: string;
  description: string;
  requiredPermissions: string[];
  requiresCase: boolean;
};

export type AiToolsResponse = {
  models: AiModelOption[];
  tools: AiToolOption[];
};

export type AiChatResponse = {
  id: string;
  model: AiModel;
  tool: AiTool;
  status: "accepted";
  message: {
    role: "assistant";
    content: string;
  };
};

export const aiKeys = {
  all: ["ai"] as const,
  tools: () => [...aiKeys.all, "tools"] as const
};

export async function listAiTools(_context: { session: TemisSession; tenantId: string }) {
  void _context;

  return dashboardHttpClient.request<AiToolsResponse>({
    path: "/ai/tools"
  });
}

export async function startAiChat({
  input
}: {
  input: {
    caseId?: string;
    model: AiModel;
    prompt: string;
    tool: AiTool;
  };
  session: TemisSession;
  tenantId: string;
}) {
  return dashboardHttpClient.request<AiChatResponse>({
    body: input,
    method: "POST",
    path: "/ai/chat"
  });
}
