"use client";

import { useAccountPasswordForm } from "../_hooks/use-account-password-form";
import { PasswordChangeSection } from "@/components/dashboard/account/password-change-section";

type SecuritySectionProps = {
  hasPassword: boolean;
};

export function SecuritySection({ hasPassword }: SecuritySectionProps) {
  const form = useAccountPasswordForm({ hasPassword });

  return <PasswordChangeSection form={form} hasPassword={hasPassword} />;
}
