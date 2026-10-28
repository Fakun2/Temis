import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformAnnouncementsService } from "../src/platform/platform-announcements.service";

describe("PlatformAnnouncementsService", () => {
  it("returns complementary active and inactive metrics", async () => {
    const calls: unknown[] = [];
    const service = new PlatformAnnouncementsService({
      $transaction: async (queries: Promise<unknown>[]) => Promise.all(queries),
      platformAnnouncement: {
        count: async (input?: unknown) => {
          calls.push(input);
          return [12, 5, 4][calls.length - 1];
        }
      }
    } as never);

    const summary = await service.summary();

    assert.equal(summary.total, 12);
    assert.equal(summary.active, 5);
    assert.equal(summary.inactive, 7);
    assert.equal(summary.general, 4);
    assert.deepEqual(Object.keys((calls[1] as { where: object }).where).sort(), [
      "channel",
      "endsAt",
      "startsAt",
      "status"
    ]);
  });

  it("uses an opaque compound seek cursor and binds it to filters", async () => {
    const inputs: Array<Record<string, unknown>> = [];
    const row = {
      _count: { targets: 0 },
      audience: "all_tenants",
      body: "Mensaje",
      category: "general",
      createdAt: new Date("2026-10-23T12:00:00.000Z"),
      createdBy: { fullName: "Admin" },
      endsAt: new Date("2026-10-24T12:00:00.000Z"),
      id: "00000000-0000-0000-0000-000000000002",
      linkLabel: null,
      linkUrl: null,
      revision: 1,
      severity: "info",
      startsAt: new Date("2026-10-23T11:00:00.000Z"),
      status: "published",
      title: "Aviso",
      updatedAt: new Date("2026-10-23T12:00:00.000Z")
    };
    const service = new PlatformAnnouncementsService({
      platformAnnouncement: {
        findMany: async (input: Record<string, unknown>) => {
          inputs.push(input);
          return inputs.length === 1
            ? [row, { ...row, id: "00000000-0000-0000-0000-000000000001" }]
            : [];
        }
      }
    } as never);

    const first = await service.list({ category: "general", limit: 1 });
    await service.list({ category: "general", cursor: first.pageInfo.nextCursor!, limit: 1 });
    await assert.rejects(
      service.list({ category: "incident", cursor: first.pageInfo.nextCursor!, limit: 1 }),
      /cursor no corresponde/i
    );

    assert.equal("skip" in inputs[1]!, false);
    assert.match(JSON.stringify(inputs[1]!.where), /createdAt/);
    assert.match(JSON.stringify(inputs[1]!.where), /00000000-0000-0000-0000-000000000002/);
  });

  it("creates publish-now announcements and audit events atomically", async () => {
    let createdData: Record<string, unknown> | undefined;
    let eventData: unknown;
    const service = new PlatformAnnouncementsService({
      tenant: { count: async () => 1 },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          platformAnnouncement: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              createdData = data;
              return { id: "announcement-1" };
            }
          },
          platformAnnouncementEvent: {
            createMany: async ({ data }: { data: unknown }) => {
              eventData = data;
            }
          }
        })
    } as never);

    await service.create("actor-1", {
      audience: "selected_tenants",
      body: "Mensaje",
      category: "incident",
      deliveryMode: "publish_now",
      endsAt: "2099-01-01T00:00:00.000Z",
      severity: "critical",
      targetTenantIds: ["00000000-0000-0000-0000-000000000001"],
      title: "Incidente"
    });

    assert.equal(createdData?.status, "published");
    assert.ok(createdData?.startsAt instanceof Date);
    assert.equal(
      (eventData as Array<{ action: string }>).map((item) => item.action).join(","),
      "created,published"
    );
  });
});
