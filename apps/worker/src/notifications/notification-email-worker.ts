import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { getEnv, getPositiveNumberEnv } from "../config";
import { createLogger } from "../logger";
import { AsyncOutbox } from "../queue/outbox";
import type { NotificationEmailDeliveryMessage } from "../queue/types";

export class NotificationEmailWorker {
  private readonly logger = createLogger("NotificationEmailWorker");

  constructor(
    private readonly prisma: PrismaClient,
    private readonly outbox: AsyncOutbox
  ) {}

  async processMessage(input: NotificationEmailDeliveryMessage) {
    const database = this.prisma as any;
    const claimed = await database.notificationEmailDelivery.updateMany({
      data: { attempts: { increment: 1 }, status: "processing" },
      where: {
        id: input.deliveryId,
        nextRunAt: { lte: new Date() },
        status: "pending",
        tenantId: input.tenantId
      }
    });
    if (!claimed.count) return { processed: false };

    const delivery = await database.notificationEmailDelivery.findFirst({
      where: { id: input.deliveryId, tenantId: input.tenantId },
      include: {
        reminderRecipient: {
          include: {
            reminder: {
              select: {
                body: true,
                caseId: true,
                resourceId: true,
                resourceType: true,
                title: true
              }
            },
            recipientMembership: {
              include: {
                user: { select: { email: true } }
              }
            }
          }
        }
      }
    });
    if (!delivery) return { processed: false };

    const preference = await database.notificationChannelPreference.findFirst({
      where: {
        emailEnabled: true,
        resourceType: delivery.reminderRecipient.reminder.resourceType,
        tenantId: input.tenantId,
        tenantMembershipId: delivery.reminderRecipient.recipientMembershipId
      },
      select: { id: true }
    });
    if (!preference) {
      await database.notificationEmailDelivery.update({
        where: { id: delivery.id },
        data: { skippedAt: new Date(), status: "skipped" }
      });
      return { processed: true };
    }

    try {
      const resend = new Resend(getEnv("RESEND_API_KEY"));
      const content = await this.getEmailContent(input.tenantId, delivery.reminderRecipient.reminder);
      if (!content) {
        await database.notificationEmailDelivery.update({
          where: { id: delivery.id },
          data: { skippedAt: new Date(), status: "skipped" }
        });
        return { processed: true };
      }
      const result = await resend.emails.send(
        {
          from: getEnv("EMAIL_FROM"),
          to: [delivery.reminderRecipient.recipientMembership.user.email],
          subject: content.subject,
          text: toPlainText(content),
          html: toHtml(content)
        },
        { idempotencyKey: `notification-email-${delivery.id}` }
      );
      if (result.error) throw new Error(result.error.message);
      await database.notificationEmailDelivery.update({
        where: { id: delivery.id },
        data: { deliveredAt: new Date(), lastError: null, status: "delivered" }
      });
      return { processed: true };
    } catch (error) {
      const attempts = delivery.attempts + 1;
      const message = error instanceof Error ? error.message : "Error desconocido";
      this.logger.warn(`Notification email delivery ${delivery.id} failed: ${message}`);
      const maxAttempts = getPositiveNumberEnv("NOTIFICATION_EMAIL_MAX_ATTEMPTS", 5);
      if (attempts >= maxAttempts) {
        await database.notificationEmailDelivery.update({
          where: { id: delivery.id },
          data: { lastError: message.slice(0, 500), status: "failed" }
        });
        this.logger.error(`Notification email delivery ${delivery.id} failed permanently.`);
        return { processed: true };
      }
      const nextRunAt = new Date(Date.now() + Math.min(60_000 * 2 ** (attempts - 1), 3_600_000));
      await this.prisma.$transaction(async (tx) => {
        await (tx as any).notificationEmailDelivery.update({
          where: { id: delivery.id },
          data: { lastError: message.slice(0, 500), nextRunAt, status: "pending" }
        });
        await this.outbox.enqueueNotificationEmail(tx, {
          deliveryId: delivery.id,
          deliverAt: nextRunAt,
          tenantId: input.tenantId
        });
      });
      return { processed: true };
    }
  }

  private async getEmailContent(
    tenantId: string,
    reminder: {
      body: string | null;
      caseId: string;
      resourceId: string;
      resourceType: "case_task" | "case_expense" | "case_hearing" | "meeting";
      title: string;
    }
  ): Promise<NotificationEmailContent | null> {
    const database = this.prisma as any;
    const actionUrl = buildActionUrl(reminder.caseId, reminder.resourceId, reminder.resourceType);
    if (!actionUrl) return null;

    if (reminder.resourceType === "case_task") {
      const task = await database.caseTask.findFirst({
        select: { endDate: true, name: true, startDate: true },
        where: { caseId: reminder.caseId, id: reminder.resourceId, tenantId }
      });
      if (!task) return null;
      return {
        actionLabel: "Abrir tarea",
        actionUrl,
        details: [
          { label: "Tarea", value: task.name },
          ...(task.startDate ? [{ label: "Fecha de inicio", value: formatDate(task.startDate) }] : []),
          ...(task.endDate ? [{ label: "Vencimiento", value: formatDate(task.endDate) }] : []),
          { label: "Acción requerida", value: "Revisar tarea pendiente" }
        ],
        introduction: "Tenés una tarea pendiente de revisión.",
        subject: `Tarea pendiente: ${task.name}`
      };
    }

    if (reminder.resourceType === "case_expense") {
      const expense = await database.caseExpense.findFirst({
        select: {
          amount: true,
          concept: true,
          currencyCode: true,
          expenseDate: true,
          paymentDate: true,
          status: true
        },
        where: { caseId: reminder.caseId, id: reminder.resourceId, tenantId }
      });
      if (!expense) return null;
      return {
        actionLabel: "Abrir gasto",
        actionUrl,
        details: [
          { label: "Concepto", value: expense.concept },
          { label: "Monto", value: formatCurrency(expense.amount.toString(), expense.currencyCode) },
          { label: "Fecha de emisión", value: formatDate(expense.expenseDate) },
          { label: "Fecha de pago", value: formatDate(expense.paymentDate) },
          { label: "Estado", value: formatExpenseStatus(expense.status) }
        ],
        introduction: "Tenés un gasto pendiente de atención.",
        subject: `Gasto pendiente: ${expense.concept}`
      };
    }

    if (reminder.resourceType === "case_hearing") {
      const hearing = await database.caseHearing.findFirst({
        select: { date: true, description: true, time: true },
        where: { caseId: reminder.caseId, id: reminder.resourceId, tenantId }
      });
      if (!hearing) return null;
      return {
        actionLabel: "Abrir audiencia",
        actionUrl,
        details: [
          { label: "Audiencia", value: hearing.description },
          { label: "Fecha", value: formatDate(hearing.date) },
          { label: "Hora", value: hearing.time }
        ],
        introduction: "Tenés una audiencia próxima.",
        subject: `Audiencia: ${hearing.description}`
      };
    }

    return null;
  }
}

type NotificationEmailContent = {
  actionLabel: string;
  actionUrl: string;
  details: Array<{ label: string; value: string }>;
  introduction: string;
  subject: string;
};

function buildActionUrl(
  caseId: string,
  resourceId: string,
  resourceType: "case_task" | "case_expense" | "case_hearing" | "meeting"
) {
  const focusByResourceType = {
    case_expense: "expense",
    case_hearing: "hearing",
    case_task: "task"
  } as const;
  const sectionByFocus = { expense: "expenses", hearing: "hearings", task: "tasks" } as const;
  const focus = focusByResourceType[resourceType as keyof typeof focusByResourceType];
  if (!focus) return null;

  const url = new URL(`/admin/cases/${caseId}`, getEnv("FRONTEND_PUBLIC_URL"));
  url.searchParams.set("calendarFocus", focus);
  url.searchParams.set("eventId", resourceId);
  url.hash = sectionByFocus[focus];
  return url.toString();
}

function toPlainText(content: NotificationEmailContent) {
  const details = content.details.map(({ label, value }) => `${label}: ${value}`).join("\n");
  return `${content.introduction}\n\n${details}\n\n${content.actionLabel}: ${content.actionUrl}`;
}

function toHtml(content: NotificationEmailContent) {
  const details = content.details
    .map(
      ({ label, value }) =>
        `<tr><td style="padding:0 16px 10px 0;color:#64748b;font-weight:600;vertical-align:top">${escapeHtml(label)}</td><td style="padding:0 0 10px;color:#0f172a">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5"><p>${escapeHtml(content.introduction)}</p><table role="presentation" style="border-collapse:collapse;margin:20px 0">${details}</table><a href="${escapeHtml(content.actionUrl)}" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#1d4ed8;color:#fff;font-weight:600;text-decoration:none">${escapeHtml(content.actionLabel)}</a></div>`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
}

function formatCurrency(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("es-AR", { currency: currencyCode, style: "currency" }).format(
    Number(amount)
  );
}

function formatExpenseStatus(status: string) {
  const labels: Record<string, string> = {
    cancelled: "Cancelado",
    overdue: "Vencido",
    paid: "Pagado",
    pending: "Pendiente"
  };
  return labels[status] ?? status;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character] ?? character;
  });
}
