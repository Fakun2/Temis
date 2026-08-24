import { PrismaClient } from "@prisma/client";
import { createLogger } from "../logger";
import { AsyncOutbox } from "../queue/outbox";
import type { NotificationReminderDueMessage } from "../queue/types";

export class NotificationsWorker {
  private readonly logger = createLogger("NotificationsWorker");

  constructor(
    private readonly prisma: PrismaClient,
    private readonly outbox: AsyncOutbox
  ) {}

  async processReminderMessage(input: NotificationReminderDueMessage) {
    const expectedScheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(expectedScheduledAt.getTime())) {
      throw new Error("La fecha del mensaje de notificacion no es valida.");
    }

    const claimed = await this.prisma.notificationReminder.updateMany({
      data: {
        attempts: { increment: 1 },
        status: "processing"
      },
      where: {
        id: input.reminderId,
        nextRunAt: { lte: new Date() },
        scheduledAt: expectedScheduledAt,
        status: "pending",
        tenantId: input.tenantId
      }
    });

    if (claimed.count === 0) {
      return { processed: false };
    }

    try {
      await this.deliverClaimedReminder(input.reminderId, input.tenantId);
      return { processed: true };
    } catch (error) {
      this.logger.error(`Failed to deliver notification reminder ${input.reminderId}.`, error);
      await this.markReminderFailed(input.reminderId, error);
      throw error;
    }
  }

  private async deliverClaimedReminder(reminderId: string, tenantId: string) {
    const deliveredAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.notificationReminderRecipient.updateMany({
        data: {
          deliveredAt,
          status: "delivered"
        },
        where: {
          reminderId,
          status: "pending",
          tenantId
        }
      });

      await tx.notificationReminder.update({
        data: {
          deliveredAt,
          status: "delivered"
        },
        where: { id: reminderId }
      });
    });
  }

  private async markReminderFailed(reminderId: string, error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await this.prisma.$transaction(async (tx) => {
      const nextRunAt = new Date(Date.now() + 60_000);
      const reminder = await tx.notificationReminder.update({
        data: {
          lastError: message.slice(0, 500),
          nextRunAt,
          status: "pending"
        },
        select: { id: true, scheduledAt: true, tenantId: true },
        where: { id: reminderId }
      });
      await this.outbox.enqueueNotificationReminder(tx, {
        deliverAt: nextRunAt,
        reminderId: reminder.id,
        scheduledAt: reminder.scheduledAt,
        tenantId: reminder.tenantId
      });
    });
  }
}
