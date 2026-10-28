export const platformObservabilityHistoryDays = 30;
export const platformObservabilityRetentionDays = 90;
export const platformObservabilitySampleIntervalMs = 5 * 60_000;
export const platformObservabilityTimeZone = "America/Argentina/Buenos_Aires";

export const platformHealthComponents = [
  { key: "api", name: "API" },
  { key: "postgresql", name: "PostgreSQL" },
  { key: "redis", name: "Redis" },
  { key: "rabbitmq", name: "RabbitMQ" },
  { key: "worker", name: "Worker" }
] as const;

export type PlatformHealthComponentKey = (typeof platformHealthComponents)[number]["key"];
export type PlatformHealthStatus = "healthy" | "degraded" | "unavailable";
export type PlatformHealthHistoryStatus = PlatformHealthStatus | "no_data";

export type AggregatedPlatformHealthSample = {
  component: PlatformHealthComponentKey;
  day: string;
  samples: number;
  status: PlatformHealthStatus;
};

type CurrentServiceCheck = {
  latencyMs: number | null;
  name: string;
  status: PlatformHealthStatus;
};

export function createPlatformObservabilityHistoryRange(now = new Date()) {
  const today = toDateKey(now);
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const todayUtc = Date.UTC(year, month - 1, day);
  const days = Array.from({ length: platformObservabilityHistoryDays }, (_, index) =>
    new Date(todayUtc - (platformObservabilityHistoryDays - index - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10)
  );
  const untilDay = new Date(todayUtc + 86_400_000).toISOString().slice(0, 10);

  return {
    days,
    from: days[0]!,
    fromInstant: new Date(`${days[0]}T00:00:00-03:00`),
    to: days.at(-1)!,
    untilInstant: new Date(`${untilDay}T00:00:00-03:00`)
  };
}

export function buildPlatformObservabilityHistory(
  rows: AggregatedPlatformHealthSample[],
  checks: CurrentServiceCheck[],
  now = new Date()
) {
  const range = createPlatformObservabilityHistoryRange(now);
  const currentByName = new Map(checks.map((check) => [check.name, check]));

  return {
    components: platformHealthComponents.map((component) => {
      const componentRows = rows.filter((row) => row.component === component.key);
      const totals = countStatuses(componentRows);
      const current = currentByName.get(component.name);

      return {
        currentLatencyMs: current?.latencyMs ?? null,
        currentStatus: current?.status ?? ("no_data" as const),
        days: range.days.map((date) => {
          const dailyRows = componentRows.filter((row) => row.day === date);
          const dailyTotals = countStatuses(dailyRows);
          return {
            date,
            samples: dailyTotals.total,
            status: worstStatus(dailyRows),
            uptimePercent: availabilityPercent(dailyTotals)
          };
        }),
        key: component.key,
        name: component.name,
        uptimePercent: availabilityPercent(totals)
      };
    }),
    days: platformObservabilityHistoryDays,
    from: range.from,
    generatedAt: now.toISOString(),
    timeZone: platformObservabilityTimeZone,
    to: range.to
  };
}

export function toPlatformObservabilitySampleBucket(now = new Date()) {
  return new Date(
    Math.floor(now.getTime() / platformObservabilitySampleIntervalMs) *
      platformObservabilitySampleIntervalMs
  );
}

function countStatuses(rows: AggregatedPlatformHealthSample[]) {
  return rows.reduce(
    (totals, row) => {
      totals.total += row.samples;
      if (row.status === "unavailable") totals.unavailable += row.samples;
      return totals;
    },
    { total: 0, unavailable: 0 }
  );
}

function availabilityPercent(totals: { total: number; unavailable: number }) {
  if (totals.total === 0) return null;
  return Math.round(((totals.total - totals.unavailable) / totals.total) * 10_000) / 100;
}

function worstStatus(rows: AggregatedPlatformHealthSample[]): PlatformHealthHistoryStatus {
  if (rows.some((row) => row.status === "unavailable" && row.samples > 0)) return "unavailable";
  if (rows.some((row) => row.status === "degraded" && row.samples > 0)) return "degraded";
  if (rows.some((row) => row.status === "healthy" && row.samples > 0)) return "healthy";
  return "no_data";
}

function toDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: platformObservabilityTimeZone,
    year: "numeric"
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
