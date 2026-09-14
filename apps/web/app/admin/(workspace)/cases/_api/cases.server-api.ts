import { getServerAuthSession, toApiUrl } from "@/lib/api/server";
import { getActiveTenantAccess } from "@/lib/auth/permissions";
import type { TemisSession } from "@/lib/auth/session";
import type {
  CaseDetailDto,
  CaseExpensesListResponse,
  CaseTasksListResponse,
  CasesMetricsDto,
  CasesListResponse,
  CasesQueryParams
} from "../_types/cases.types";

export async function getCasesServerSession(): Promise<TemisSession | null> {
  const session = await getServerAuthSession();

  return session
    ? {
        tenantAccess: session.tenantAccess,
        user: session.user
      }
    : null;
}

export async function listCasesServer(params: CasesQueryParams): Promise<CasesListResponse> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  return requestCasesServer<CasesListResponse>(`/api/cases?${searchParams.toString()}`);
}

export async function getCaseMetricsServer(): Promise<CasesMetricsDto> {
  return requestCasesServer<CasesMetricsDto>("/api/cases/metrics");
}

export async function getCaseDetailServer(caseId: string): Promise<CaseDetailDto> {
  return requestCasesServer<CaseDetailDto>(`/api/cases/${caseId}`);
}

export async function listCaseTasksServer({
  caseId,
  cursor,
  limit = 8
}: {
  caseId: string;
  cursor?: string;
  limit?: number;
}): Promise<CaseTasksListResponse> {
  const searchParams = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return requestCasesServer<CaseTasksListResponse>(
    `/api/cases/${caseId}/tasks?${searchParams.toString()}`
  );
}

export async function listCaseExpensesServer({
  caseId,
  cursor,
  limit = 8,
  taskId
}: {
  caseId: string;
  cursor?: string;
  limit?: number;
  taskId?: string;
}): Promise<CaseExpensesListResponse> {
  const searchParams = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    searchParams.set("cursor", cursor);
  }
  if (taskId) {
    searchParams.set("taskId", taskId);
  }

  return requestCasesServer<CaseExpensesListResponse>(
    `/api/cases/${caseId}/expenses?${searchParams.toString()}`
  );
}

async function requestCasesServer<TResponse>(path: string): Promise<TResponse> {
  const session = await getServerAuthSession();
  if (!session) {
    throw new Error("No hay sesion activa.");
  }

  const tenantId = getActiveTenantAccess(session)?.tenantId;
  if (!tenantId) {
    throw new Error("No hay un workspace activo para consultar expedientes.");
  }

  const response = await fetch(toApiUrl(path), {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.tokens.accessToken}`,
      "x-tenant-id": tenantId
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    throw new Error(getServerErrorMessage(body?.message, response.status));
  }

  return response.json() as Promise<TResponse>;
}

function getServerErrorMessage(message: unknown, status: number) {
  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  return `No se pudieron cargar los expedientes (${status}).`;
}
