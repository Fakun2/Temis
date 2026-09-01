import { dashboardHttpClient } from "@/lib/http";
import type {
  AccountMembershipFormValues,
  AccountNotificationsFormValues,
  AccountPasswordFormValues,
  AccountProfileFormValues,
  SaePreviewFormValues,
  AccountStudioFormValues
} from "@/lib/validation/account";
import type { AccountAiUsageResponse } from "../_types/ai-usage.types";
import type {
  AccountResponse,
  SaeImportResponse,
  SaePreviewResponse
} from "../_types/account.types";

export const accountKeys = {
  all: ["account"] as const,
  aiUsage: () => [...accountKeys.all, "ai-usage"] as const,
  detail: () => [...accountKeys.all, "detail"] as const
};

export function getAccount(): Promise<AccountResponse> {
  return dashboardHttpClient.request<AccountResponse>({
    path: "/account"
  });
}

export function getAccountAiUsage(): Promise<AccountAiUsageResponse> {
  return dashboardHttpClient.request<AccountAiUsageResponse>({
    path: "/account/ai-usage"
  });
}

export async function uploadAccountAvatar(file: File): Promise<{ avatarUrl: string }> {
  const body = new FormData();
  body.set("file", file);

  const response = await fetch("/api/account/avatar", {
    body,
    credentials: "same-origin",
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await getUploadErrorMessage(response));
  }

  return response.json() as Promise<{ avatarUrl: string }>;
}

export function updateAccountProfile(input: AccountProfileFormValues): Promise<AccountResponse> {
  return dashboardHttpClient.request<AccountResponse>({
    body: normalizeEmptyStrings(input),
    method: "PATCH",
    path: "/account/profile"
  });
}

export function updateAccountStudio(input: AccountStudioFormValues): Promise<AccountResponse> {
  return dashboardHttpClient.request<AccountResponse>({
    body: normalizeEmptyStrings(input),
    method: "PATCH",
    path: "/account/studio"
  });
}

export function updateAccountNotifications(
  input: AccountNotificationsFormValues
): Promise<AccountResponse> {
  return dashboardHttpClient.request<AccountResponse>({
    body: input,
    method: "PATCH",
    path: "/account/notifications"
  });
}

export function updateAccountMembership(
  input: AccountMembershipFormValues
): Promise<AccountResponse> {
  return dashboardHttpClient.request<AccountResponse>({
    body: input,
    method: "PATCH",
    path: "/account/membership"
  });
}

export function updateAccountPassword(input: AccountPasswordFormValues): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    body: input,
    method: "PATCH",
    path: "/account/password"
  });
}

export function validateAccountPasswordChange(
  input: AccountPasswordFormValues
): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    body: input,
    method: "PATCH",
    path: "/account/password/validate"
  });
}

export function previewSaeImport(input: SaePreviewFormValues): Promise<SaePreviewResponse> {
  return dashboardHttpClient.request<SaePreviewResponse>({
    body: input,
    method: "POST",
    path: "/integrations/sae/preview"
  });
}

export function commitSaeImport(input: {
  importSessionId: string;
  selectedExternalIds: string[];
}): Promise<SaeImportResponse> {
  return dashboardHttpClient.request<SaeImportResponse>({
    body: input,
    method: "POST",
    path: "/integrations/sae/import"
  });
}

function normalizeEmptyStrings<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value === "" ? undefined : value])
  );
}

async function getUploadErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  if (typeof body?.message === "string") {
    return body.message;
  }
  if (Array.isArray(body?.message)) {
    return body.message.join(" ");
  }
  return `No se pudo subir el avatar (${response.status}).`;
}
