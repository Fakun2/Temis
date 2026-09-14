"use client";

import { useQueryClient } from "@tanstack/react-query";
import type {
  ClientsControllerCreateBody,
  ClientsControllerListParams,
  ClientsControllerUpdateBody
} from "@bogaap/api-client";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import {
  archiveClient,
  clientKeys,
  createClient,
  deleteClient,
  getClientDetail,
  listClients,
  updateClient
} from "../_api/clients.api";

export function useClientsQuery(params: ClientsControllerListParams = {}) {
  return useDashboardQuery({
    permission: "clients:read",
    queryFn: () => listClients(params),
    queryKey: clientKeys.list(params)
  });
}

export function useClientDetailQuery(clientId: string, { enabled = true } = {}) {
  return useDashboardQuery({
    enabled: enabled && Boolean(clientId),
    permission: "clients:read",
    queryFn: () => getClientDetail(clientId),
    queryKey: clientKeys.detail(clientId)
  });
}

export function useCreateClientMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "clients:create",
    mutationFn: (input: ClientsControllerCreateBody) => createClient(input),
    onSuccess: () => invalidateClientQueries(queryClient)
  });
}

export function useUpdateClientMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "clients:update",
    mutationFn: (variables: { clientId: string; input: ClientsControllerUpdateBody }) =>
      updateClient(variables),
    onSuccess: () => invalidateClientQueries(queryClient)
  });
}

export function useArchiveClientMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "clients:update",
    mutationFn: (clientId: string) => archiveClient(clientId),
    onSuccess: () => invalidateClientQueries(queryClient)
  });
}

export function useDeleteClientMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    permission: "clients:delete",
    mutationFn: (clientId: string) => deleteClient(clientId),
    onSuccess: () => invalidateClientQueries(queryClient)
  });
}

function invalidateClientQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey.includes(clientKeys.all[0])
  });
}
