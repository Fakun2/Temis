import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Network,
  Server,
  ServerCog,
  Timer,
  TriangleAlert,
  Workflow,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  PlatformObservabilityHistory,
  PlatformObservabilitySummary
} from "../../_api/platform.api";
import { ObservabilityHistoryTable } from "./observability-history-table";

type ServiceStatus = "healthy" | "degraded" | "unavailable";
type MetricDefinition = {
  icon: LucideIcon;
  label: string;
  value: number | string | null | undefined;
};

const statusLabels: Record<ServiceStatus, string> = {
  healthy: "Operativo",
  degraded: "Degradado",
  unavailable: "No disponible"
};
const serviceIcons: Record<string, LucideIcon> = {
  API: Server,
  PostgreSQL: Database,
  RabbitMQ: Workflow,
  Redis: HardDrive,
  Worker: Cpu
};

export function ObservabilityStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <Badge
      className="h-5 whitespace-nowrap px-1.5 text-[10px] font-medium"
      variant={status === "healthy" ? "default" : "secondary"}
    >
      {statusLabels[status]}
    </Badge>
  );
}

export function ObservabilityOverview({
  history,
  historyError,
  historyLoading,
  onRetryHistory,
  summary
}: {
  history?: PlatformObservabilityHistory;
  historyError: boolean;
  historyLoading: boolean;
  onRetryHistory: () => void;
  summary: PlatformObservabilitySummary;
}) {
  const checks = summary.checks;
  const requestMetrics: MetricDefinition[] = [
    {
      icon: Activity,
      label: "Servidas",
      value: formatPercent(summary?.requests?.servedRate)
    },
    {
      icon: TriangleAlert,
      label: "Error rate 5xx",
      value: formatPercent(summary?.requests?.errorRate)
    }
  ];
  const outboxMetrics: MetricDefinition[] = [
    { icon: Activity, label: "Pendientes", value: summary?.outbox.pending },
    { icon: TriangleAlert, label: "Fallidos", value: summary?.outbox.failed }
  ];
  const secondaryMetrics: MetricDefinition[] = [
    { icon: Timer, label: "Latencia media", value: formatMs(summary?.requests?.averageLatencyMs) },
    { icon: Timer, label: "p95", value: formatMs(summary?.requests?.p95LatencyMs) },
    { icon: Activity, label: "Requests", value: summary?.requests?.total ?? "Sin datos" },
    { icon: Timer, label: "Más antiguo", value: formatDate(summary?.outbox.oldestPendingAt) },
    {
      icon: TriangleAlert,
      label: "4xx cliente",
      value: formatPercent(summary?.requests?.clientErrorRate)
    }
  ];

  return (
    <div className="grid gap-10">
      <section className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Estado de los servicios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Disponibilidad y latencia de los servicios de plataforma.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <ServiceCheck key={check.name} {...check} />
          ))}
        </div>
        {checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay servicios disponibles para mostrar.
          </p>
        ) : null}
      </section>
      <div className="grid gap-10 xl:grid-cols-10 xl:gap-x-4 xl:gap-y-5">
        <MetricsSection
          icon={Zap}
          metrics={requestMetrics}
          placement="requests"
          title={`Requests · últimos ${summary?.requests?.windowMinutes ?? 15} min`}
        />
        <MetricsSection
          icon={ServerCog}
          metrics={outboxMetrics}
          placement="outbox"
          title="Cola de eventos"
        />
      </div>
      <section aria-label="Métricas operativas secundarias">
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-10">
          {secondaryMetrics.map((metric) => (
            <ObservabilityMetric className="xl:col-span-2" key={metric.label} {...metric} />
          ))}
        </div>
      </section>
      <ObservabilityHistoryTable
        history={history}
        isError={historyError}
        isLoading={historyLoading}
        onRetry={onRetryHistory}
      />
    </div>
  );
}

function ServiceCheck({ latencyMs, name, status }: PlatformObservabilitySummary["checks"][number]) {
  const Icon = serviceIcons[name] ?? Network;
  return (
    <Card className="relative min-h-[94px] rounded-xl border-border/55 bg-card px-4 py-4 shadow-[0_1px_7px_rgba(15,23,42,0.04)] dark:bg-transparent">
      <div className="flex min-w-0 items-start gap-3 pr-24">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-btn-primary/10 text-btn-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground/85">{name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latencyMs === null ? "Sin datos de latencia" : `${latencyMs} ms`}
          </p>
        </div>
      </div>
      <div className="absolute right-3 top-3">
        <ObservabilityStatusBadge status={status} />
      </div>
    </Card>
  );
}

function MetricsSection({
  icon: Icon,
  metrics,
  placement,
  title
}: {
  icon: LucideIcon;
  metrics: MetricDefinition[];
  placement: "requests" | "outbox";
  title: string;
}) {
  const headerPlacement =
    placement === "requests"
      ? "xl:col-span-5 xl:col-start-1 xl:row-start-1"
      : "xl:col-span-5 xl:col-start-6 xl:row-start-1";
  const cardPlacements =
    placement === "requests"
      ? [
          "xl:col-span-2 xl:col-start-2 xl:row-start-2",
          "xl:col-span-2 xl:col-start-4 xl:row-start-2"
        ]
      : [
          "xl:col-span-2 xl:col-start-6 xl:row-start-2",
          "xl:col-span-2 xl:col-start-8 xl:row-start-2"
        ];

  return (
    <section className="grid min-w-0 gap-5 xl:contents">
      <div
        className={cn("flex items-center gap-2 border-b border-border/50 pb-4", headerPlacement)}
      >
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:contents">
        {metrics.map((metric, index) => (
          <ObservabilityMetric className={cardPlacements[index]} key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  );
}

function ObservabilityMetric({
  className,
  icon: Icon,
  label,
  value
}: MetricDefinition & { className?: string }) {
  return (
    <Card
      className={cn(
        "relative flex h-[94px] w-full justify-center rounded-xl border-border/55 bg-card px-4 py-4 shadow-[0_1px_7px_rgba(15,23,42,0.04)] dark:bg-transparent",
        className
      )}
    >
      <CardContent className="flex min-w-0 items-center gap-3 p-0">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-btn-primary/10 text-btn-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground/85">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">
            {value ?? "Sin datos"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("es-AR") : "Sin datos";
}
function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "Sin datos" : `${value}%`;
}
function formatMs(value: number | null | undefined) {
  return value === null || value === undefined ? "Sin datos" : `${value} ms`;
}
