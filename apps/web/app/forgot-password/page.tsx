"use client";

import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { useTheme } from "@/lib/theme/theme-provider";
import { LoginPageShell } from "../login/_components/layout/login-page-shell";

export default function ForgotPasswordPage() {
  const theme = useTheme();
  return (
    <LoginPageShell darkMode={theme.isDark} onToggleTheme={theme.toggleVariant}>
      <PasswordRecoveryForm mode="request" />
    </LoginPageShell>
  );
}
