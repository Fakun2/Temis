import { dashboardHttpClient } from "@/lib/http";

export type NotionPropertyMapping = {
  assignee?: string;
  case?: string;
  dueDate: string;
  notes?: string;
  status: string;
  title: string;
};

export type NotionStatusMapping = Record<
  string,
  "pending" | "in_progress" | "completed" | "cancelled"
>;

export type NotionIntegrationStatus = {
  connection: {
    connected: boolean;
    lastSyncAt: string | null;
    workspaceId: string | null;
    workspaceName: string | null;
  };
  mappings: NotionMapping[];
  openConflicts: number;
};

export type NotionMapping = {
  dataSourceId: string;
  dataSourceName: string;
  enabled: boolean;
  id: string;
  lastPullAt: string | null;
  lastPushAt: string | null;
  propertyMapping: NotionPropertyMapping;
  statusMapping: NotionStatusMapping;
  syncIntervalMinutes: number;
};

export type NotionDataSourcesResponse = {
  items: Array<{ id: string; title: string }>;
  nextCursor: string | null;
};

export type NotionConflict = {
  dataSourceName: string;
  detectedAt: string;
  fieldDiff: unknown;
  id: string;
  notionPageId: string | null;
  taskId: string | null;
};

export type NotionConflictsResponse = {
  items: NotionConflict[];
};

export type NotionSyncResult = {
  conflicts: number;
  imported: number;
  pushed: number;
  status: "completed" | "failed";
  updated: number;
};

export const notionIntegrationKeys = {
  all: ["account", "notion"] as const,
  dataSources: (search: string) => [...notionIntegrationKeys.all, "data-sources", search] as const,
  status: () => [...notionIntegrationKeys.all, "status"] as const,
  conflicts: () => [...notionIntegrationKeys.all, "conflicts"] as const
};

export function getNotionStatus() {
  return dashboardHttpClient.request<NotionIntegrationStatus>({
    path: "/account/integrations/notion"
  });
}

export function startNotionOAuth() {
  return dashboardHttpClient.request<{ authorizationUrl: string }>({
    path: "/account/integrations/notion/oauth/start"
  });
}

export function completeNotionOAuth(params: { code: string; state: string }) {
  return dashboardHttpClient.request<NotionIntegrationStatus>({
    params,
    path: "/account/integrations/notion/oauth/callback"
  });
}

export function disconnectNotion() {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "DELETE",
    path: "/account/integrations/notion"
  });
}

export function listNotionDataSources(search: string) {
  return dashboardHttpClient.request<NotionDataSourcesResponse>({
    params: { limit: 20, search },
    path: "/account/integrations/notion/data-sources"
  });
}

export function createNotionMapping(input: {
  dataSourceId: string;
  dataSourceName: string;
  enabled: boolean;
  propertyMapping: NotionPropertyMapping;
  statusMapping: NotionStatusMapping;
  syncIntervalMinutes: number;
}) {
  return dashboardHttpClient.request<NotionMapping>({
    body: input,
    method: "POST",
    path: "/account/integrations/notion/mappings"
  });
}

export function updateNotionMapping({
  input,
  mappingId
}: {
  input: Partial<Pick<NotionMapping, "dataSourceName" | "enabled" | "propertyMapping" | "statusMapping" | "syncIntervalMinutes">>;
  mappingId: string;
}) {
  return dashboardHttpClient.request<NotionMapping>({
    body: input,
    method: "PATCH",
    path: `/account/integrations/notion/mappings/${mappingId}`
  });
}

export function syncNotionMapping(mappingId: string) {
  return dashboardHttpClient.request<NotionSyncResult>({
    method: "POST",
    path: `/account/integrations/notion/mappings/${mappingId}/sync`
  });
}

export function listNotionConflicts() {
  return dashboardHttpClient.request<NotionConflictsResponse>({
    path: "/account/integrations/notion/conflicts"
  });
}

export function resolveNotionConflict({
  conflictId,
  resolution
}: {
  conflictId: string;
  resolution: "bogapp" | "notion";
}) {
  return dashboardHttpClient.request<{ status: "ok" }>({
    body: { resolution },
    method: "POST",
    path: `/account/integrations/notion/conflicts/${conflictId}/resolve`
  });
}
