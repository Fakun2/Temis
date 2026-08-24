import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { NotificationsService } from "../src/notifications/notifications.service";
import type { PrismaService } from "../src/database/prisma.service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const caseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const actorUserId = "99999999-9999-4999-8999-999999999999";
const actorMembershipId = "22222222-2222-4222-8222-222222222222";
const otherMembershipId = "33333333-3333-4333-8333-333333333333";
const reminderId = "44444444-4444-4444-8444-444444444444";
const resourceId = "55555555-5555-4555-8555-555555555555";

describe("NotificationsService", () => {
  it("schedules a self reminder with one expanded recipient", async () => {
    const { outbox, prisma } = makePrisma();
    const service = new NotificationsService(prisma, outbox);

    await service.scheduleForResource({
      actorUserId,
      caseId,
      resourceId,
      resourceType: "case_task",
      settings: {
        notificationDate: "2099-08-21",
        notificationEnabled: true,
        notificationMembershipIds: [],
        notificationPracticeAreaId: undefined,
        notificationRecipientMode: "self",
        notificationTime: "09:30"
      },
      tenantId,
      title: "Tarea: Presentar escrito"
    });

    assert.equal(prisma.__upserts.length, 1);
    assert.equal(prisma.__createdRecipients.length, 1);
    assert.equal(prisma.__createdRecipients[0]?.recipientMembershipId, actorMembershipId);
    assert.equal(prisma.__upserts[0]?.create.nextRunAt.toISOString(), "2099-08-21T12:30:00.000Z");
    assert.equal(outbox.__events.length, 1);
  });

  it("rejects reminders scheduled in the past", async () => {
    const { outbox, prisma } = makePrisma();
    const service = new NotificationsService(prisma, outbox);

    await assert.rejects(
      () =>
        service.scheduleForResource({
          actorUserId,
          caseId,
          resourceId,
          resourceType: "case_task",
          settings: {
            notificationDate: "2000-01-01",
            notificationEnabled: true,
            notificationMembershipIds: [],
            notificationPracticeAreaId: undefined,
            notificationRecipientMode: "self",
            notificationTime: "09:30"
          },
          tenantId,
          title: "Tarea: Presentar escrito"
        }),
      BadRequestException
    );

    assert.equal(prisma.__upserts.length, 0);
  });

  it("rejects explicit member recipients outside the active tenant", async () => {
    const { outbox, prisma } = makePrisma({
      activeMembershipIds: [actorMembershipId]
    });
    const service = new NotificationsService(prisma, outbox);

    await assert.rejects(
      () =>
        service.scheduleForResource({
          actorUserId,
          caseId,
          resourceId,
          resourceType: "case_expense",
          settings: {
            notificationDate: "2099-08-21",
            notificationEnabled: true,
            notificationMembershipIds: [actorMembershipId, otherMembershipId],
            notificationPracticeAreaId: undefined,
            notificationRecipientMode: "members",
            notificationTime: "10:15"
          },
          tenantId,
          title: "Pago: Tasa judicial"
        }),
      BadRequestException
    );
  });

  it("marks due reminders and recipients as delivered", async () => {
    const { outbox, prisma } = makePrisma({
      claimedReminders: [{ id: reminderId, tenant_id: tenantId }]
    });
    const service = new NotificationsService(prisma, outbox);

    const result = await service.processDueReminders(50);

    assert.equal(result.processedCount, 1);
    assert.equal(prisma.__recipientUpdates.length, 1);
    assert.equal(prisma.__reminderUpdates.length, 1);
    assert.equal(prisma.__recipientUpdates[0]?.data.status, "delivered");
    assert.equal(prisma.__reminderUpdates[0]?.data.status, "delivered");
  });

  it("does not return delivered reminders as active settings", async () => {
    const { outbox, prisma } = makePrisma({
      reminderConfigs: [
        {
          practiceAreaId: null,
          recipientMode: "self",
          recipients: [{ recipientMembershipId: actorMembershipId }],
          resourceId,
          scheduledAt: new Date("2000-01-01T12:30:00.000Z"),
          status: "delivered"
        }
      ]
    });
    const service = new NotificationsService(prisma, outbox);

    const configs = await service.getReminderConfigs(tenantId, "case_task", [resourceId]);

    assert.equal(configs.has(resourceId), false);
    assert.deepEqual(prisma.__reminderFindManyWheres[0]?.status, {
      in: ["pending", "processing"]
    });
  });
});

function makePrisma({
  activeMembershipIds = [actorMembershipId, otherMembershipId],
  claimedReminders = [],
  reminderConfigs = []
}: {
  activeMembershipIds?: string[];
  claimedReminders?: Array<{ id: string; tenant_id: string }>;
  reminderConfigs?: Array<{
    practiceAreaId: string | null;
    recipientMode: "self" | "tenant" | "practice_area" | "members";
    recipients: Array<{ recipientMembershipId: string }>;
    resourceId: string;
    scheduledAt: Date;
    status: "pending" | "processing" | "delivered" | "cancelled" | "failed";
  }>;
} = {}) {
  const upserts: Array<{
    create: Record<string, unknown> & { nextRunAt: Date };
    update: Record<string, unknown>;
  }> = [];
  const createdRecipients: Array<{
    recipientMembershipId: string;
    reminderId: string;
    tenantId: string;
  }> = [];
  const reminderFindManyWheres: Array<Record<string, unknown>> = [];
  const recipientUpdates: Array<{ data: Record<string, unknown>; where: Record<string, unknown> }> =
    [];
  const reminderUpdates: Array<{ data: Record<string, unknown>; where: Record<string, unknown> }> =
    [];

  const prisma = {
    __createdRecipients: createdRecipients,
    __reminderFindManyWheres: reminderFindManyWheres,
    __recipientUpdates: recipientUpdates,
    __reminderUpdates: reminderUpdates,
    __upserts: upserts,
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
    $queryRaw: async () => claimedReminders,
    notificationReminder: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        reminderFindManyWheres.push(where);

        return reminderConfigs.filter((reminder) => {
          const statusFilter = where.status as { in?: string[] } | undefined;
          return !statusFilter?.in || statusFilter.in.includes(reminder.status);
        });
      },
      update: async ({
        data,
        where
      }: {
        data: Record<string, unknown>;
        where: Record<string, unknown>;
      }) => {
        reminderUpdates.push({ data, where });
        return { id: reminderId };
      },
      updateMany: async () => ({ count: 1 }),
      upsert: async ({
        create,
        update
      }: {
        create: Record<string, unknown> & { nextRunAt: Date };
        update: Record<string, unknown>;
      }) => {
        upserts.push({ create, update });
        return { id: reminderId };
      }
    },
    notificationReminderRecipient: {
      createMany: async ({ data }: { data: typeof createdRecipients }) => {
        createdRecipients.push(...data);
        return { count: data.length };
      },
      deleteMany: async () => ({ count: createdRecipients.length }),
      updateMany: async ({
        data,
        where
      }: {
        data: Record<string, unknown>;
        where: Record<string, unknown>;
      }) => {
        recipientUpdates.push({ data, where });
        return { count: 1 };
      }
    },
    practiceArea: {
      findFirst: async () => ({ id: "practice-area-1" })
    },
    tenantMembership: {
      findFirst: async ({ where }: { where: { userId: string } }) =>
        where.userId === actorUserId ? { id: actorMembershipId } : null,
      findMany: async ({ where }: { where: { id?: { in: string[] } } }) => {
        const ids = where.id?.in ?? activeMembershipIds;
        return ids.filter((id) => activeMembershipIds.includes(id)).map((id) => ({ id }));
      }
    }
  };

  const outbox = {
    __events: [] as Array<Record<string, unknown>>,
    enqueue: async (_tx: unknown, input: Record<string, unknown>) => {
      outbox.__events.push(input);
    }
  };

  return {
    outbox: outbox as unknown as ConstructorParameters<typeof NotificationsService>[1] & {
      __events: Array<Record<string, unknown>>;
    },
    prisma: prisma as unknown as PrismaService & {
      __createdRecipients: typeof createdRecipients;
      __reminderFindManyWheres: typeof reminderFindManyWheres;
      __recipientUpdates: typeof recipientUpdates;
      __reminderUpdates: typeof reminderUpdates;
      __upserts: typeof upserts;
    }
  };
}
