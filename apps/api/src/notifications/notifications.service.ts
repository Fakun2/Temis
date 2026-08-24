import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AsyncOutboxService } from "../queue/async-outbox.service";
import { notificationReminderRoutingKey } from "../queue/queue.constants";
import type { ListNotificationsQuery, NotificationSettingsInput } from "./notifications.schemas";

type ReminderResourceType = "case_task" | "case_expense" | "case_hearing" | "meeting";

type ScheduleReminderInput = {
  actorUserId: string;
  body?: string | null;
  caseId: string;
  resourceId: string;
  resourceType: ReminderResourceType;
  settings: NotificationSettingsInput;
  tenantId: string;
  title: string;
};

type ReminderConfig = {
  notificationDate: string;
  notificationEnabled: boolean;
  notificationMembershipIds: string[];
  notificationPracticeAreaId: string | null;
  notificationRecipientMode: "self" | "tenant" | "practice_area" | "members";
  notificationTime: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: AsyncOutboxService
  ) {}

  async scheduleForResource(input: ScheduleReminderInput) {
    if (!input.settings.notificationEnabled) {
      await this.cancelForResource(input.tenantId, input.resourceType, input.resourceId);
      return;
    }

    const actorMembership = await this.findActiveMembershipForUser(
      input.tenantId,
      input.actorUserId
    );
    const scheduledAt = toBuenosAiresDateTime(
      input.settings.notificationDate,
      input.settings.notificationTime
    );
    const recipientMembershipIds = await this.resolveRecipients(input.tenantId, input.settings, {
      actorMembershipId: actorMembership.id
    });

    await this.prisma.$transaction(async (tx) => {
      const reminder = await tx.notificationReminder.upsert({
        create: {
          body: input.body ?? null,
          caseId: input.caseId,
          createdByMembershipId: actorMembership.id,
          nextRunAt: scheduledAt,
          practiceAreaId: input.settings.notificationPracticeAreaId ?? null,
          recipientMode: input.settings.notificationRecipientMode,
          resourceId: input.resourceId,
          resourceType: input.resourceType,
          scheduledAt,
          status: "pending",
          tenantId: input.tenantId,
          title: input.title
        },
        update: {
          attempts: 0,
          body: input.body ?? null,
          cancelledAt: null,
          caseId: input.caseId,
          deliveredAt: null,
          lastError: null,
          nextRunAt: scheduledAt,
          practiceAreaId: input.settings.notificationPracticeAreaId ?? null,
          recipientMode: input.settings.notificationRecipientMode,
          scheduledAt,
          status: "pending",
          title: input.title
        },
        where: {
          tenantId_resourceType_resourceId: {
            resourceId: input.resourceId,
            resourceType: input.resourceType,
            tenantId: input.tenantId
          }
        },
        select: { id: true }
      });

      await tx.notificationReminderRecipient.deleteMany({
        where: { reminderId: reminder.id, tenantId: input.tenantId }
      });
      await tx.notificationReminderRecipient.createMany({
        data: recipientMembershipIds.map((recipientMembershipId) => ({
          recipientMembershipId,
          reminderId: reminder.id,
          tenantId: input.tenantId
        })),
        skipDuplicates: true
      });

      await this.enqueueReminderOutbox(tx, {
        deliverAt: scheduledAt,
        reminderId: reminder.id,
        scheduledAt,
        tenantId: input.tenantId
      });
    });
  }

  async cancelForResource(
    tenantId: string,
    resourceType: ReminderResourceType,
    resourceId: string
  ) {
    await this.prisma.notificationReminder.updateMany({
      data: {
        cancelledAt: new Date(),
        status: "cancelled"
      },
      where: {
        resourceId,
        resourceType,
        status: { in: ["pending", "processing"] },
        tenantId
      }
    });
  }

  async getReminderConfigs(
    tenantId: string,
    resourceType: ReminderResourceType,
    resourceIds: string[]
  ) {
    if (!resourceIds.length) {
      return new Map<string, ReminderConfig>();
    }

    const reminders = await this.prisma.notificationReminder.findMany({
      include: {
        recipients: {
          select: {
            recipientMembershipId: true
          }
        }
      },
      where: {
        resourceId: { in: resourceIds },
        resourceType,
        status: { in: ["pending", "processing", "delivered"] },
        tenantId
      }
    });

    return new Map(
      reminders.map((reminder) => [
        reminder.resourceId,
        {
          notificationDate: toBuenosAiresDateParts(reminder.scheduledAt).date,
          notificationEnabled: reminder.status !== "cancelled",
          notificationMembershipIds: reminder.recipients.map(
            (recipient) => recipient.recipientMembershipId
          ),
          notificationPracticeAreaId: reminder.practiceAreaId,
          notificationRecipientMode: reminder.recipientMode,
          notificationTime: toBuenosAiresDateParts(reminder.scheduledAt).time
        }
      ])
    );
  }

  async listForUser(tenantId: string, actorUserId: string, query: ListNotificationsQuery) {
    const membership = await this.findActiveMembershipForUser(tenantId, actorUserId);
    const [items, unreadCount] = await Promise.all([
      this.prisma.notificationReminderRecipient.findMany({
        orderBy: [{ deliveredAt: "desc" }, { createdAt: "desc" }],
        select: notificationRecipientSelect,
        take: query.limit,
        where: {
          recipientMembershipId: membership.id,
          tenantId,
          ...(query.unreadOnly ? { readAt: null } : {}),
          reminder: {
            status: "delivered"
          }
        }
      }),
      this.prisma.notificationReminderRecipient.count({
        where: {
          readAt: null,
          recipientMembershipId: membership.id,
          tenantId,
          reminder: {
            status: "delivered"
          }
        }
      })
    ]);

    return {
      items: items.map(toNotificationDto),
      unreadCount
    };
  }

  async markRead(tenantId: string, actorUserId: string, notificationId: string) {
    const membership = await this.findActiveMembershipForUser(tenantId, actorUserId);
    const notification = await this.prisma.notificationReminderRecipient.findFirst({
      where: {
        id: notificationId,
        recipientMembershipId: membership.id,
        tenantId
      },
      select: { id: true }
    });

    if (!notification) {
      throw new NotFoundException("La notificacion no existe para el usuario activo.");
    }

    await this.prisma.notificationReminderRecipient.update({
      data: {
        readAt: new Date(),
        status: "read"
      },
      where: { id: notification.id }
    });

    return { status: "ok" as const };
  }

  async processDueReminders(batchSize = 100) {
    const claimed = await this.claimDueReminders(batchSize);

    for (const reminder of claimed) {
      try {
        await this.deliverClaimedReminder(reminder.id, reminder.tenant_id);
      } catch (error) {
        this.logger.error(`Failed to deliver notification reminder ${reminder.id}.`, error);
        await this.markReminderFailed(reminder.id, error);
      }
    }

    return { processedCount: claimed.length };
  }

  async processReminderMessage(input: {
    reminderId: string;
    scheduledAt: string;
    tenantId: string;
  }) {
    const expectedScheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(expectedScheduledAt.getTime())) {
      throw new BadRequestException("La fecha del mensaje de notificacion no es valida.");
    }

    const claimed = await this.prisma.notificationReminder.updateMany({
      data: {
        attempts: { increment: 1 },
        status: "processing"
      },
      where: {
        id: input.reminderId,
        scheduledAt: expectedScheduledAt,
        status: "pending",
        tenantId: input.tenantId,
        nextRunAt: { lte: new Date() }
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

  private async claimDueReminders(batchSize: number) {
    return this.prisma.$transaction((tx) =>
      tx.$queryRaw<Array<{ id: string; tenant_id: string }>>(Prisma.sql`
        WITH due AS (
          SELECT "id"
          FROM "notification_reminders"
          WHERE "status" = 'pending'
            AND "next_run_at" <= CURRENT_TIMESTAMP
          ORDER BY "next_run_at" ASC, "id" ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "notification_reminders" nr
        SET "status" = 'processing',
            "attempts" = nr."attempts" + 1,
            "updated_at" = CURRENT_TIMESTAMP
        FROM due
        WHERE nr."id" = due."id"
        RETURNING nr."id"::text, nr."tenant_id"::text
      `)
    );
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
      await this.enqueueReminderOutbox(tx, {
        deliverAt: nextRunAt,
        reminderId: reminder.id,
        scheduledAt: reminder.scheduledAt,
        tenantId: reminder.tenantId
      });
    });
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

  private async enqueueReminderOutbox(
    tx: Prisma.TransactionClient,
    input: { deliverAt: Date; reminderId: string; scheduledAt: Date; tenantId: string }
  ) {
    const deliverAt = input.deliverAt.toISOString();
    const scheduledAt = input.scheduledAt.toISOString();
    await this.outbox.enqueue(tx, {
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

  private async findActiveMembershipForUser(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        status: "active",
        tenantId,
        userId
      },
      select: { id: true }
    });

    if (!membership) {
      throw new BadRequestException("El usuario no tiene una membresia activa en este estudio.");
    }

    return membership;
  }

  private async resolveRecipients(
    tenantId: string,
    settings: NotificationSettingsInput,
    context: { actorMembershipId: string }
  ) {
    if (settings.notificationRecipientMode === "self") {
      return [context.actorMembershipId];
    }

    if (settings.notificationRecipientMode === "tenant") {
      const memberships = await this.prisma.tenantMembership.findMany({
        where: { status: "active", tenantId },
        select: { id: true }
      });
      return assertRecipients(memberships.map((membership) => membership.id));
    }

    if (settings.notificationRecipientMode === "practice_area") {
      const practiceAreaId = settings.notificationPracticeAreaId;
      if (!practiceAreaId) {
        throw new BadRequestException("Selecciona un area de trabajo para notificar.");
      }

      const practiceArea = await this.prisma.practiceArea.findFirst({
        where: { active: true, id: practiceAreaId, tenantId },
        select: { id: true }
      });

      if (!practiceArea) {
        throw new BadRequestException("El area de trabajo no pertenece al estudio activo.");
      }

      const memberships = await this.prisma.tenantMembership.findMany({
        where: {
          practiceAreas: { some: { practiceAreaId } },
          status: "active",
          tenantId
        },
        select: { id: true }
      });

      return assertRecipients(memberships.map((membership) => membership.id));
    }

    const membershipIds = [...new Set(settings.notificationMembershipIds)];
    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        id: { in: membershipIds },
        status: "active",
        tenantId
      },
      select: { id: true }
    });

    if (memberships.length !== membershipIds.length) {
      throw new BadRequestException("Uno o mas destinatarios no pertenecen al estudio activo.");
    }

    return assertRecipients(memberships.map((membership) => membership.id));
  }
}

const notificationRecipientSelect = {
  deliveredAt: true,
  id: true,
  readAt: true,
  reminder: {
    select: {
      body: true,
      caseId: true,
      id: true,
      resourceId: true,
      resourceType: true,
      scheduledAt: true,
      title: true
    }
  }
} satisfies Prisma.NotificationReminderRecipientSelect;

type NotificationRecipientRecord = Prisma.NotificationReminderRecipientGetPayload<{
  select: typeof notificationRecipientSelect;
}>;

function toNotificationDto(item: NotificationRecipientRecord) {
  return {
    id: item.id,
    reminderId: item.reminder.id,
    resourceType: item.reminder.resourceType,
    resourceId: item.reminder.resourceId,
    caseId: item.reminder.caseId,
    title: item.reminder.title,
    body: item.reminder.body,
    scheduledAt: item.reminder.scheduledAt.toISOString(),
    deliveredAt: item.deliveredAt?.toISOString() ?? null,
    readAt: item.readAt?.toISOString() ?? null
  };
}

function toBuenosAiresDateTime(date?: string, time?: string) {
  if (!date || !time) {
    throw new BadRequestException("Completa fecha y hora de notificacion.");
  }

  const scheduledAt = new Date(`${date}T${time}:00.000-03:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new BadRequestException("La fecha y hora de notificacion no son validas.");
  }

  if (scheduledAt <= new Date()) {
    throw new BadRequestException("La notificacion debe programarse para una fecha y hora futura.");
  }

  return scheduledAt;
}

function toBuenosAiresDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).formatToParts(date);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${partMap.year}-${partMap.month}-${partMap.day}`,
    time: `${partMap.hour}:${partMap.minute}`
  };
}

function assertRecipients(recipientMembershipIds: string[]) {
  if (!recipientMembershipIds.length) {
    throw new BadRequestException("No hay destinatarios activos para esta notificacion.");
  }

  return recipientMembershipIds;
}
