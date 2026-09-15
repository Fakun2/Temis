"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, Loader2, RefreshCw, Unplug } from "lucide-react";
import { getApiErrorMessage } from "@/lib/http";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ConnectorLogo } from "../connectors/connector-logo";
import {
  useGoogleCalendarConnectMutation,
  useGoogleCalendarDisconnectMutation,
  useGoogleCalendarStatusQuery,
  useGoogleCalendarSyncMutation,
  useGoogleCalendarPreferencesMutation
} from "../../_hooks/use-google-calendar";
import type { GoogleCalendarSyncPreferences, GoogleCalendarSyncSource } from "../../_api/google-calendar.api";

const sourceLabels: Record<GoogleCalendarSyncSource, string> = {
  all_hearings: "Todas las audiencias",
  my_tasks: "Tareas asignadas a mí",
  my_area_tasks: "Tareas asignadas a mis áreas de trabajo",
  participating_hearings: "Audiencias en las que participo",
  all_tasks: "Todas las tareas"
};
const syncSourceGroups: Array<{ label: string; sources: GoogleCalendarSyncSource[] }> = [
  { label: "Tareas", sources: ["all_tasks", "my_tasks", "my_area_tasks"] },
  { label: "Audiencias", sources: ["all_hearings", "participating_hearings"] }
];
const defaultPreferences: GoogleCalendarSyncPreferences = { syncMode: "global", syncSources: [] };

export function GoogleCalendarIntegrationView() {
  const searchParams = useSearchParams();
  const statusQuery = useGoogleCalendarStatusQuery();
  const connect = useGoogleCalendarConnectMutation();
  const sync = useGoogleCalendarSyncMutation();
  const disconnect = useGoogleCalendarDisconnectMutation();
  const updatePreferences = useGoogleCalendarPreferencesMutation();
  const callbackResult = searchParams.get("googleCalendar");
  const status = statusQuery.data;
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [preferences, setPreferences] = useState<GoogleCalendarSyncPreferences>(defaultPreferences);
  const [pendingPreferenceSync, setPendingPreferenceSync] = useState<{
    previousLastSyncAt: string | null;
  } | null>(null);

  useEffect(() => {
    if (callbackResult === "connected") {
      setNotice({ tone: "success", text: "Google Calendar autorizado. Estamos preparando el calendario Temis…" });
    } else if (callbackResult === "error") {
      setNotice({ tone: "error", text: "No pudimos completar la conexión. Revisá los permisos e intentá nuevamente." });
    }
  }, [callbackResult]);

  useEffect(() => {
    if (status) setPreferences({ syncMode: status.syncMode, syncSources: status.syncSources });
  }, [status?.syncMode, status?.syncSources]);

  useEffect(() => {
    if (connect.error) setNotice({ tone: "error", text: getApiErrorMessage(connect.error) });
  }, [connect.error]);

  useEffect(() => {
    if (sync.error) setNotice({ tone: "error", text: getApiErrorMessage(sync.error) });
  }, [sync.error]);

  useEffect(() => {
    if (disconnect.error) setNotice({ tone: "error", text: getApiErrorMessage(disconnect.error) });
  }, [disconnect.error]);

  useEffect(() => {
    if (updatePreferences.error) setNotice({ tone: "error", text: getApiErrorMessage(updatePreferences.error) });
  }, [updatePreferences.error]);

  useEffect(() => {
    if (!pendingPreferenceSync) return;
    if (updatePreferences.error || status?.status === "error") {
      setPendingPreferenceSync(null);
      return;
    }
    if (
      status?.status === "connected" &&
      status.lastSyncAt !== pendingPreferenceSync.previousLastSyncAt
    ) {
      setPendingPreferenceSync(null);
    }
  }, [pendingPreferenceSync, status?.lastSyncAt, status?.status, updatePreferences.error]);

  useEffect(() => {
    if (sync.isSuccess) setNotice({ tone: "success", text: "Sincronización solicitada. Estamos actualizando tus eventos…" });
  }, [sync.isSuccess]);

  useEffect(() => {
    if (status?.status === "connected" && (sync.isSuccess || callbackResult === "connected")) {
      setNotice({ tone: "success", text: "Google Calendar está conectado y sincronizado." });
    }
    if (status?.status === "reauthorization_required") {
      setNotice({ tone: "error", text: "Google requiere que vuelvas a autorizar la integración." });
    }
    if (status?.status === "error" && status.lastError) {
      setNotice({ tone: "error", text: status.lastError });
    }
  }, [callbackResult, disconnect.isSuccess, status, sync.isSuccess]);

  const isBusy = status?.status === "provisioning" || status?.status === "sync_requested" || status?.status === "syncing" || status?.status === "disconnecting";
  const isConnected = status?.status === "connected";
  const isApplyingPreferences = pendingPreferenceSync !== null;
  const isSynchronizing = isBusy || sync.isPending || updatePreferences.isPending || isApplyingPreferences;
  const connectionDetails =
    status && (isConnected || isApplyingPreferences) ? status : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <Card className="rounded-2xl border-border/60 bg-card shadow-sm">
        <CardContent className="grid gap-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-border/40">
            <ConnectorLogo connectorId="google-calendar" className="size-7" />
          </span>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">Google Calendar</h1>
                {status?.connected ? <Badge className="bg-emerald-500/12 text-emerald-600">Conectado</Badge> : <Badge variant="outline">Disponible</Badge>}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Publicá tus tareas y audiencias de Temis en el calendario de Google.</p>
            </div>
          </div>

          {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

          {statusQuery.isLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando estado…</div> : null}
          {statusQuery.error ? <Notice tone="error">No pudimos consultar el estado de la integración.</Notice> : null}

          {connectionDetails ? (
            <div className="grid gap-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
              <div className="grid gap-1 text-sm"><span className="text-muted-foreground">Cuenta</span><span className="font-medium text-foreground">{connectionDetails.googleEmail}</span></div>
              <div className="grid gap-1 text-sm"><span className="text-muted-foreground">Calendario</span><span className="font-medium text-foreground">{connectionDetails.calendarName}</span></div>
              <div className="grid gap-1 text-sm"><span className="text-muted-foreground">Sincronización</span><span className="font-medium text-foreground">{preferences.syncMode === "global" ? "Global" : "Personalizada"}</span></div>
              <div className="grid gap-1 text-sm"><span className="text-muted-foreground">Eventos publicados</span><span className="font-medium text-foreground">{connectionDetails.activeEventCount}</span></div>
              {connectionDetails.lastError ? <Notice tone="error">{connectionDetails.lastError}</Notice> : null}
              <div className="flex flex-wrap gap-2">
                <Button disabled={isSynchronizing} onClick={() => { setNotice(null); sync.mutate(undefined); }} type="button"><RefreshCw className={`mr-2 size-4 ${isSynchronizing ? "animate-spin" : ""}`} />{isSynchronizing ? "Sincronizando…" : "Sincronizar ahora"}</Button>
                <Button disabled={disconnect.isPending || isBusy} onClick={() => setDisconnectDialogOpen(true)} type="button" variant="outline"><Unplug className="mr-2 size-4" />Desconectar</Button>
                <Button disabled={isSynchronizing} onClick={() => setDialogOpen(true)} type="button" variant="outline">Editar configuración</Button>
              </div>
            </div>
          ) : isBusy ? (
            <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Loader2 className="size-4 animate-spin text-primary" />{status?.status === "disconnecting" ? "Desconectando Google Calendar…" : status?.status === "sync_requested" ? "Esperando al worker de sincronización…" : status?.status === "syncing" ? "Sincronizando eventos…" : "Preparando tu calendario Temis…"}</div>
              <p className="text-sm leading-6 text-muted-foreground">Esta operación se procesa en segundo plano. La pantalla se actualizará automáticamente.</p>
              {status?.status === "syncing" && status.canRetry ? <Button className="w-fit" disabled={sync.isPending} onClick={() => { setNotice(null); sync.mutate(undefined); }} type="button" variant="outline"><RefreshCw className={`mr-2 size-4 ${sync.isPending ? "animate-spin" : ""}`} />{sync.isPending ? "Reintentando…" : "Reintentar sincronización"}</Button> : null}
            </div>
          ) : (
            <div className="grid gap-4 rounded-xl border border-dashed border-border/70 bg-secondary/20 p-5">
              <p className="text-sm leading-6 text-muted-foreground">Temis va a crear un calendario secundario llamado Temis. La sincronización es unidireccional: Google no modifica los datos de Temis.</p>
              <Button disabled={connect.isPending} onClick={() => { setNotice(null); setPreferences(defaultPreferences); setDialogOpen(true); }} type="button" className="w-fit">{connect.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CalendarDays className="mr-2 size-4" />}Conectar Google Calendar</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-md flex-col overflow-hidden p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Conectar Temis con Google Calendar</DialogTitle>
            <DialogDescription className="text-xs leading-5">Elegí qué sincronizar en Google Calendar.</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-3">
              <input checked={preferences.syncMode === "global"} name="calendar-sync-mode" onChange={() => setPreferences({ syncMode: "global", syncSources: [] })} type="radio" />
              <span><span className="block text-sm font-semibold text-foreground">Global</span><span className="block text-sm text-muted-foreground">Todas las audiencias y todas las tareas.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 p-3">
              <input checked={preferences.syncMode === "custom"} name="calendar-sync-mode" onChange={() => setPreferences((current) => ({ ...current, syncMode: "custom" }))} type="radio" />
              <span><span className="block text-sm font-semibold text-foreground">Custom</span><span className="block text-sm text-muted-foreground">Elegí una o varias fuentes para tu calendario.</span></span>
            </label>
            <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${preferences.syncMode === "custom" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="min-h-0 overflow-hidden">
                <div className="grid gap-2 rounded-xl bg-secondary/30 p-2">
                  <div className="temis-calendar-options-scroll max-h-32 overflow-y-auto overscroll-contain pr-1">
                    {syncSourceGroups.map((group) => (
                      <section key={group.label} className="grid gap-1.5">
                        <h3 className="px-2.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</h3>
                        {group.sources.map((source) => {
                          const selected = preferences.syncSources.includes(source);
                          const lockedByParent =
                            ((source === "my_tasks" || source === "my_area_tasks") && preferences.syncSources.includes("all_tasks")) ||
                            (source === "participating_hearings" && preferences.syncSources.includes("all_hearings"));

                          return (
                            <button
                              key={source}
                              aria-checked={selected}
                              role="switch"
                              className={cn(
                                "group flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                lockedByParent && "cursor-not-allowed opacity-90"
                              )}
                              disabled={lockedByParent}
                              onClick={() => setPreferences((current) => toggleSyncSource(current, source))}
                              type="button"
                            >
                              <span>{sourceLabels[source]}</span>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
                                  selected ? "bg-primary" : "bg-muted-foreground/35 group-hover:bg-muted-foreground/50"
                                )}
                              >
                                <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", selected ? "translate-x-5" : "translate-x-0")} />
                              </span>
                            </button>
                          );
                        })}
                      </section>
                    ))}
                  </div>
                  {preferences.syncMode === "custom" && preferences.syncSources.length === 0 ? <p className="text-sm text-destructive">Seleccioná al menos una fuente.</p> : null}
                </div>
              </div>
            </div>
            <div className="mt-auto flex shrink-0 justify-end gap-2 border-t border-border/60 pt-3">
              <Button onClick={() => setDialogOpen(false)} type="button" variant="outline">Cancelar</Button>
              <Button disabled={preferences.syncMode === "custom" && preferences.syncSources.length === 0 || connect.isPending || updatePreferences.isPending} onClick={() => {
                setNotice(null);
                if (status?.connected) updatePreferences.mutate(preferences, { onSuccess: () => { setDialogOpen(false); setPendingPreferenceSync({ previousLastSyncAt: status.lastSyncAt }); setNotice({ tone: "success", text: "Configuración guardada. Temis está actualizando tus eventos…" }); } });
                else connect.mutate(preferences, { onSuccess: () => setDialogOpen(false) });
              }} type="button">{connect.isPending || updatePreferences.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}{status?.connected ? "Guardar configuración" : "Continuar con Google"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={disconnectDialogOpen}
        onOpenChange={(open) => {
          if (!disconnect.isPending) setDisconnectDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md" showCloseButton={!disconnect.isPending}>
          <DialogHeader>
            <DialogTitle>¿Desconectar Google Calendar?</DialogTitle>
            <DialogDescription className="leading-6">
              Se eliminarán de Google Calendar todos los eventos de tareas y audiencias publicados por Temis.
              Tus tareas y audiencias originales en Temis no se eliminan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button disabled={disconnect.isPending} onClick={() => setDisconnectDialogOpen(false)} type="button" variant="outline">
              Cancelar
            </Button>
            <Button
              disabled={disconnect.isPending}
              onClick={() => {
                setNotice(null);
                disconnect.mutate(undefined, { onSuccess: () => setDisconnectDialogOpen(false) });
              }}
              type="button"
              variant="destructive"
            >
              {disconnect.isPending ? <Loader2 className="size-4 animate-spin" /> : <Unplug className="size-4" />}
              {disconnect.isPending ? "Desconectando…" : "Desconectar y eliminar eventos"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function toggleSyncSource(
  current: GoogleCalendarSyncPreferences,
  source: GoogleCalendarSyncSource
): GoogleCalendarSyncPreferences {
  const selected = current.syncSources.includes(source);
  const next = new Set(current.syncSources);
  const relatedSources: Partial<Record<GoogleCalendarSyncSource, GoogleCalendarSyncSource[]>> = {
    all_tasks: ["my_tasks", "my_area_tasks"],
    all_hearings: ["participating_hearings"]
  };

  if (selected) {
    next.delete(source);
    relatedSources[source]?.forEach((related) => next.delete(related));
  } else {
    next.add(source);
    relatedSources[source]?.forEach((related) => next.add(related));
  }

  return { ...current, syncSources: [...next] };
}

function Notice({ children, tone }: { children: ReactNode; tone: "error" | "success" }) {
  return <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : null}<span>{children}</span></div>;
}
