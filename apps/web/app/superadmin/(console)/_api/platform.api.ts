export type PlatformObservabilitySummary = {
  checks: Array<{
    latencyMs: number | null;
    name: string;
    status: "healthy" | "degraded" | "unavailable";
  }>;
  generatedAt: string;
  outbox: { failed: number | null; oldestPendingAt: string | null; pending: number | null };
  requests: {
    averageLatencyMs: number | null;
    clientErrorRate: number | null;
    errorRate: number | null;
    p95LatencyMs: number | null;
    servedRate: number | null;
    total: number;
    windowMinutes: number;
  } | null;
  status: "healthy" | "degraded" | "unavailable";
};

export type PlatformObservabilityHistoryStatus = PlatformObservabilityHistoryDayDtoStatus;
export type PlatformObservabilityHistory = PlatformObservabilityHistoryDto;
export type PlatformDashboardSummary = PlatformDashboardSummaryDto;
export type PlatformUser = PlatformUserDto;

export type PlatformUsersQuery = {
  cursor?: string;
  limit?: number;
  search?: string;
  sortBy?: "name" | "status" | "lastLoginAt" | "createdAt";
  sortDirection?: "asc" | "desc";
  status?: "active" | "inactive";
};

export type PlatformUsersList = PlatformUsersListDto;

export async function getPlatformObservability() {
  const response = await fetch("/api/superadmin/observability/summary", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo consultar la observabilidad de plataforma.");
  return (await response.json()) as PlatformObservabilitySummary;
}

export async function getPlatformObservabilityHistory() {
  const response = await fetch("/api/superadmin/observability/history", { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudo consultar el historial de observabilidad.");
  return (await response.json()) as PlatformObservabilityHistory;
}
export function getPlatformDashboardSummary() {
  return dashboardHttpClient.request<PlatformDashboardSummary>({
    path: "/superadmin/dashboard/summary"
  });
}

export function listPlatformUsers(params: PlatformUsersQuery) {
  return dashboardHttpClient.request<PlatformUsersList>({ params, path: "/superadmin/users" });
}
import type {
  PlatformDashboardSummaryDto,
  PlatformObservabilityHistoryDto,
  PlatformObservabilityHistoryDayDtoStatus,
  PlatformUserDto,
  PlatformUsersListDto
} from "@temis/api-client";
import { dashboardHttpClient } from "@/lib/http";
