"use client";

import { useRouter } from "next/navigation";
import { redirectToLoginForLogout } from "@/lib/auth/logout";
import { usePasswordChangeForm } from "@/components/dashboard/account/use-password-change-form";

import {
  useAccountPasswordMutation,
  useAccountPasswordValidationMutation
} from "./use-account-mutations";

type UseAccountPasswordFormOptions = {
  hasPassword: boolean;
};

export function useAccountPasswordForm({ hasPassword }: UseAccountPasswordFormOptions) {
  const router = useRouter();
  const mutation = useAccountPasswordMutation();
  const validationMutation = useAccountPasswordValidationMutation();
  const form = usePasswordChangeForm({
    hasPassword,
    onSuccess: () => redirectToLoginForLogout(router),
    updatePassword: mutation.mutateAsync,
    validatePassword: validationMutation.mutateAsync
  });

  return {
    ...form,
    error: form.error || validationMutation.error?.message || mutation.error?.message,
    isSaving: form.isSaving || mutation.isPending,
    isValidating: form.isValidating || validationMutation.isPending
  };
}
