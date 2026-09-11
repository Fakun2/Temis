"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { loginWithGoogleCredential } from "@/lib/auth/google-auth";
import { getAuthenticatedRedirectPath } from "@/lib/auth/redirect";
import { saveSession, type TemisSession } from "@/lib/auth/session";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/auth";
import {
  loginInitialForm,
  loginLoadingExitMs,
  loginLoadingSuccessMs,
  loginLoadingTotalMs
} from "../_constants/login.constants";
import { useLoginTransition } from "./use-login-transition";

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useLoginForm(initialEmail: string | null) {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<LoginFormValues>(() => ({
    ...loginInitialForm,
    email: initialEmail ?? ""
  }));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const transition = useLoginTransition();

  useEffect(() => {
    if (initialEmail) {
      setForm((current) => ({ ...current, email: initialEmail }));
    }
  }, [initialEmail]);

  function updateField<K extends keyof LoginFormValues>(key: K, value: LoginFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    transition.start();

    const parsed = loginFormSchema.safeParse(form);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      transition.reset();
      setSubmitting(false);
      return;
    }

    let shouldHideTransition = true;
    const transitionStartedAt = Date.now();

    try {
      const response = await fetch("/api/auth/login", {
        body: JSON.stringify(parsed.data),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const data = (await response.json().catch(() => null)) as TemisSession | unknown;

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data));
      }

      const session = data as TemisSession;
      saveSession(session);
      const elapsed = Date.now() - transitionStartedAt;
      await wait(Math.max(loginLoadingTotalMs - elapsed, 0));
      transition.showSuccess();
      await wait(loginLoadingSuccessMs);
      transition.exit();
      await wait(loginLoadingExitMs);
      shouldHideTransition = false;
      window.location.assign(getAuthenticatedRedirectPath(session, searchParams.get("next")));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesion.");
    } finally {
      if (shouldHideTransition) {
        transition.reset();
        setSubmitting(false);
      }
    }
  }

  function showGoogleSetupError() {
    setError("Falta configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID para probar Google.");
  }

  const submitGoogle = useCallback(
    async (credential: string) => {
      setGoogleSubmitting(true);
      setSubmitting(true);
      setError(null);
      setFieldErrors({});
      transition.start();
      let shouldHideTransition = true;
      const transitionStartedAt = Date.now();

      try {
        const session = await loginWithGoogleCredential(credential);
        const elapsed = Date.now() - transitionStartedAt;
        await wait(Math.max(loginLoadingTotalMs - elapsed, 0));
        transition.showSuccess();
        await wait(loginLoadingSuccessMs);
        transition.exit();
        await wait(loginLoadingExitMs);
        shouldHideTransition = false;
        window.location.assign(getAuthenticatedRedirectPath(session, searchParams.get("next")));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo iniciar sesion con Google.");
      } finally {
        if (shouldHideTransition) {
          transition.reset();
          setSubmitting(false);
          setGoogleSubmitting(false);
        }
      }
    },
    [searchParams, transition]
  );

  return {
    error,
    fieldErrors,
    form,
    googleSubmitting,
    showGoogleSetupError,
    submit,
    submitGoogle,
    submitting,
    transitionExiting: transition.exiting,
    transitionSuccess: transition.success,
    updateField
  };
}

function toFieldErrors(error: z.ZodError) {
  return error.issues.reduce<FieldErrors>((accumulator, issue) => {
    const key = issue.path[0] as keyof LoginFormValues | undefined;
    if (key && !accumulator[key]) {
      accumulator[key] = issue.message;
    }

    return accumulator;
  }, {});
}

function getApiErrorMessage(data: unknown) {
  if (typeof data === "object" && data && "message" in data) {
    const message = (data as { message?: unknown }).message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }

  return "No se pudo iniciar sesion.";
}
