"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { authControllerCreateAccount } from "@temis/api-client";
import { loginWithGoogleCredential } from "@/lib/auth/google-auth";
import { getAuthenticatedRedirectPath } from "@/lib/auth/redirect";
import { createAccountFormSchema, type CreateAccountFormValues } from "@/lib/validation/auth";
import {
  createAccountInitialForm,
  createAccountLoadingExitMs,
  createAccountLoadingSuccessMs,
  createAccountLoadingTotalMs
} from "../_constants/create-account.constants";
import {
  getCreateAccountApiErrorMessage,
  toCreateAccountFieldErrors
} from "../_utils/create-account-errors";
import { useCreateAccountTransition } from "./use-create-account-transition";
import type {
  CreateAccountFieldErrors,
  CreateAccountFieldName,
  UseCreateAccountFormResult
} from "../_types/create-account.types";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useCreateAccountForm(): UseCreateAccountFormResult {
  const router = useRouter();
  const [form, setForm] = useState<CreateAccountFormValues>(createAccountInitialForm);
  const [fieldErrors, setFieldErrors] = useState<CreateAccountFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const transition = useCreateAccountTransition();
  const [showPassword, setShowPassword] = useState(false);

  function updateField<K extends CreateAccountFieldName>(
    key: K,
    value: CreateAccountFormValues[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError(null);
  }

  function togglePasswordVisibility() {
    setShowPassword((current) => !current);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = createAccountFormSchema.safeParse(form);
    if (!parsed.success) {
      setFieldErrors(toCreateAccountFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    transition.start();
    let shouldHideTransition = true;
    const transitionStartedAt = Date.now();

    try {
      const response = await authControllerCreateAccount(parsed.data);

      if (response.status !== 201) {
        throw new Error(getCreateAccountApiErrorMessage(response.data));
      }

      const elapsed = Date.now() - transitionStartedAt;
      await wait(Math.max(createAccountLoadingTotalMs - elapsed, 0));
      transition.showSuccess();
      await wait(createAccountLoadingSuccessMs);
      transition.exit();
      await wait(createAccountLoadingExitMs);
      shouldHideTransition = false;
      router.push(
        `/login?email=${encodeURIComponent(response.data.user.email)}&loading=account-created`
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear la cuenta.");
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
        await wait(Math.max(createAccountLoadingTotalMs - elapsed, 0));
        transition.showSuccess();
        await wait(createAccountLoadingSuccessMs);
        transition.exit();
        await wait(createAccountLoadingExitMs);
        shouldHideTransition = false;
        router.push(getAuthenticatedRedirectPath(session, null));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo crear la cuenta con Google.");
      } finally {
        if (shouldHideTransition) {
          transition.reset();
          setSubmitting(false);
          setGoogleSubmitting(false);
        }
      }
    },
    [router, transition]
  );

  return {
    form,
    fieldErrors,
    error,
    submitting,
    googleSubmitting,
    transitionExiting: transition.exiting,
    transitionSuccess: transition.success,
    showPassword,
    showGoogleSetupError,
    submit,
    submitGoogle,
    togglePasswordVisibility,
    updateField
  };
}
