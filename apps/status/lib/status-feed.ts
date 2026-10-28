import { z } from "zod";
import {
  publicComponentOrder,
  type IncidentStage,
  type PublicStatus,
  type StatusComponent,
  type StatusDay,
  type StatusIncident,
  type StatusMaintenance,
  type StatusSnapshot
} from "./status.types";

const recordSchema = z.record(z.string(), z.unknown());
const feedSchema = z
  .object({
    maintenances: z.array(recordSchema).optional(),
    monitors: z.array(recordSchema).optional(),
    pageComponents: z.array(recordSchema).optional(),
    statusReports: z.array(recordSchema).optional()
  })
  .passthrough();

const statusRank: Record<PublicStatus, number> = {
  unknown: 0,
  operational: 1,
  maintenance: 2,
  degraded: 3,
  partial_outage: 4,
  major_outage: 5
};

export function parseOpenStatusFeed(input: unknown, now = new Date()): StatusSnapshot {
  const feed = feedSchema.parse(input);
  const components = ensurePublicComponents(parseComponents(feed, now), now);
  const incidents = readRecordArray(feed, ["statusReports", "status_reports", "reports"])
    .map((report, index) => parseIncident(report, components, index, now))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  const maintenances = readRecordArray(feed, ["maintenances", "maintenanceWindows"])
    .map((maintenance, index) => parseMaintenance(maintenance, components, index, now))
    .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt));

  const activeIncidentStatuses = incidents
    .filter((incident) => incident.status !== "resolved")
    .map((incident) => incident.impact);
  const activeMaintenance = maintenances.some(
    (maintenance) =>
      Date.parse(maintenance.startsAt) <= now.getTime() &&
      Date.parse(maintenance.endsAt) > now.getTime()
  );
  const candidates = [
    ...components.map((component) => component.status),
    ...activeIncidentStatuses,
    ...(activeMaintenance ? (["maintenance"] as const) : [])
  ];

  return {
    components: sortPublicComponents(components),
    generatedAt: readDate(feed, ["updatedAt", "updated_at", "generatedAt"]) ?? now.toISOString(),
    incidents,
    maintenances,
    overallStatus: worstStatus(candidates)
  };
}

export function createUnknownSnapshot(now = new Date()): StatusSnapshot {
  return {
    components: publicComponentOrder.map((name) => ({
      days: createEmptyDays(now),
      id: slugify(name),
      name,
      status: "unknown",
      uptimePercent: null
    })),
    generatedAt: now.toISOString(),
    incidents: [],
    maintenances: [],
    overallStatus: "unknown"
  };
}

export async function getStatusSnapshot(): Promise<StatusSnapshot> {
  const feedUrl = process.env.OPENSTATUS_FEED_URL?.trim();
  if (!feedUrl) return createUnknownSnapshot();

  const requestInit = {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }
  } as RequestInit & { next: { revalidate: number } };
  const response = await fetch(feedUrl, requestInit);
  if (!response.ok) throw new Error(`OpenStatus feed returned ${response.status}.`);
  return parseOpenStatusFeed(await response.json());
}

export function worstStatus(statuses: PublicStatus[]): PublicStatus {
  if (statuses.length === 0) return "unknown";
  return statuses.reduce((worst, status) =>
    statusRank[status] > statusRank[worst] ? status : worst
  );
}

function parseComponents(feed: Record<string, unknown>, now: Date): StatusComponent[] {
  const rawComponents = readRecordArray(feed, ["pageComponents", "page_components", "components"]);
  const source = rawComponents.length > 0 ? rawComponents : readRecordArray(feed, ["monitors"]);
  return source.map((component, index) => {
    const monitors = readRecordArray(component, ["monitors"]);
    const currentStatuses = [
      mapPublicStatus(readString(component, ["status", "currentStatus", "current_status"])),
      ...monitors.map((monitor) =>
        mapPublicStatus(readString(monitor, ["status", "currentStatus"]))
      )
    ];
    const days = parseDays(component, monitors[0], now);
    const uptime =
      readNumber(component, ["uptime", "uptimePercent", "uptime_percent"]) ??
      readNumber(monitors[0], ["uptime", "uptimePercent", "uptime_percent"]) ??
      averageUptime(days);
    const name = readString(component, ["name", "title"]) ?? `Servicio ${index + 1}`;
    return {
      days,
      id: readIdentifier(component) ?? slugify(name),
      name,
      status: worstStatus(currentStatuses),
      uptimePercent: normalizePercent(uptime)
    };
  });
}

function parseIncident(
  report: Record<string, unknown>,
  components: StatusComponent[],
  index: number,
  now: Date
): StatusIncident {
  const rawUpdates = readRecordArray(report, [
    "updates",
    "statusReportUpdates",
    "status_report_updates"
  ]);
  const fallbackDate =
    readDate(report, ["updatedAt", "updated_at", "createdAt", "created_at", "date"]) ??
    now.toISOString();
  const updates = (rawUpdates.length > 0 ? rawUpdates : [report])
    .map((update, updateIndex) => ({
      id: readIdentifier(update) ?? `${readIdentifier(report) ?? index}-update-${updateIndex}`,
      message:
        readString(update, ["message", "description", "body"]) ?? "Sin detalles adicionales.",
      publishedAt:
        readDate(update, ["publishedAt", "published_at", "createdAt", "created_at", "date"]) ??
        fallbackDate,
      status: mapIncidentStage(readString(update, ["status", "state"]))
    }))
    .sort((left, right) => Date.parse(left.publishedAt) - Date.parse(right.publishedAt));
  const latest = updates.at(-1)!;
  const componentRefs = readArray(report, [
    "pageComponents",
    "page_components",
    "components",
    "componentIds",
    "component_ids"
  ]);
  const componentIds = componentRefs
    .map(readReferenceId)
    .filter((value): value is string => Boolean(value));
  const componentNames = componentRefs
    .map(readReferenceName)
    .filter((value): value is string => Boolean(value));
  for (const id of componentIds) {
    const match = components.find((component) => component.id === id);
    if (match && !componentNames.includes(match.name)) componentNames.push(match.name);
  }
  const status = latest.status;
  return {
    componentIds,
    componentNames,
    id: readIdentifier(report) ?? `incident-${index}`,
    impact:
      status === "resolved"
        ? "operational"
        : mapPublicStatus(
            readString(report, ["impact", "severity", "componentStatus", "component_status"]),
            "degraded"
          ),
    resolvedAt:
      status === "resolved" ? latest.publishedAt : readDate(report, ["resolvedAt", "resolved_at"]),
    startedAt:
      readDate(report, ["startedAt", "started_at", "createdAt", "created_at", "date"]) ??
      updates[0]!.publishedAt,
    status,
    title: readString(report, ["title", "name"]) ?? "Incidente de servicio",
    updatedAt: latest.publishedAt,
    updates
  };
}

function parseMaintenance(
  maintenance: Record<string, unknown>,
  components: StatusComponent[],
  index: number,
  now: Date
): StatusMaintenance {
  const references = readArray(maintenance, ["pageComponents", "page_components", "components"]);
  const componentNames = references
    .map(readReferenceName)
    .filter((value): value is string => Boolean(value));
  for (const id of references
    .map(readReferenceId)
    .filter((value): value is string => Boolean(value))) {
    const match = components.find((component) => component.id === id);
    if (match && !componentNames.includes(match.name)) componentNames.push(match.name);
  }
  const startsAt =
    readDate(maintenance, ["startsAt", "starts_at", "from", "startDate", "start_date"]) ??
    now.toISOString();
  return {
    componentNames,
    endsAt: readDate(maintenance, ["endsAt", "ends_at", "to", "endDate", "end_date"]) ?? startsAt,
    id: readIdentifier(maintenance) ?? `maintenance-${index}`,
    message:
      readString(maintenance, ["message", "description", "body"]) ?? "Mantenimiento programado.",
    startsAt,
    title: readString(maintenance, ["title", "name"]) ?? "Mantenimiento programado"
  };
}

function parseDays(
  component: Record<string, unknown>,
  monitor: Record<string, unknown> | undefined,
  now: Date
) {
  const values = [
    ...readRecordArray(component, ["days", "history", "daily", "tracker"]),
    ...readRecordArray(monitor, ["days", "history", "daily", "summary"])
  ];
  const byDate = new Map<string, StatusDay>();
  for (const value of values) {
    const date = readDate(value, ["date", "day", "timestamp"]);
    if (!date) continue;
    const key = date.slice(0, 10);
    byDate.set(key, {
      date: key,
      status: mapPublicStatus(readString(value, ["status", "state"])),
      uptimePercent: normalizePercent(
        readNumber(value, ["uptime", "uptimePercent", "uptime_percent"])
      )
    });
  }
  return createEmptyDays(now).map((day) => byDate.get(day.date) ?? day);
}

function createEmptyDays(now: Date): StatusDay[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: 30 }, (_, index) => ({
    date: new Date(end - (29 - index) * 86_400_000).toISOString().slice(0, 10),
    status: "unknown" as const,
    uptimePercent: null
  }));
}

function sortPublicComponents(components: StatusComponent[]) {
  return [...components].sort((left, right) => {
    const leftIndex = publicComponentOrder.indexOf(
      left.name as (typeof publicComponentOrder)[number]
    );
    const rightIndex = publicComponentOrder.indexOf(
      right.name as (typeof publicComponentOrder)[number]
    );
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });
}

function ensurePublicComponents(components: StatusComponent[], now: Date) {
  return publicComponentOrder.map((name) => {
    const normalizedName = normalizeName(name);
    return (
      components.find((component) => normalizeName(component.name) === normalizedName) ?? {
        days: createEmptyDays(now),
        id: slugify(name),
        name,
        status: "unknown" as const,
        uptimePercent: null
      }
    );
  });
}

function mapPublicStatus(
  value: string | undefined,
  fallback: PublicStatus = "unknown"
): PublicStatus {
  const normalized = value?.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (["operational", "healthy", "up", "success", "active", "resolved"].includes(normalized ?? ""))
    return "operational";
  if (["degraded", "degraded_performance", "warning"].includes(normalized ?? "")) return "degraded";
  if (["partial_outage", "partial", "minor"].includes(normalized ?? "")) return "partial_outage";
  if (["major_outage", "unavailable", "down", "error", "critical"].includes(normalized ?? ""))
    return "major_outage";
  if (["maintenance", "under_maintenance", "scheduled"].includes(normalized ?? ""))
    return "maintenance";
  return fallback;
}

function mapIncidentStage(value: string | undefined): IncidentStage {
  const normalized = value?.toLowerCase().replaceAll("-", "_");
  if (normalized === "identified") return "identified";
  if (normalized === "monitoring") return "monitoring";
  if (normalized === "resolved") return "resolved";
  return "investigating";
}

function readRecordArray(value: Record<string, unknown> | undefined, keys: string[]) {
  return readArray(value, keys).filter(
    (item): item is Record<string, unknown> => recordSchema.safeParse(item).success
  );
}

function readArray(value: Record<string, unknown> | undefined, keys: string[]): unknown[] {
  if (!value) return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  return [];
}

function readString(value: Record<string, unknown> | undefined, keys: string[]) {
  if (!value) return undefined;
  for (const key of keys)
    if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
  return undefined;
}

function readNumber(value: Record<string, unknown> | undefined, keys: string[]) {
  if (!value) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && candidate.trim() && Number.isFinite(Number(candidate)))
      return Number(candidate);
  }
  return null;
}

function readDate(value: Record<string, unknown> | undefined, keys: string[]) {
  const candidate = readString(value, keys);
  if (!candidate || Number.isNaN(Date.parse(candidate))) return null;
  return new Date(candidate).toISOString();
}

function readIdentifier(value: Record<string, unknown>) {
  const identifier = value.id ?? value.slug;
  return typeof identifier === "string" || typeof identifier === "number"
    ? String(identifier)
    : undefined;
}

function readReferenceId(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return recordSchema.safeParse(value).success
    ? readIdentifier(value as Record<string, unknown>)
    : undefined;
}

function readReferenceName(value: unknown) {
  return recordSchema.safeParse(value).success
    ? readString(value as Record<string, unknown>, ["name", "title"])
    : undefined;
}

function averageUptime(days: StatusDay[]) {
  const known = days.flatMap((day) => (day.uptimePercent === null ? [] : [day.uptimePercent]));
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0) / known.length;
}

function normalizePercent(value: number | null) {
  if (value === null) return null;
  const percent = value <= 1 ? value * 100 : value;
  return Math.round(Math.min(100, Math.max(0, percent)) * 100) / 100;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
