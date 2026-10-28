"use client";

import { useState, type FormEvent } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readPlatformLoginResponse } from "@/lib/auth/platform-login-response";
import { saveSuperAdminSession, type SuperAdminSession } from "@/lib/auth/superadmin-session";

type FidoChallenge = {
  options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
  status: "fido_required";
  transactionId: string;
};

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const start = await fetch("/api/superadmin-auth/login/start", {
        body: JSON.stringify({ email, password }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = await readPlatformLoginResponse(start);
      if (!start.ok) throw new Error(result.message ?? "No se pudo iniciar sesión.");
      let session: SuperAdminSession;
      if (result.status === "fido_required") {
        const challenge = result as FidoChallenge;
        const assertion = await startAuthentication({ optionsJSON: challenge.options });
        const finish = await fetch("/api/superadmin-auth/login/finish", {
          body: JSON.stringify({ response: assertion, transactionId: challenge.transactionId }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        const finished = await readPlatformLoginResponse(finish);
        if (!finish.ok) throw new Error(finished.message ?? "No se pudo validar la llave.");
        session = finished as SuperAdminSession;
      } else {
        session = result as SuperAdminSession;
      }
      saveSuperAdminSession(session);
      window.location.assign("/superadmin");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <form
        onSubmit={submit}
        className="grid w-full max-w-md gap-5 rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <ShieldCheck />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Super Admin</h1>
            <p className="text-sm text-muted-foreground">Acceso global seguro de Temis.</p>
          </div>
        </div>
        <Input
          type="email"
          autoComplete="username"
          placeholder="Email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Validando..." : "Ingresar"}
        </Button>
      </form>
    </main>
  );
}
