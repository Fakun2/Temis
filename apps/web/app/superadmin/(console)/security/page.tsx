"use client";

import { KeyRound, Laptop, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePlatformSecurity } from "./_hooks/use-platform-security";

export default function PlatformSecurityPage() {
  const {
    closeConfirmation,
    confirmationOpen,
    confirming,
    confirmPasswordStepUp,
    password,
    passwordError,
    query,
    revoke,
    setPassword
  } = usePlatformSecurity();

  if (query.isLoading) return <SecurityState message="Cargando controles de seguridad..." />;
  if (query.error || !query.data)
    return <SecurityState message={query.error?.message ?? "No se pudo cargar la seguridad."} />;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 overflow-y-auto pb-6 sm:px-3 lg:px-8">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Seguridad de plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Llaves físicas, dispositivo administrado y sesiones revocables.
        </p>
      </div>
      <SecurityList title="Llaves FIDO2" icon={<KeyRound className="h-5 w-5" />}>
        {query.data.authenticators.map((item) => (
          <SecurityRow
            key={item.id}
            title={item.name}
            detail={`AAGUID ${item.aaguid} · último uso ${formatDate(item.lastUsedAt)}`}
            action="Revocar"
            onAction={() => revoke("authenticators", item.id)}
          />
        ))}
      </SecurityList>
      <SecurityList title="Dispositivos" icon={<Laptop className="h-5 w-5" />}>
        {query.data.devices.map((item) => (
          <SecurityRow
            key={item.id}
            title={item.name}
            detail={`${item.platform} · postura ${formatDate(item.lastCompliantAt)}`}
            action="Revocar"
            onAction={() => revoke("devices", item.id)}
          />
        ))}
      </SecurityList>
      <SecurityList title="Sesiones" icon={<LogOut className="h-5 w-5" />}>
        {query.data.sessions.map((item) => (
          <SecurityRow
            key={item.id}
            title={`${item.deviceName}${item.current ? " · actual" : ""}`}
            detail={`Actividad ${formatDate(item.lastActivityAt)}`}
            action="Cerrar"
            onAction={() => revoke("sessions", item.id)}
          />
        ))}
      </SecurityList>
      <Dialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!open) closeConfirmation();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar con contraseña</DialogTitle>
            <DialogDescription>
              El modo reforzado está desactivado. Volvé a ingresar tu contraseña para autorizar esta
              acción sensible durante cinco minutos.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void confirmPasswordStepUp();
            }}
          >
            <Input
              autoComplete="current-password"
              autoFocus
              disabled={confirming}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña actual"
              type="password"
              value={password}
            />
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={confirming}
                onClick={closeConfirmation}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!password || confirming}>
                {confirming ? "Confirmando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SecurityList({
  children,
  icon,
  title
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function SecurityRow({
  action,
  detail,
  onAction,
  title
}: {
  action: string;
  detail: string;
  onAction: () => Promise<unknown>;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/50 p-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => void onAction()}>
        {action}
      </Button>
    </div>
  );
}

function SecurityState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(value)
      )
    : "sin registro";
}
