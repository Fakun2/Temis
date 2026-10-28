import "server-only";

import { requestPlatformApiServer } from "@/lib/api/platform-server";
import type {
  PlatformAnnouncementsList,
  PlatformAnnouncementsQuery,
  PlatformAnnouncementsSummary
} from "./announcements.api";

export function listAnnouncementsServer(params: PlatformAnnouncementsQuery) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return requestPlatformApiServer<PlatformAnnouncementsList>(
    `/api/platform/announcements?${search.toString()}`
  );
}

export function getAnnouncementsSummaryServer() {
  return requestPlatformApiServer<PlatformAnnouncementsSummary>(
    "/api/platform/announcements/summary"
  );
}
