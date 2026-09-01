"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { updateSessionUser } from "@/lib/auth/session";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import type {
  AccountMembershipFormValues,
  AccountNotificationsFormValues,
  AccountPasswordFormValues,
  AccountProfileFormValues,
  SaePreviewFormValues,
  AccountStudioFormValues
} from "@/lib/validation/account";
import {
  accountKeys,
  commitSaeImport,
  previewSaeImport,
  uploadAccountAvatar,
  updateAccountMembership,
  updateAccountNotifications,
  updateAccountPassword,
  updateAccountProfile,
  updateAccountStudio,
  validateAccountPasswordChange
} from "../_api/account.api";

export function useAccountProfileMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    mutationFn: (input: AccountProfileFormValues) => updateAccountProfile(input),
    onSuccess: async (data) => {
      updateSessionUser({
        avatarUrl: data.profile.avatarUrl,
        fullName: data.profile.fullName,
        phone: data.profile.phone
      });
      setAccountQueriesData(queryClient, data);
      await invalidateAccount(queryClient);
    }
  });
}

export function useAccountAvatarMutation() {
  return useDashboardMutation({
    mutationFn: (file: File) => uploadAccountAvatar(file)
  });
}

export function useAccountStudioMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    mutationFn: (input: AccountStudioFormValues) => updateAccountStudio(input),
    onSuccess: async (data) => {
      setAccountQueriesData(queryClient, data);
      await invalidateAccount(queryClient);
    }
  });
}

export function useAccountNotificationsMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    mutationFn: (input: AccountNotificationsFormValues) => updateAccountNotifications(input),
    onSuccess: async (data) => {
      setAccountQueriesData(queryClient, data);
      await invalidateAccount(queryClient);
    }
  });
}

export function useAccountMembershipMutation() {
  const queryClient = useQueryClient();

  return useDashboardMutation({
    mutationFn: (input: AccountMembershipFormValues) => updateAccountMembership(input),
    onSuccess: async (data) => {
      setAccountQueriesData(queryClient, data);
      await invalidateAccount(queryClient);
    }
  });
}

export function useAccountPasswordMutation() {
  return useDashboardMutation({
    mutationFn: (input: AccountPasswordFormValues) => updateAccountPassword(input)
  });
}

export function useAccountPasswordValidationMutation() {
  return useDashboardMutation({
    mutationFn: (input: AccountPasswordFormValues) => validateAccountPasswordChange(input)
  });
}

export function useSaePreviewMutation() {
  return useDashboardMutation({
    mutationFn: (input: SaePreviewFormValues) => previewSaeImport(input)
  });
}

export function useSaeImportMutation() {
  return useDashboardMutation({
    mutationFn: (input: { importSessionId: string; selectedExternalIds: string[] }) =>
      commitSaeImport(input)
  });
}

function setAccountQueriesData(queryClient: QueryClient, data: unknown) {
  queryClient.setQueriesData(
    {
      predicate: (query) => query.queryKey.includes(accountKeys.all[0])
    },
    data
  );
}

function invalidateAccount(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey.includes(accountKeys.all[0])
  });
}
