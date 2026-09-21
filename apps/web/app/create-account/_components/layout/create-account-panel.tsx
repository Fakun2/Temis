import Link from "next/link";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAccountCopy } from "../../_constants/create-account.constants";
import { CreateAccountForm } from "../form/create-account-form";
import { CreateAccountHeader } from "./create-account-header";
import { FormDivider } from "../form/form-divider";
import type { UseCreateAccountFormResult } from "../../_types/create-account.types";

type CreateAccountPanelProps = {
  darkMode: boolean;
  formState: UseCreateAccountFormResult;
  onToggleTheme: () => void;
};

export function CreateAccountPanel({
  darkMode,
  formState,
  onToggleTheme
}: CreateAccountPanelProps) {
  return (
    <section className="relative flex min-h-0 min-w-0 items-center justify-center overflow-y-auto overscroll-contain px-5 py-16 sm:px-8 sm:py-20 lg:px-16 lg:py-12">
      <div className="absolute left-5 top-5 sm:left-8 sm:top-8">
        <Button asChild variant="outline" className="size-10 rounded-full p-0">
          <Link href="/" aria-label="home">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full px-3"
          onClick={onToggleTheme}
          aria-label="Cambiar tema"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="w-full max-w-[390px]">
        <CreateAccountHeader />
        <FormDivider />
        <CreateAccountForm state={formState} />

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {createAccountCopy.existingAccount}{" "}
          <Link
            className="rounded-full border border-border px-3 py-1 font-medium text-foreground transition-colors hover:bg-secondary"
            href="/login"
          >
            {createAccountCopy.login}
          </Link>
        </p>
      </div>
    </section>
  );
}
