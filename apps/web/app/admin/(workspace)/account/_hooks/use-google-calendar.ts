"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getActiveTenantAccess } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/use-session";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  googleCalendarKeys,
  startGoogleCalendarOAuth,
  syncGoogleCalendar,
  updateGoogleCalendarPreferences,
  type GoogleCalendarStatus,
  type GoogleCalendarSyncPreferences
} from "../_api/google-calendar.api";

const permission = "integrations:google_calendar_read";
const managePermission = "integrations:google_calendar_manage";

export function useGoogleCalendarStatusQuery() {
  return useDashboardQuery({
    permission,
    queryKey: googleCalendarKeys.status(),
    queryFn: getGoogleCalendarStatus,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "provisioning" || status === "sync_requested" || status === "syncing" || status === "disconnecting" ? 2000 : false;
    }
  });
}

export function useGoogleCalendarConnectMutation() {
  return useDashboardMutation({
    permission: managePermission,
    mutationFn: (input: GoogleCalendarSyncPreferences) => startGoogleCalendarOAuth(input),
    onSuccess: ({ authorizationUrl }) => { window.location.assign(authorizationUrl); }
  });
}

export function useGoogleCalendarPreferencesMutation() {
  const queryClient = useQueryClient();
  const statusQueryKey = useGoogleCalendarStatusQueryKey();
  return useDashboardMutation({
    permission: managePermission,
    mutationFn: updateGoogleCalendarPreferences,
    onSuccess: () => {
      // The API has persisted sync_requested before returning 202. Reflect it
      // immediately so the UI cannot enqueue a redundant manual sync while the
      // worker is picking up the configuration change.
      queryClient.setQueryData<GoogleCalendarStatus>(statusQueryKey, (current) =>
        current
          ? {
              ...current,
              lastError: null,
              status: "sync_requested",
              syncLeaseExpiresAt: null
            }
          : current
      );
      return queryClient.invalidateQueries({ queryKey: statusQueryKey });
    }
  });
}

export function useGoogleCalendarSyncMutation() {
  const queryClient = useQueryClient();
  const statusQueryKey = useGoogleCalendarStatusQueryKey();
  return useDashboardMutation({
    permission: managePermission,
    mutationFn: syncGoogleCalendar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: statusQueryKey })
  });
}

export function useGoogleCalendarDisconnectMutation() {
  const queryClient = useQueryClient();
  const statusQueryKey = useGoogleCalendarStatusQueryKey();
  return useDashboardMutation({
    permission: managePermission,
    mutationFn: disconnectGoogleCalendar,
    onSuccess: () => {
      queryClient.setQueryData<GoogleCalendarStatus>(statusQueryKey, (current) =>
        current
          ? {
              ...current,
              activeEventCount: 0,
              calendarName: null,
              connected: false,
              lastError: null,
              status: "disconnected"
            }
          : current
      );
      void queryClient.invalidateQueries({ queryKey: statusQueryKey, refetchType: "none" });
    }
  });
}

function useGoogleCalendarStatusQueryKey() {
  const session = useSession();
  const tenantId = getActiveTenantAccess(session)?.tenantId;
  return tenantId ? [tenantId, ...googleCalendarKeys.status()] : googleCalendarKeys.status();
}
