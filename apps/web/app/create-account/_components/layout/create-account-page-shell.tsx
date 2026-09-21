"use client";

import type { ReactNode } from "react";
import { CreateAccountLoadingDialog } from "../loading/create-account-loading-dialog";

type CreateAccountPageShellProps = {
  children: ReactNode;
  submitting: boolean;
  transitionExiting: boolean;
  transitionSuccess: boolean;
};

export function CreateAccountPageShell({
  children,
  submitting,
  transitionExiting,
  transitionSuccess
}: CreateAccountPageShellProps) {

  return (
    <main
      className="fixed inset-0 h-[100svh] max-h-[100svh] w-full overflow-hidden bg-background text-foreground transition-colors supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
    >
      {children}
      <CreateAccountLoadingDialog
        exiting={transitionExiting}
        success={transitionSuccess}
        visible={submitting}
      />
    </main>
  );
}
