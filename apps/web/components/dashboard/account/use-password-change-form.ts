"use client";

import { useState, type FormEvent } from "react";
import {
  accountPasswordChangeSchema,
  accountPasswordSchema,
  type AccountPasswordFormValues
} from "@/lib/validation/account";

const emptyPasswordDraft: AccountPasswordFormValues = {
  currentPassword: "",
  newPassword: ""
};

type UsePasswordChangeFormOptions = {
  hasPassword: boolean;
  updatePassword: (input: AccountPasswordFormValues) => Promise<unknown>;
  validatePassword?: (input: AccountPasswordFormValues) => Promise<unknown>;
  onSuccess: () => void;
};

export function usePasswordChangeForm({
  hasPassword,
  onSuccess,
  updatePassword,
  validatePassword
}: UsePasswordChangeFormOptions) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState<AccountPasswordFormValues>(emptyPasswordDraft);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  function reset() {
    setConfirmOpen(false);
    setDraft(emptyPasswordDraft);
    setError("");
  }

  async function requestSave(event: FormEvent) {
    event.preventDefault();
    const parsed = parsePasswordDraft(draft, hasPassword);
    if (!parsed.success) {
      setError(parsed.error);
      return;
    }

    setError("");
    try {
      if (validatePassword) {
        setIsValidating(true);
        await validatePassword(parsed.data);
      }
      setDraft(parsed.data);
      setConfirmOpen(true);
    } catch (validationError) {
      setError(getErrorMessage(validationError));
    } finally {
      setIsValidating(false);
    }
  }

  async function confirmSave() {
    const parsed = parsePasswordDraft(draft, hasPassword);
    if (!parsed.success) {
      setConfirmOpen(false);
      setError(parsed.error);
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await updatePassword(parsed.data);
      onSuccess();
    } catch (mutationError) {
      setConfirmOpen(false);
      setError(getErrorMessage(mutationError));
    } finally {
      setIsSaving(false);
    }
  }

  return {
    confirmOpen,
    confirmSave,
    draft,
    error,
    isSaving,
    isValidating,
    requestSave,
    reset,
    setConfirmOpen,
    setDraft
  };
}

export type PasswordChangeForm = ReturnType<typeof usePasswordChangeForm>;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudieron guardar los cambios.";
}

function parsePasswordDraft(draft: AccountPasswordFormValues, hasPassword: boolean) {
  const schema = hasPassword ? accountPasswordChangeSchema : accountPasswordSchema;
  const parsed = schema.safeParse(draft);

  return parsed.success
    ? { data: parsed.data, success: true as const }
    : {
        error: parsed.error.errors[0]?.message ?? "Revisa las contraseñas.",
        success: false as const
      };
}
