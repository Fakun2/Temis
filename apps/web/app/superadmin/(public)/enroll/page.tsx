"use client";

import { FormEvent, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EnrollmentChallenge = {
  options: Parameters<typeof startRegistration>[0]["optionsJSON"];
  remainingKeys: number;
  status: "fido_required";
  transactionId: string;
};

export default function PlatformEnrollmentPage() {
  const [form, setForm] = useState({ bootstrapToken: "", deviceName: "", email: "", password: "" });
  const [status, setStatus] = useState("Preparado para enrolar este equipo Windows.");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setStatus("Verificando dispositivo y postura de seguridad...");
      const response = await fetch("/api/superadmin-auth/enrollment/start", {
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      let challenge = (await response.json()) as EnrollmentChallenge & { message?: string };
      if (!response.ok) throw new Error(challenge.message ?? "No se pudo iniciar el enrolamiento.");

      for (let index = 1; index <= 2; index += 1) {
        setStatus(`Conectá la llave física ${index} de 2 e ingresá su PIN.`);
        const credential = await startRegistration({ optionsJSON: challenge.options });
        const finish = await fetch("/api/superadmin-auth/enrollment/credential", {
          body: JSON.stringify({
            authenticatorName: `Llave de seguridad ${index}`,
            response: credential,
            transactionId: challenge.transactionId
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        const result = await finish.json();
        if (!finish.ok) throw new Error(result.message ?? "No se pudo registrar la llave.");
        if (result.status === "fido_required") challenge = result as EnrollmentChallenge;
      }

      setStatus("Dispositivo y llaves activados. Redirigiendo al panel seguro...");
      window.location.assign("/superadmin");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo completar el enrolamiento.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <form
        onSubmit={submit}
        className="grid w-full max-w-lg gap-5 rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <ShieldCheck />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Enrolamiento de plataforma</h1>
            <p className="text-sm text-muted-foreground">
              Sólo para equipos administrados autorizados desde VPS.
            </p>
          </div>
        </div>
        <Input
          type="email"
          autoComplete="username"
          placeholder="Email de super admin"
          required
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          required
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <Input
          placeholder="Nombre del equipo"
          required
          value={form.deviceName}
          onChange={(event) => setForm({ ...form, deviceName: event.target.value })}
        />
        <Input
          type="password"
          autoComplete="off"
          placeholder="Token de bootstrap"
          required
          value={form.bootstrapToken}
          onChange={(event) => setForm({ ...form, bootstrapToken: event.target.value })}
        />
        <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground" role="status">
          {status}
        </p>
        <Button type="submit" disabled={busy}>
          {busy ? "Verificando..." : "Enrolar dispositivo y dos llaves"}
        </Button>
      </form>
    </main>
  );
}
