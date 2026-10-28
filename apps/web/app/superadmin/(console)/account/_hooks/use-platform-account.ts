"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult
} from "@tanstack/react-query";
import { usePasswordChangeForm } from "@/components/dashboard/account/use-password-change-form";
import { updateSuperAdminSessionUser } from "@/lib/auth/superadmin-session";
import { useSuperAdminSession } from "@/lib/auth/use-superadmin-session";
import { dashboardHttpClient } from "@/lib/http";
import type { AccountProfileFormValues } from "@/lib/validation/account";

export type PlatformAccount = {
  email: string;
  firstName: string;
  fullName: string;
  hasPassword: boolean;
  id: string;
  lastName: string;
  phone: string | null;
};

export type PlatformProfileDraft = Pick<
  AccountProfileFormValues,
  "firstName" | "lastName" | "phone"
>;

export type PlatformProfileMutation = UseMutationResult<
  PlatformAccount,
  Error,
  PlatformProfileDraft
>;

const accountKey = ["platform", "account"] as const;

export function usePlatformAccount() {
  const queryClient = useQueryClient();
  const session = useSuperAdminSession();
  const query = useQuery({
    queryKey: accountKey,
    queryFn: () => dashboardHttpClient.request<PlatformAccount>({ path: "/superadmin/account" })
  });
  const profileMutation = useMutation({
    mutationFn: (input: PlatformProfileDraft) =>
      dashboardHttpClient.request<PlatformAccount>({
        body: input,
        method: "PATCH",
        path: "/superadmin/account/profile"
      }),
    onSuccess: (updated) => {
      updateSuperAdminSessionUser({ fullName: updated.fullName, phone: updated.phone });
      queryClient.setQueryData(accountKey, updated);
    }
  });
  const passwordMutation = useMutation({
    mutationFn: async (input: { currentPassword?: string; newPassword: string }) => {
      if (session?.platformAccess.securityMode === "disabled") {
        if (!input.currentPassword) throw new Error("Ingresa tu contraseña actual.");
        await dashboardHttpClient.request({
          body: { password: input.currentPassword },
          method: "POST",
          path: "/superadmin/security/step-up/password"
        });
      } else {
        const challenge = await dashboardHttpClient.request<{
          options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
          transactionId: string;
        }>({ method: "POST", path: "/superadmin/security/step-up/start" });
        const response = await startAuthentication({ optionsJSON: challenge.options });
        await dashboardHttpClient.request({
          body: { response, transactionId: challenge.transactionId },
          method: "POST",
          path: "/superadmin/security/step-up/finish"
        });
      }

      return dashboardHttpClient.request<{ status: "ok" }>({
        body: input,
        method: "PATCH",
        path: "/superadmin/account/password"
      });
    }
  });
  const passwordForm = usePasswordChangeForm({
    hasPassword: query.data?.hasPassword ?? true,
    onSuccess: async () => {
      await fetch("/api/superadmin-auth/logout", { method: "POST" }).catch(() => null);
      window.location.assign("/superadmin/login");
    },
    updatePassword: passwordMutation.mutateAsync
  });

  return { passwordForm, profileMutation, query };
}
