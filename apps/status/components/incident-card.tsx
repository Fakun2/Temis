import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { StatusIncident } from "@/lib/status.types";
import { incidentStageLabels, statusPresentation } from "./status-presentation";

export function IncidentCard({
  incident,
  compact = false
}: {
  incident: StatusIncident;
  compact?: boolean;
}) {
  const presentation = statusPresentation[incident.impact];
  const latest = incident.updates.at(-1);
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-[0_12px_36px_-32px_rgba(7,48,97,0.5)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`size-2.5 rounded-full ${presentation.cell}`} aria-hidden="true" />
            <span
              className={`text-xs font-semibold uppercase tracking-[0.12em] ${presentation.text}`}
            >
              {incidentStageLabels[incident.status]}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">{incident.title}</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {formatDate(incident.updatedAt)}
        </span>
      </div>
      {latest ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{latest.message}</p>
      ) : null}
      {incident.componentNames.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Servicios afectados:{" "}
          <span className="font-medium text-foreground">{incident.componentNames.join(", ")}</span>
        </p>
      ) : null}
      {!compact ? (
        <Link
          href={`/incidentes/${encodeURIComponent(incident.id)}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Ver actualizaciones <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}

export function IncidentTimeline({ incident }: { incident: StatusIncident }) {
  return (
    <ol className="mt-8 space-y-0">
      {[...incident.updates].reverse().map((update, index) => (
        <li className="relative grid grid-cols-[1.25rem_1fr] gap-4 pb-8 last:pb-0" key={update.id}>
          {index < incident.updates.length - 1 ? (
            <span className="absolute left-[9px] top-5 h-full w-px bg-border" aria-hidden="true" />
          ) : null}
          <span
            className="relative z-10 mt-1 size-5 rounded-full border-4 border-card bg-primary"
            aria-hidden="true"
          />
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{incidentStageLabels[update.status]}</h2>
              <time className="text-xs text-muted-foreground" dateTime={update.publishedAt}>
                {formatDate(update.publishedAt)}
              </time>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{update.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(new Date(value));
}
