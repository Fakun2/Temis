import { dashboardHttpClient } from "@/lib/http";

export type GoogleCalendarStatus = {
  activeEventCount: number;
  calendarName: string | null;
  connected: boolean;
  googleEmail: string | null;
  lastError: string | null;
  lastSyncAt: string | null;
  syncLeaseExpiresAt: string | null;
  canRetry: boolean;
  requiresReauthorization: boolean;
  status: "provisioning" | "connected" | "sync_requested" | "syncing" | "reauthorization_required" | "disconnecting" | "disconnected" | "error" | null;
  syncMode: "global" | "custom";
  syncSources: GoogleCalendarSyncSource[];
};

export type GoogleCalendarSyncSource = "all_hearings" | "my_tasks" | "my_area_tasks" | "participating_hearings" | "all_tasks";
export type GoogleCalendarSyncPreferences = { syncMode: "global" | "custom"; syncSources: GoogleCalendarSyncSource[] };

export const googleCalendarKeys = {
  all: ["account", "google-calendar"] as const,
  status: () => [...googleCalendarKeys.all, "status"] as const
};

export function getGoogleCalendarStatus() {
  return dashboardHttpClient.request<GoogleCalendarStatus>({ path: "/integrations/google-calendar/status" });
}

export function startGoogleCalendarOAuth(input: GoogleCalendarSyncPreferences) {
  return dashboardHttpClient.request<{ authorizationUrl: string }>({
    body: input,
    method: "POST",
    path: "/integrations/google-calendar/connect"
  });
}

export function updateGoogleCalendarPreferences(input: GoogleCalendarSyncPreferences) {
  return dashboardHttpClient.request<{ status: "accepted" }>({ body: input, method: "PATCH", path: "/integrations/google-calendar/preferences" });
}

export function syncGoogleCalendar() {
  return dashboardHttpClient.request<{ status: "accepted" }>({
    method: "POST",
    path: "/integrations/google-calendar/sync"
  });
}

export function disconnectGoogleCalendar() {
  return dashboardHttpClient.request<{ status: "accepted" }>({
    method: "DELETE",
    path: "/integrations/google-calendar/disconnect"
  });
}
