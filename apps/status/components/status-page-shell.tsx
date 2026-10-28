import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { StatusSnapshot } from "@/lib/status.types";
import { IncidentCard, formatDate } from "./incident-card";
import { MaintenanceCard } from "./maintenance-card";
import { OverallStatusBanner } from "./overall-status-banner";
import { ServiceStatusList } from "./service-status-list";

export function CurrentStatusPage({ snapshot }: { snapshot: StatusSnapshot }) {
  const activeIncidents = snapshot.incidents.filter((incident) => incident.status !== "resolved");
  const now = Date.now();
  const activeMaintenances = snapshot.maintenances.filter(
    (maintenance) => Date.parse(maintenance.startsAt) <= now && Date.parse(maintenance.endsAt) > now
  );
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:px-8 sm:py-16">
      <div>
        <p className="text-sm font-medium text-primary">Estado en tiempo real</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Disponibilidad de Temis
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Información pública sobre la disponibilidad de la plataforma, sus servicios e incidentes
          activos.
        </p>
      </div>

      <OverallStatusBanner status={snapshot.overallStatus} />

      {activeIncidents.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="active-incidents-title">
          <h2 id="active-incidents-title" className="text-xl font-semibold tracking-tight">
            Incidentes activos
          </h2>
          {activeIncidents.map((incident) => (
            <IncidentCard incident={incident} key={incident.id} />
          ))}
        </section>
      ) : snapshot.overallStatus !== "unknown" ? (
        <p className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          No hay incidentes activos informados.
        </p>
      ) : null}

      {activeMaintenances.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="active-maintenance-title">
          <h2 id="active-maintenance-title" className="text-xl font-semibold tracking-tight">
            Mantenimiento en curso
          </h2>
          {activeMaintenances.map((maintenance) => (
            <MaintenanceCard maintenance={maintenance} key={maintenance.id} />
          ))}
        </section>
      ) : null}

      <ServiceStatusList components={snapshot.components} />

      <div className="flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Última actualización: {formatDate(snapshot.generatedAt)}</p>
        <Link
          href="/historial"
          className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
        >
          Ver historial <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function HistoryPage({ snapshot }: { snapshot: StatusSnapshot }) {
  const resolved = snapshot.incidents.filter((incident) => incident.status === "resolved");
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:px-8 sm:py-16">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Estado actual
        </Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          Historial de incidentes
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Incidentes resueltos y mantenimientos comunicados por Temis.
        </p>
      </div>
      <section className="grid gap-4" aria-labelledby="resolved-title">
        <h2 id="resolved-title" className="text-xl font-semibold tracking-tight">
          Incidentes resueltos
        </h2>
        {resolved.length > 0 ? (
          resolved.map((incident) => <IncidentCard incident={incident} key={incident.id} />)
        ) : (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Todavía no hay incidentes resueltos para mostrar.
          </p>
        )}
      </section>
      <section className="grid gap-4" aria-labelledby="maintenance-history-title">
        <h2 id="maintenance-history-title" className="text-xl font-semibold tracking-tight">
          Mantenimientos
        </h2>
        {snapshot.maintenances.length > 0 ? (
          snapshot.maintenances.map((maintenance) => (
            <MaintenanceCard maintenance={maintenance} key={maintenance.id} />
          ))
        ) : (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No hay mantenimientos informados.
          </p>
        )}
      </section>
    </div>
  );
}
