import type { PlatformAnnouncementsQuery } from "../_api/announcements.api";

export type AnnouncementSearchParams = Record<string, string | string[] | undefined>;

export function parseAnnouncementQuery(params: AnnouncementSearchParams) {
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;
  const activity = value("activity");
  const audience = value("audience");
  const category = value("category");
  const severity = value("severity");
  const status = value("status");
  const cursorStack = (value("cursorStack") ?? "").split(",").filter(Boolean);
  return {
    cursorStack,
    query: {
      activity: activity === "active" || activity === "inactive" ? activity : undefined,
      audience:
        audience === "all_tenants" || audience === "selected_tenants" ? audience : undefined,
      category: ["general", "maintenance", "deployment", "incident"].includes(category ?? "")
        ? (category as PlatformAnnouncementsQuery["category"])
        : undefined,
      cursor: cursorStack.at(-1),
      limit: 20,
      search: value("search")?.trim() || undefined,
      severity: ["info", "warning", "critical"].includes(severity ?? "")
        ? (severity as PlatformAnnouncementsQuery["severity"])
        : undefined,
      status: ["draft", "published", "cancelled"].includes(status ?? "")
        ? (status as PlatformAnnouncementsQuery["status"])
        : undefined
    } satisfies PlatformAnnouncementsQuery
  };
}

export function hasAnnouncementFilters(query: PlatformAnnouncementsQuery) {
  return Boolean(
    query.activity ||
    query.audience ||
    query.category ||
    query.search ||
    query.severity ||
    query.status
  );
}
