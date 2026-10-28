import { CheckCircle2, CircleHelp, TriangleAlert, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  PlatformObservabilityHistory,
  PlatformObservabilityHistoryStatus
} from "../../_api/platform.api";

type HistoryProps = {
  history?: PlatformObservabilityHistory;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
};

const statusPresentation: Record<
  PlatformObservabilityHistoryStatus,
  { cell: string; icon: LucideIcon; iconClass: string; label: string }
> = {
  degraded: {
    cell: "bg-amber-400",
    icon: TriangleAlert,
    iconClass: "text-amber-600 dark:text-amber-400",
    label: "Degradado"
  },
  healthy: {
    cell: "bg-emerald-500",
    icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    label: "Operativo"
  },
  no_data: {
    cell: "bg-muted-foreground/20",
    icon: CircleHelp,
    iconClass: "text-muted-foreground",
    label: "Sin datos"
  },
  unavailable: {
    cell: "bg-rose-500",
    icon: XCircle,
    iconClass: "text-rose-600 dark:text-rose-400",
    label: "No disponible"
  }
};

export function ObservabilityHistoryTable({ history, isError, isLoading, onRetry }: HistoryProps) {
  const hasSamples = history?.components.some((component) =>
    component.days.some((day) => day.samples > 0)
  );

  return (
    <section className="grid gap-4" aria-labelledby="observability-history-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="observability-history-title" className="text-xl font-semibold text-foreground">
            Historial por componente
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Peor estado observado por día durante los últimos 30 días.
          </p>
        </div>
        <HistoryLegend />
      </div>

      {isError ? (
        <Card className="flex min-h-32 flex-col items-start justify-center gap-3 p-5">
          <p className="text-sm text-destructive" role="alert">
            No se pudo cargar el historial. El estado en vivo sigue disponible.
          </p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        </Card>
      ) : isLoading ? (
        <HistorySkeleton />
      ) : history ? (
        <Card className="overflow-hidden rounded-xl border-border/55 shadow-[0_1px_7px_rgba(15,23,42,0.04)]">
          {!hasSamples ? (
            <p className="border-b border-border/50 px-5 py-3 text-sm text-muted-foreground">
              Todavía no hay muestras históricas. Los días previos se muestran como sin datos.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead className="sr-only">
                <tr>
                  <th>Componente y estado actual</th>
                  <th>Estados diarios</th>
                  <th>Disponibilidad observada</th>
                </tr>
              </thead>
              <tbody>
                {history.components.map((component) => (
                  <HistoryRow key={component.key} component={component} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </section>
  );
}

function HistoryRow({
  component
}: {
  component: PlatformObservabilityHistory["components"][number];
}) {
  const current = statusPresentation[component.currentStatus];
  const CurrentIcon = current.icon;

  return (
    <tr className="border-b border-border/50 last:border-b-0">
      <th scope="row" className="w-[220px] px-5 py-5 text-left font-normal">
        <div className="flex items-center gap-3">
          <CurrentIcon className={`size-5 shrink-0 ${current.iconClass}`} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">{component.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {current.label}
              {component.currentLatencyMs === null ? "" : ` · ${component.currentLatencyMs} ms`}
            </p>
          </div>
        </div>
      </th>
      <td className="px-2 py-5">
        <TooltipProvider delayDuration={100}>
          <div
            className="flex min-w-max gap-1"
            aria-label={`Historial diario de ${component.name}`}
          >
            {component.days.map((day) => {
              const presentation = statusPresentation[day.status];
              const description = `${formatDay(day.date)}: ${presentation.label}, ${formatUptime(day.uptimePercent)}, ${formatSamples(day.samples)}`;
              return (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`size-5 rounded-[3px] ring-offset-background transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${presentation.cell}`}
                      aria-label={description}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="grid gap-0.5">
                    <p className="font-medium">{formatDay(day.date)}</p>
                    <p>{presentation.label}</p>
                    <p>{formatUptime(day.uptimePercent)}</p>
                    <p>{formatSamples(day.samples)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </td>
      <td className="w-[170px] px-5 py-5 text-right">
        <p className="font-semibold tabular-nums text-foreground">
          {component.uptimePercent === null ? "—" : `${component.uptimePercent}% uptime`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">30 días observados</p>
      </td>
    </tr>
  );
}

function HistoryLegend() {
  return (
    <div
      className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
      aria-label="Leyenda"
    >
      {(Object.keys(statusPresentation) as PlatformObservabilityHistoryStatus[]).map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-[2px] ${statusPresentation[status].cell}`} />
          {statusPresentation[status].label}
        </span>
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <Card className="overflow-hidden" role="status" aria-label="Cargando historial">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-5 border-b p-5 last:border-b-0">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-5 min-w-[620px] flex-1" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </Card>
  );
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

function formatUptime(value: number | null) {
  return value === null ? "Disponibilidad: sin datos" : `Disponibilidad: ${value}%`;
}

function formatSamples(value: number) {
  return `${value} ${value === 1 ? "muestra" : "muestras"}`;
}
