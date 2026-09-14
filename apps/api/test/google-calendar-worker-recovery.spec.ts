import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GoogleCalendarWorker } from "../../worker/src/google-calendar-worker";

describe("GoogleCalendarWorker stale synchronization recovery", () => {
  it("recreates an event instead of patching a previously deleted link", async () => {
    let patchCalls = 0;
    let insertCalls = 0;
    let savedLink: any;
    const prisma = {
      googleCalendarConnection: {
        findFirst: async () => ({
          calendarId: "calendar-id",
          id: "connection-id",
          status: "syncing",
          tenantId: "tenant-id",
          tenantMembershipId: "membership-id"
        }),
        update: async () => ({})
      },
      googleCalendarEventLink: {
        findUnique: async () => ({ googleEventId: "cancelled-event-id", id: "link-id", status: "deleted" }),
        upsert: async (input: unknown) => {
          savedLink = input;
          return {};
        }
      }
    };
    const worker = new GoogleCalendarWorker(prisma as never) as any;
    worker.buildEvent = async () => ({
      description: "description",
      end: { date: "2026-09-15" },
      extendedProperties: { private: {} },
      start: { date: "2026-09-14" },
      summary: "task"
    });
    worker.getToken = async () => ({ accessToken: "access-token" });
    worker.google = {
      insertEvent: async () => {
        insertCalls += 1;
        return { etag: "new-etag", id: "new-event-id" };
      },
      patchEvent: async () => {
        patchCalls += 1;
        return { id: "cancelled-event-id", status: "cancelled" };
      }
    };

    await worker.upsertEvent("tenant-id", "connection-id", "case_task", "task-id");

    assert.equal(patchCalls, 0);
    assert.equal(insertCalls, 1);
    assert.equal(savedLink.update.googleEventId, "new-event-id");
    assert.equal(savedLink.update.status, "active");
  });

  it("recreates an event when Google reports an active link as cancelled", async () => {
    let insertCalls = 0;
    const prisma = {
      googleCalendarConnection: {
        findFirst: async () => ({
          calendarId: "calendar-id",
          id: "connection-id",
          status: "syncing",
          tenantId: "tenant-id",
          tenantMembershipId: "membership-id"
        }),
        update: async () => ({})
      },
      googleCalendarEventLink: {
        findUnique: async () => ({ googleEventId: "cancelled-event-id", id: "link-id", status: "active" }),
        upsert: async () => ({})
      }
    };
    const worker = new GoogleCalendarWorker(prisma as never) as any;
    worker.buildEvent = async () => ({
      description: "description",
      end: { date: "2026-09-15" },
      extendedProperties: { private: {} },
      start: { date: "2026-09-14" },
      summary: "task"
    });
    worker.getToken = async () => ({ accessToken: "access-token" });
    worker.google = {
      insertEvent: async () => {
        insertCalls += 1;
        return { etag: "new-etag", id: "new-event-id" };
      },
      patchEvent: async () => ({ id: "cancelled-event-id", status: "cancelled" })
    };

    await worker.upsertEvent("tenant-id", "connection-id", "case_task", "task-id");

    assert.equal(insertCalls, 1);
  });

  it("reclaims an existing Temis calendar when reconnecting instead of leaving provisioning pending", async () => {
    const calls: any[] = [];
    const prisma = {
      googleCalendarConnection: {
        findFirst: async () => ({
          calendarId: "existing-calendar-id",
          encryptedAccessToken: "encrypted-access",
          encryptedRefreshToken: "encrypted-refresh",
          id: "connection-id",
          status: "provisioning",
          tenantId: "tenant-id"
        }),
        updateMany: async (value: unknown) => {
          calls.push(value);
          return { count: 1 };
        }
      },
      asyncOutboxEvent: { create: async () => ({}) }
    };
    const environment = {
      GOOGLE_CALENDAR_CLIENT_ID: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      GOOGLE_CALENDAR_CLIENT_SECRET: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      GOOGLE_CALENDAR_ENABLED: process.env.GOOGLE_CALENDAR_ENABLED,
      GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY
    };
    process.env.GOOGLE_CALENDAR_ENABLED = "true";
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "test-client";
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "test-secret";
    process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY = "test-encryption-key";

    try {
      const worker = new GoogleCalendarWorker(prisma as never) as any;
      worker.getToken = async () => ({ accessToken: "access-token" });
      worker.google = { renameCalendar: async () => ({}) };
      await worker.provision("tenant-id", "connection-id");
    } finally {
      for (const [name, value] of Object.entries(environment)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }

    assert.equal(calls[0].where.calendarId, undefined);
    assert.equal(calls[0].data.status, "syncing");
    assert.equal(calls[0].data.syncLeaseToken.length > 0, true);
    assert.equal(calls[1].where.syncLeaseToken, calls[0].data.syncLeaseToken);
    assert.equal(calls[1].data.status, "connected");
    assert.equal(calls[1].data.syncLeaseToken, null);
  });

  it("marks syncing connections without a lease as retryable errors", async () => {
    let input: any;
    const prisma = {
      googleCalendarConnection: {
        updateMany: async (value: unknown) => {
          input = value;
          return { count: 1 };
        }
      }
    };
    const previousEnabled = process.env.GOOGLE_CALENDAR_ENABLED;
    process.env.GOOGLE_CALENDAR_ENABLED = "false";

    try {
      const worker = new GoogleCalendarWorker(prisma as never);
      assert.equal(await worker.recoverStaleSynchronizations(), 1);
    } finally {
      if (previousEnabled === undefined) delete process.env.GOOGLE_CALENDAR_ENABLED;
      else process.env.GOOGLE_CALENDAR_ENABLED = previousEnabled;
    }

    assert.equal(input.data.status, "error");
    assert.equal(input.data.syncLeaseToken, null);
    assert.equal(input.data.syncLeaseExpiresAt, null);
    assert.equal(input.where.OR[0].status, "syncing");
    assert.equal(input.where.OR[1].status, "sync_requested");
    assert.equal(input.where.OR[2].status, "provisioning");
  });

  it("allows an initial sync to skip an undated task while holding a syncing lease", async () => {
    const prisma = {
      googleCalendarConnection: {
        findFirst: async () => ({
          id: "connection-id",
          tenantId: "tenant-id",
          status: "syncing",
          calendarId: "calendar-id",
          encryptedAccessToken: ""
        })
      },
      googleCalendarEventLink: {
        findUnique: async () => null
      }
    };
    const previousEnabled = process.env.GOOGLE_CALENDAR_ENABLED;
    process.env.GOOGLE_CALENDAR_ENABLED = "false";

    try {
      const worker = new GoogleCalendarWorker(prisma as never);
      await (worker as any).deleteEvent("tenant-id", "connection-id", "case_task", "task-id");
    } finally {
      if (previousEnabled === undefined) delete process.env.GOOGLE_CALENDAR_ENABLED;
      else process.env.GOOGLE_CALENDAR_ENABLED = previousEnabled;
    }
  });
});
