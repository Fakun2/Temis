"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCompleteNotionOAuthMutation,
  useDisconnectNotionMutation,
  useNotionStatusQuery
} from "../../_hooks/use-notion-integration";
import { getNotionCallbackError } from "./notion.helpers";

export function useNotionIntegrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusQuery = useNotionStatusQuery();
  const completeOAuth = useCompleteNotionOAuthMutation();
  const disconnect = useDisconnectNotionMutation();
  const processedOAuthCallbackRef = useRef<string | null>(null);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const callbackError = searchParams.get("error");
  const callbackErrorDescription = searchParams.get("error_description");
  const connected = Boolean(statusQuery.data?.connection.connected);

  useEffect(() => {
    if (!code || !state || !completeOAuth.hasSession || !completeOAuth.tenantId || completeOAuth.isPending || completeOAuth.isSuccess) {
      return;
    }

    const callbackKey = `${code}:${state}`;
    if (processedOAuthCallbackRef.current === callbackKey) {
      return;
    }

    processedOAuthCallbackRef.current = callbackKey;
    completeOAuth.mutate({ code, state }, { onSuccess: () => router.replace("/admin/account?view=notion") });
  }, [code, completeOAuth, completeOAuth.hasSession, completeOAuth.isPending, completeOAuth.isSuccess, completeOAuth.tenantId, router, state]);

  return {
    completeOAuth,
    connected,
    disconnect,
    error:
      getNotionCallbackError(callbackError, callbackErrorDescription) ??
      completeOAuth.error?.message ??
      statusQuery.error?.message ??
      null,
    statusQuery
  };
}
