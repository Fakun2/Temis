import {
  getClientsControllerArchiveUrl,
  getClientsControllerCreateUrl,
  getClientsControllerDeleteUrl,
  getClientsControllerGetDetailUrl,
  getClientsControllerListUrl,
  getClientsControllerUpdateUrl,
  type ClientArchiveResponseDto,
  type ClientDeleteResponseDto,
  type ClientDetailDto,
  type ClientsControllerCreateBody,
  type ClientsControllerListParams,
  type ClientsControllerUpdateBody,
  type ClientsListResponseDto
} from "@bogaap/api-client";
import { dashboardHttpClient } from "@/lib/http";

export const clientKeys = {
  all: ["clients"] as const,
  detail: (clientId: string) => [...clientKeys.all, "detail", clientId] as const,
  list: (params: ClientsControllerListParams) => [...clientKeys.all, "list", params] as const
};

export function listClients(
  params: ClientsControllerListParams = {}
): Promise<ClientsListResponseDto> {
  return dashboardHttpClient.request<ClientsListResponseDto>({
    path: getClientsControllerListUrl(params)
  });
}

export function createClient(input: ClientsControllerCreateBody): Promise<ClientDetailDto> {
  return dashboardHttpClient.request<ClientDetailDto>({
    body: input,
    method: "POST",
    path: getClientsControllerCreateUrl()
  });
}

export function getClientDetail(clientId: string): Promise<ClientDetailDto> {
  return dashboardHttpClient.request<ClientDetailDto>({
    path: getClientsControllerGetDetailUrl(clientId)
  });
}

export function updateClient({
  clientId,
  input
}: {
  clientId: string;
  input: ClientsControllerUpdateBody;
}): Promise<ClientDetailDto> {
  return dashboardHttpClient.request<ClientDetailDto>({
    body: input,
    method: "PATCH",
    path: getClientsControllerUpdateUrl(clientId)
  });
}

export function archiveClient(clientId: string): Promise<ClientArchiveResponseDto> {
  return dashboardHttpClient.request<ClientArchiveResponseDto>({
    method: "POST",
    path: getClientsControllerArchiveUrl(clientId)
  });
}

export function deleteClient(
  clientId: string
): Promise<ClientDeleteResponseDto> {
  return dashboardHttpClient.request<ClientDeleteResponseDto>({
    method: "DELETE",
    path: getClientsControllerDeleteUrl(clientId)
  });
}
