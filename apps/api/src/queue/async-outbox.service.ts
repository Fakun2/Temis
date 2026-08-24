import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { outboxDatabaseRetryAttempts, outboxDatabaseRetryBaseDelayMs } from "./queue.constants";
import type { EnqueueOutboxEventInput } from "./queue.types";

@Injectable()
export class AsyncOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(prisma: Prisma.TransactionClient, input: EnqueueOutboxEventInput) {
    await prisma.asyncOutboxEvent.create({
      data: {
        availableAt: input.availableAt ?? new Date(),
        payload: input.payload,
        routingKey: input.routingKey,
        tenantId: input.tenantId ?? null,
        topic: input.topic
      }
    });
  }

  async claimDue(limit: number) {
    return this.withTransientRetry(() =>
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
    await this.withTransientRetry(() =>
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
    await this.withTransientRetry(() =>
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

  private async withTransientRetry<T>(operation: () => Promise<T>) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= outboxDatabaseRetryAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!isTransientPrismaError(error) || attempt === outboxDatabaseRetryAttempts) {
          throw error;
        }

        await sleep(getRetryDelayMs(attempt));
      }
    }

    throw lastError;
  }
}

function isTransientPrismaError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return ["P2024", "P2028", "P2034"].includes(String(error.code));
}

function getRetryDelayMs(attempt: number) {
  const exponentialDelay = outboxDatabaseRetryBaseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * outboxDatabaseRetryBaseDelayMs);
  return exponentialDelay + jitter;
}

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
