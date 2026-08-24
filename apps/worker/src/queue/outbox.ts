import { Prisma, PrismaClient } from "@prisma/client";
import {
  documentCleanupRoutingKey,
  notificationReminderRoutingKey
} from "./constants";
import { withTransientDatabaseRetry } from "./retry";
import type { OutboxEventInput, QueuePayload } from "./types";

export class AsyncOutbox {
  constructor(private readonly prisma: PrismaClient) {}

  async enqueue(prisma: Prisma.TransactionClient, input: OutboxEventInput) {
    await prisma.asyncOutboxEvent.create({
      data: {
        availableAt: input.availableAt ?? new Date(),
        payload: input.payload as Prisma.InputJsonValue,
        routingKey: input.routingKey,
        tenantId: input.tenantId ?? null,
        topic: input.topic
      }
    });
  }

  async claimDue(limit: number) {
    return withTransientDatabaseRetry(() =>
      this.prisma.$queryRaw<
        Array<{
          id: string;
          payload: Prisma.JsonValue;
          routing_key: string;
          tenant_id: string | null;
          topic: string;
        }>
      >(Prisma.sql`
        WITH due AS (
          SELECT "id"
          FROM "async_outbox_events"
          WHERE "status" IN ('pending', 'failed')
            AND "available_at" <= CURRENT_TIMESTAMP
          ORDER BY "available_at" ASC, "created_at" ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "async_outbox_events" events
        SET "status" = 'publishing',
            "attempts" = events."attempts" + 1,
            "updated_at" = CURRENT_TIMESTAMP
        FROM due
        WHERE events."id" = due."id"
        RETURNING
          events."id"::text,
          events."tenant_id"::text,
          events."topic",
          events."routing_key",
          events."payload"
      `)
    );
  }

  async markPublished(eventId: string) {
    await withTransientDatabaseRetry(() =>
      this.prisma.asyncOutboxEvent.update({
        data: {
          lastError: null,
          publishedAt: new Date(),
          status: "published"
        },
        where: { id: eventId }
      })
    );
  }

  async markFailed(eventId: string, error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await withTransientDatabaseRetry(() =>
      this.prisma.asyncOutboxEvent.update({
        data: {
          availableAt: new Date(Date.now() + 30_000),
          lastError: message.slice(0, 500),
          status: "failed"
        },
        where: { id: eventId }
      })
    );
  }

  async enqueueNotificationReminder(
    tx: Prisma.TransactionClient,
    input: { deliverAt: Date; reminderId: string; scheduledAt: Date; tenantId: string }
  ) {
    const deliverAt = input.deliverAt.toISOString();
    const scheduledAt = input.scheduledAt.toISOString();
    await this.enqueue(tx, {
      payload: {
        deliverAt,
        reminderId: input.reminderId,
        scheduledAt,
        tenantId: input.tenantId
      },
      routingKey: notificationReminderRoutingKey,
      tenantId: input.tenantId,
      topic: "notification.reminder.scheduled"
    });
  }

  async enqueueDocumentCleanup(
    tx: Prisma.TransactionClient,
    job: { id: string; nextRunAt: Date; tenantId: string }
  ) {
    const nextRunAt = job.nextRunAt.toISOString();
    await this.enqueue(tx, {
      payload: {
        deliverAt: nextRunAt,
        jobId: job.id,
        nextRunAt,
        tenantId: job.tenantId
      },
      routingKey: documentCleanupRoutingKey,
      tenantId: job.tenantId,
      topic: "document.cleanup.requested"
    });
  }
}

export function getDelayMsFromPayload(payload: QueuePayload) {
  if (!payload.deliverAt || typeof payload.deliverAt !== "string") {
    return 0;
  }

  const deliverAt = new Date(payload.deliverAt).getTime();
  if (Number.isNaN(deliverAt)) {
    return 0;
  }

  return Math.max(0, deliverAt - Date.now());
}
