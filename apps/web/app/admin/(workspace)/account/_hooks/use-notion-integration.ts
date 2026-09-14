"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import {
  completeNotionOAuth,
  createNotionMapping,
  disconnectNotion,
  getNotionStatus,
  listNotionConflicts,
  listNotionDataSources,
  notionIntegrationKeys,
  resolveNotionConflict,
  startNotionOAuth,
  syncNotionMapping,
  updateNotionMapping
} from "../_api/notion-integration.api";

export function useNotionStatusQuery() {
  return useDashboardQuery({
    permission: "integrations:notion_manage",
    queryKey: notionIntegrationKeys.status(),
    queryFn: () => getNotionStatus()
  });
}

export function useNotionDataSourcesQuery(search: string, enabled: boolean) {
  return useDashboardQuery({
    enabled,
    permission: "integrations:notion_manage",
    queryKey: notionIntegrationKeys.dataSources(search),
    queryFn: () => listNotionDataSources(search)
  });
}

export function useNotionConflictsQuery(enabled: boolean) {
  return useDashboardQuery({
    enabled,
    permission: "integrations:notion_manage",
    queryKey: notionIntegrationKeys.conflicts(),
    queryFn: () => listNotionConflicts()
  });
}

export function useStartNotionOAuthMutation() {
  return useDashboardMutation({
    permission: "integrations:notion_manage",
    mutationFn: () => startNotionOAuth()
  });
}

export function useCompleteNotionOAuthMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "integrations:notion_manage",
    mutationFn: (input: { code: string; state: string }) => completeNotionOAuth(input),
    onSuccess: () => invalidateNotion(queryClient)
  });
}

export function useDisconnectNotionMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "integrations:notion_manage",
    mutationFn: () => disconnectNotion(),
    onSuccess: () => invalidateNotion(queryClient)
  });
}

export function useCreateNotionMappingMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "integrations:notion_manage",
    mutationFn: createNotionMapping,
    onSuccess: () => invalidateNotion(queryClient)
  });
}

export function useUpdateNotionMappingMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "integrations:notion_manage",
    mutationFn: updateNotionMapping,
    onSuccess: () => invalidateNotion(queryClient)
  });
}

export function useSyncNotionMappingMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "integrations:notion_manage",
    mutationFn: (mappingId: string) => syncNotionMapping(mappingId),
    onSuccess: () => invalidateNotion(queryClient)
  });
}

export function useResolveNotionConflictMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "integrations:notion_manage",
    mutationFn: resolveNotionConflict,
    onSuccess: () => invalidateNotion(queryClient)
  });
}

function invalidateNotion(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey.includes(notionIntegrationKeys.all[0])
  });
}
