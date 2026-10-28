import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformNewslettersService } from "../src/platform/platform-newsletters.service";
import { NewslettersService } from "../src/announcements/newsletters.service";

describe("newsletter administration", () => {
  it("uses a seek cursor independent of the last record and returns global metrics", async () => {
    const date = new Date("2026-10-27T12:00:00.123Z");
    const rows = Array.from({ length: 21 }, (_, i) => ({
      id: `00000000-0000-0000-0000-${String(99 - i).padStart(12, "0")}`,
      createdAt: date,
      cursorCreatedAt: "2026-10-27T12:00:00.123456Z"
    }));
    const queries: any[] = [];
    const prisma = {
      $queryRaw: async (query: unknown) => {
        queries.push(query);
        return rows;
      },
      platformAnnouncement: { count: async () => 7 }
    };
    const service = new PlatformNewslettersService(prisma as never, {} as never);
    const first = await service.list(undefined, "active");
    assert.equal(first.items.length, 20);
    assert.deepEqual(first.metrics, { total: 7, active: 7, inactive: 7, scheduled: 7 });
    assert.ok(first.nextCursor);
    await service.list(first.nextCursor!, "active");
    assert.ok(queries[1].values.includes("2026-10-27T12:00:00.123456Z"));
    assert.ok(queries[1].values.includes(rows[19]!.id));
    assert.ok(!queries[0].sql.includes("content"));
    const legacyCursor = Buffer.from(
      JSON.stringify({ createdAt: date.toISOString(), id: rows[19]!.id, filter: "active" })
    ).toString("base64url");
    await service.list(legacyCursor, "active");
    assert.ok(queries[2].values.includes(date.toISOString()));
    const malformedDate = Buffer.from(
      JSON.stringify({
        createdAt: "2026-02-30T12:00:00.123456Z",
        id: rows[19]!.id,
        filter: "active"
      })
    ).toString("base64url");
    await assert.rejects(() => service.list(malformedDate, "active"));
    await assert.rejects(() => service.list(first.nextCursor!, "inactive"));
    await assert.rejects(() => service.list("invalid", "all"));
  });
  it("hides deleted newsletters from tenant reads", async () => {
    let query: any;
    const service = new NewslettersService(
      {
        platformAnnouncement: {
          findMany: async (value: unknown) => {
            query = value;
            return [];
          }
        }
      } as never,
      {} as never
    );
    await service.list("tenant", "user");
    assert.equal(query.where.deletedAt, null);
  });
  it("records soft deletion in the same transaction", async () => {
    let update: any, event: any;
    const item = { id: "id", revision: 2, status: "published" };
    const tx = {
      platformAnnouncement: {
        updateMany: async (value: unknown) => {
          update = value;
          return { count: 1 };
        }
      },
      platformAnnouncementEvent: {
        create: async (value: unknown) => {
          event = value;
        }
      }
    };
    const prisma = {
      platformAnnouncement: { findFirst: async () => item },
      $transaction: async (fn: (tx: unknown) => unknown) => fn(tx)
    };
    const service = new PlatformNewslettersService(prisma as never, {} as never);
    await service.remove("id", "actor");
    assert.equal(update.where.deletedAt, null);
    assert.ok(update.data.deletedAt instanceof Date);
    assert.equal(event.data.action, "deleted");
    assert.equal(event.data.actorUserId, "actor");
  });
});
