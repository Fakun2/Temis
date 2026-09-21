"use client";

import { useTheme } from "@/lib/theme/theme-provider";
import { CreateAccountMedia } from "./_components/media/create-account-media";
import { CreateAccountPageShell } from "./_components/layout/create-account-page-shell";
import { CreateAccountPanel } from "./_components/layout/create-account-panel";
import { useCreateAccountForm } from "./_hooks/use-create-account-form";

export default function CreateAccountPage() {
  const theme = useTheme();
  const formState = useCreateAccountForm();

  return (

    <CreateAccountPageShell
      submitting={formState.submitting}
      transitionExiting={formState.transitionExiting}
      transitionSuccess={formState.transitionSuccess}
    >
      <div className="grid h-full min-h-0 w-full lg:grid-cols-[1.02fr_1fr]">
        <CreateAccountPanel
          darkMode={theme.isDark}
          formState={formState}
          onToggleTheme={theme.toggleVariant}
        />
        <CreateAccountMedia />
      </div>
    </CreateAccountPageShell>
  );
}
