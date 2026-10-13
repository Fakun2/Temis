"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  passwordRecoveryConfirmFormSchema,
  passwordRecoveryRequestFormSchema
} from "@/lib/validation/auth";

type PasswordRecoveryFormProps = { mode: "confirm" | "request" };

export function PasswordRecoveryForm({ mode }: PasswordRecoveryFormProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isRequest = mode === "request";
  const title = isRequest ? "Recuperá tu contraseña" : "Elegí una nueva contraseña";
  const description = isRequest
    ? "Te enviaremos un código para restablecer tu acceso."
    : "Ingresá el código que recibiste por email junto con tu nueva contraseña.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = isRequest
      ? passwordRecoveryRequestFormSchema.safeParse({ email })
      : passwordRecoveryConfirmFormSchema.safeParse({ email, code, newPassword, confirmPassword });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá los datos ingresados.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/password-recovery/${mode}`, {
        body: JSON.stringify(parsed.data),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(data?.message ?? "No se pudo completar la solicitud.");
      }
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="my-auto w-full max-w-[390px] text-center md:text-left">
        <CheckCircle2 className="mx-auto size-10 text-primary md:mx-0" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold tracking-normal text-foreground">
          {isRequest ? "Revisá tu email" : "Contraseña actualizada"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isRequest
            ? "Si existe una cuenta elegible con ese email, vas a recibir un código de recuperación."
            : "Tu contraseña fue actualizada. Iniciá sesión con tus nuevas credenciales."}
        </p>
        <Button asChild className="mt-7 h-12 w-full rounded-2xl">
          <Link href={isRequest ? "/reset-password" : "/login"}>
            {isRequest ? "Ingresar el código" : "Ir a iniciar sesión"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="my-auto w-full max-w-[390px]">
      <div className="mb-9 text-center md:text-left">
        <h1 className="text-balance text-3xl font-semibold leading-tight tracking-normal text-foreground md:text-[34px]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Email
          <Input
            autoComplete="email"
            className="h-12 rounded-2xl border-field-border bg-field px-4 text-base text-field-foreground md:text-sm"
            inputMode="email"
            placeholder="ejemplo@gmail.com"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
        </label>

        {!isRequest ? (
          <>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Código de recuperación
              <Input
                autoComplete="one-time-code"
                className="h-12 rounded-2xl border-field-border bg-field px-4 text-center font-mono text-lg tracking-[0.3em] text-field-foreground"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Nueva contraseña
              <Input
                autoComplete="new-password"
                className="h-12 rounded-2xl border-field-border bg-field px-4 text-field-foreground"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.currentTarget.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              Repetir nueva contraseña
              <Input
                autoComplete="new-password"
                className="h-12 rounded-2xl border-field-border bg-field px-4 text-field-foreground"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.currentTarget.value)}
              />
            </label>
          </>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        <Button type="submit" className="mt-2 h-12 w-full rounded-2xl" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isRequest ? "Enviar código" : "Actualizar contraseña"}
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link className="font-medium text-foreground hover:opacity-70" href="/login">
            Volver a iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
