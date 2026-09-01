"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { redirectToLoginForLogout } from "@/lib/auth/logout";
import {
  accountPasswordChangeSchema,
  accountPasswordSchema,
  type AccountPasswordFormValues
} from "@/lib/validation/account";
import { getErrorMessage } from "../_utils/account-format";
import {
  useAccountPasswordMutation,
  useAccountPasswordValidationMutation
} from "./use-account-mutations";

const emptyPasswordDraft: AccountPasswordFormValues = {
  currentPassword: "",
  newPassword: ""
};

type UseAccountPasswordFormOptions = {
  hasPassword: boolean;
};

export function useAccountPasswordForm({ hasPassword }: UseAccountPasswordFormOptions) {
  const router = useRouter();
  const mutation = useAccountPasswordMutation();
  const validationMutation = useAccountPasswordValidationMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<AccountPasswordFormValues>(emptyPasswordDraft);

  function reset() {
    setDraft(emptyPasswordDraft);
    setError("");
  }

  async function requestSave(event: FormEvent) {
    event.preventDefault();
    const schema = hasPassword ? accountPasswordChangeSchema : accountPasswordSchema;
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Revisa las contraseñas.");
      return;
    }

    setError("");
    try {
      await validationMutation.mutateAsync(parsed.data);
      setDraft(parsed.data);
      setConfirmOpen(true);
    } catch (validationError) {
      setError(getErrorMessage(validationError));
    }
  }

  async function confirmSave() {
    const schema = hasPassword ? accountPasswordChangeSchema : accountPasswordSchema;
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      setConfirmOpen(false);
      setError(parsed.error.errors[0]?.message ?? "Revisa las contraseñas.");
      return;
    }

    setError("");
    try {
      await mutation.mutateAsync(parsed.data);
      redirectToLoginForLogout(router);
    } catch (mutationError) {
      setConfirmOpen(false);
      setError(getErrorMessage(mutationError));
    }
  }

  return {
    confirmOpen,
    confirmSave,
    draft,
    error: error || validationMutation.error?.message || mutation.error?.message,
    isSaving: mutation.isPending,
    isValidating: validationMutation.isPending,
    requestSave,
    reset,
    setConfirmOpen,
    setDraft
  };
}
