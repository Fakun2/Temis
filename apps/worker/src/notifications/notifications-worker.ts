import { PrismaClient } from "@prisma/client";
import {
  notificationDeliveredChannel,
  type DeliveredNotificationEvent
} from "@temis/integration-contracts";
import type Redis from "ioredis";
import { createLogger } from "../logger";
import { AsyncOutbox } from "../queue/outbox";
import type { NotificationReminderDueMessage } from "../queue/types";

export class NotificationsWorker {
  private readonly logger = createLogger("NotificationsWorker");

  constructor(
    private readonly prisma: PrismaClient,
    private readonly outbox: AsyncOutbox,
    private readonly notificationEvents: Redis
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
    const inAppRecipients = await this.prisma.$transaction(async (tx) => {
      const notificationTx = tx as any;
      const reminder = await tx.notificationReminder.findFirst({
        where: { id: reminderId, tenantId },
        select: { resourceType: true }
      });
      if (!reminder) {
        throw new Error("El recordatorio no existe para el estudio activo.");
      }
      const recipients = await tx.notificationReminderRecipient.findMany({
        where: { reminderId, status: "pending", tenantId },
        select: { id: true, recipientMembershipId: true }
      });
      const preferences = await notificationTx.notificationChannelPreference.findMany({
        where: {
          resourceType: reminder.resourceType,
          tenantId,
          tenantMembershipId: { in: recipients.map((recipient) => recipient.recipientMembershipId) }
        },
        select: { emailEnabled: true, inAppEnabled: true, tenantMembershipId: true }
      });
      const preferencesByMembership = new Map<
        string,
        { emailEnabled: boolean; inAppEnabled: boolean }
      >(
        (
          preferences as Array<{
            tenantMembershipId: string;
            emailEnabled: boolean;
            inAppEnabled: boolean;
          }>
        ).map((preference) => [preference.tenantMembershipId, preference])
      );
      const inAppRecipientIds = recipients
        .filter(
          (recipient) =>
            preferencesByMembership.get(recipient.recipientMembershipId)?.inAppEnabled ?? true
        )
        .map((recipient) => recipient.id);
      const emailRecipientIds = recipients
        .filter(
          (recipient) =>
            preferencesByMembership.get(recipient.recipientMembershipId)?.emailEnabled ?? false
        )
        .map((recipient) => recipient.id);

      await tx.notificationReminderRecipient.updateMany({
        data: {
          deliveredAt,
          status: "delivered"
        },
        where: {
          id: { in: inAppRecipientIds },
          tenantId
        }
      });

      if (emailRecipientIds.length) {
        await notificationTx.notificationEmailDelivery.createMany({
          data: emailRecipientIds.map((reminderRecipientId) => ({
            reminderRecipientId,
            tenantId
          })),
          skipDuplicates: true
        });
        const emailDeliveries = await notificationTx.notificationEmailDelivery.findMany({
          where: { reminderRecipientId: { in: emailRecipientIds }, status: "pending", tenantId },
          select: { id: true }
        });
        for (const delivery of emailDeliveries) {
          await this.outbox.enqueueNotificationEmail(tx, {
            deliverAt: new Date(),
            deliveryId: delivery.id,
            tenantId
          });
        }
      }

      await tx.notificationReminder.update({
        data: {
          deliveredAt,
          status: "delivered"
        },
        where: { id: reminderId }
      });

      return recipients.filter((recipient) => inAppRecipientIds.includes(recipient.id));
    });

    await Promise.all(
      inAppRecipients.map((recipient) =>
        this.notificationEvents.publish(
          notificationDeliveredChannel,
          JSON.stringify({
            notificationId: recipient.id,
            recipientMembershipId: recipient.recipientMembershipId,
            tenantId
          } satisfies DeliveredNotificationEvent)
        )
      )
    ).catch((error) => this.logger.warn("Could not publish in-app notification event.", error));
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
