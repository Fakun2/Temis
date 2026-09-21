import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAccountCopy, createAccountFieldMap } from "../../_constants/create-account.constants";
import { CreateAccountField } from "./create-account-field";
import type { UseCreateAccountFormResult } from "../../_types/create-account.types";

type CreateAccountFormProps = {
  state: UseCreateAccountFormResult;
};

export function CreateAccountForm({ state }: CreateAccountFormProps) {
  return (
    <form data-create-account-form className="relative grid w-full gap-3 xl:gap-4" onSubmit={state.submit}>
      {createAccountFieldMap.map((field) => {
        const isPassword = field.name === "password";
        const inputType = isPassword && state.showPassword ? "text" : field.type;

        return (
          <CreateAccountField
            id={`create-account-${field.name}`}
            key={field.name}
            label={field.label}
            error={state.fieldErrors[field.name]}
          >
            <div className={isPassword ? "relative" : undefined}>
              <Input
                autoComplete={field.autoComplete}
                className="h-12 w-full rounded-2xl border-field-border bg-field px-4 text-sm text-field-foreground sm:h-10 2xl:h-12 xl:text-base"
                id={`create-account-${field.name}`}
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                type={inputType}
                value={state.form[field.name]}
                onChange={(event) => state.updateField(field.name, event.currentTarget.value)}
              />
              {isPassword ? (
                <button
                  type="button"
                  className="absolute right-4 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                  onClick={state.togglePasswordVisibility}
                  aria-label={state.showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {state.showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              ) : null}
            </div>
          </CreateAccountField>
        );
      })}

      {state.error ? (
        <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground">
          {state.error}
        </div>
      ) : null}

      <div className="relative mt-2 xl:mt-3" data-create-account-submit>
        <Button
          type="submit"
          className="h-10 w-full rounded-2xl text-sm xl:h-12"
          disabled={state.submitting}
        >
          {state.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {createAccountCopy.submit}
          {!state.submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </div>

      <GoogleSignInButton
        disabled={state.submitting}
        mode="signup"
        onCredential={state.submitGoogle}
        onMissingClientId={state.showGoogleSetupError}
      />
    </form>
  );
}
