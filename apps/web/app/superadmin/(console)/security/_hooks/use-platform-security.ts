"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSuperAdminSession } from "@/lib/auth/use-superadmin-session";
import { dashboardHttpClient } from "@/lib/http";

export type SecurityOverview = {
  authenticators: Array<{
    aaguid: string;
    createdAt: string;
    id: string;
    lastUsedAt: string | null;
    name: string;
  }>;
  devices: Array<{
    id: string;
    lastCompliantAt: string | null;
    lastSeenAt: string | null;
    name: string;
    platform: string;
  }>;
  sessions: Array<{
    authenticatedAt: string;
    current: boolean;
    deviceName: string;
    id: string;
    lastActivityAt: string;
  }>;
};

const securityKey = ["platform", "security"] as const;

export function usePlatformSecurity() {
  const queryClient = useQueryClient();
  const session = useSuperAdminSession();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => Promise<unknown>) | null>(null);
  const [confirming, setConfirming] = useState(false);
  const query = useQuery({
    queryKey: securityKey,
    queryFn: () => dashboardHttpClient.request<SecurityOverview>({ path: "/superadmin/security" })
  });

  async function revoke(kind: "authenticators" | "devices" | "sessions", id: string) {
    await withStepUp(() =>
      dashboardHttpClient.request({
        method: "DELETE",
        path: `/superadmin/security/${kind}/${id}`
      })
    );
  }

  async function withStepUp(action: () => Promise<unknown>) {
    if (session?.platformAccess.securityMode === "disabled") {
      setPassword("");
      setPasswordError(null);
      setPendingAction(() => action);
      return;
    }
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
    await action();
    await queryClient.invalidateQueries({ queryKey: securityKey });
  }

  async function confirmPasswordStepUp() {
    if (!pendingAction || !password || confirming) return;
    setConfirming(true);
    setPasswordError(null);
    try {
      await dashboardHttpClient.request({
        body: { password },
        method: "POST",
        path: "/superadmin/security/step-up/password"
      });
      await pendingAction();
      closeConfirmation();
      await queryClient.invalidateQueries({ queryKey: securityKey });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "No se pudo confirmar la accion.");
    } finally {
      setConfirming(false);
    }
  }

  function closeConfirmation() {
    if (confirming) return;
    setPendingAction(null);
    setPassword("");
    setPasswordError(null);
  }

  return {
    closeConfirmation,
    confirmPasswordStepUp,
    confirming,
    confirmationOpen: Boolean(pendingAction),
    password,
    passwordError,
    query,
    revoke,
    setPassword
  };
}
