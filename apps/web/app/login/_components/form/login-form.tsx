"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { loginCopy } from "../../_constants/login.constants";
import { useLoginForm } from "../../_hooks/use-login-form";
import { LoginField } from "./login-field";
import { LoginLoadingTransition } from "../loading/login-loading-transition";
import { LoginPasswordInput } from "./login-password-input";

type LoginFormProps = {
  firstLogin: boolean;
  initialEmail: string | null;
};

export function LoginForm({ firstLogin, initialEmail }: LoginFormProps) {
  const state = useLoginForm(initialEmail);
  const title = firstLogin ? loginCopy.firstLoginTitle : loginCopy.returningTitle;

  return (
    <>
      <div className="my-auto w-full max-w-[390px]">
        <div className="mb-9">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-normal text-foreground md:text-[34px]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{loginCopy.subtitle}</p>
        </div>

        <form data-login-form className="grid gap-4" onSubmit={state.submit}>
          <LoginField label="Email" error={state.fieldErrors.email}>
            <Input
              autoComplete="email"
              className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
              inputMode="email"
              placeholder="ejemplo@gmail.com"
              value={state.form.email}
              onChange={(event) => state.updateField("email", event.currentTarget.value)}
            />
          </LoginField>

          <LoginField label="Contraseña" error={state.fieldErrors.password}>
            <LoginPasswordInput
              value={state.form.password}
              onChange={(value) => state.updateField("password", value)}
            />
          </LoginField>

          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              <Checkbox className="size-3.5 rounded-[4px]" />
              {loginCopy.remember}
            </label>
            <Link href="#" className="transition-colors hover:text-foreground">
              {loginCopy.forgot}
            </Link>
          </div>

          <GoogleSignInButton
            disabled={state.submitting}
            mode="login"
            onCredential={state.submitGoogle}
            onMissingClientId={state.showGoogleSetupError}
          />

          {state.error ? (
            <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground">
              {state.error}
            </div>
          ) : null}

          <div data-login-submit>
            <Button
              type="submit"
              className="mt-2 h-12 w-full rounded-2xl"
              disabled={state.submitting}
            >
              {state.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loginCopy.submit}
              {!state.submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </div>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {loginCopy.noAccount}{" "}
            <Link
              className="font-medium text-foreground transition-opacity hover:opacity-70"
              href="/create-account"
            >
              {loginCopy.createAccount}
            </Link>
          </p>
        </form>
      </div>

      <LoginLoadingTransition
        exiting={state.transitionExiting}
        success={state.transitionSuccess}
        visible={state.submitting}
      />
    </>
  );
}
