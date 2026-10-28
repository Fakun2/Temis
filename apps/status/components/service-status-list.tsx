import type { StatusComponent } from "@/lib/status.types";
import { statusPresentation } from "./status-presentation";

export function ServiceStatusList({ components }: { components: StatusComponent[] }) {
  return (
    <section aria-labelledby="system-status-title">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="system-status-title" className="text-xl font-semibold tracking-tight">
            Estado de los servicios
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Disponibilidad observada durante los últimos 30 días.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
          aria-label="Leyenda"
        >
          {(["operational", "degraded", "major_outage", "unknown"] as const).map((status) => (
            <span className="inline-flex items-center gap-1.5" key={status}>
              <span
                className={`size-2 rounded-sm ${statusPresentation[status].cell}`}
                aria-hidden="true"
              />
              {status === "operational" ? "Operativo" : statusPresentation[status].label}
            </span>
          ))}
        </div>
      </div>

      <div className="border-y border-border">
        {components.map((component) => (
          <ServiceRow component={component} key={component.id} />
        ))}
      </div>
    </section>
  );
}

function ServiceRow({ component }: { component: StatusComponent }) {
  const presentation = statusPresentation[component.status];
  return (
    <article className="grid gap-4 border-b border-border/70 py-5 last:border-b-0 md:grid-cols-[12rem_1fr_auto] md:items-center">
      <div className="min-w-0">
        <h3 className="font-medium">{component.name}</h3>
        <p className={`mt-1 text-xs font-medium ${presentation.text}`}>
          {component.status === "operational" ? "Operativo" : presentation.label}
        </p>
      </div>
      <div
        className="grid grid-cols-[repeat(30,minmax(3px,1fr))] gap-1"
        aria-label={`Historial de ${component.name}`}
      >
        {component.days.map((day) => (
          <span
            className={`h-8 rounded-[3px] ${statusPresentation[day.status].cell}`}
            key={day.date}
            title={`${formatDay(day.date)} · ${statusPresentation[day.status].label}`}
          />
        ))}
      </div>
      <p className="min-w-24 text-right text-sm font-semibold tabular-nums">
        {component.uptimePercent === null
          ? "Sin datos"
          : `${formatPercent(component.uptimePercent)}%`}
      </p>
    </article>
  );
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value === 100 ? 0 : 1
  }).format(value);
}
