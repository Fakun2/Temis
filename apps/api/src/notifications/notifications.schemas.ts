import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { booleanInputSchema } from "../common/boolean.schemas";

export const notificationRecipientModeSchema = z.enum([
  "self",
  "tenant",
  "practice_area",
  "members"
]);

export const notificationSettingsSchema = z
  .object({
    notificationEnabled: booleanInputSchema(false),
    notificationDate: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z
        .string()
        .trim()
        .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
        .optional()
    ),
    notificationTime: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z
        .string()
        .trim()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional()
    ),
    notificationRecipientMode: notificationRecipientModeSchema.default("self"),
    notificationPracticeAreaId: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().uuid().optional()
    ),
    notificationMembershipIds: z.array(z.string().uuid()).default([])
  })
  .superRefine((input, context) => {
    if (!input.notificationEnabled) {
      return;
    }

    if (!input.notificationDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de notificacion es obligatoria.",
        path: ["notificationDate"]
      });
    }

    if (!input.notificationTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La hora de notificacion es obligatoria.",
        path: ["notificationTime"]
      });
    }

    if (input.notificationDate && input.notificationTime) {
      const scheduledAt = toBuenosAiresDateTime(input.notificationDate, input.notificationTime);

      if (!scheduledAt || scheduledAt <= new Date()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La notificacion debe programarse para una fecha y hora futura.",
          path: ["notificationDate"]
        });
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La notificacion debe programarse para una fecha y hora futura.",
          path: ["notificationTime"]
        });
      }
    }

    if (input.notificationRecipientMode === "practice_area" && !input.notificationPracticeAreaId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un area de trabajo para notificar.",
        path: ["notificationPracticeAreaId"]
      });
    }

    if (
      input.notificationRecipientMode === "members" &&
      input.notificationMembershipIds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona al menos una persona para notificar.",
        path: ["notificationMembershipIds"]
      });
    }
  });

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: booleanInputSchema(true)
});

export class ListNotificationsQueryDto extends createZodDto(listNotificationsQuerySchema) {}

export class NotificationReminderSettingsDto {
  @ApiProperty({ example: true })
  notificationEnabled!: boolean;

  @ApiPropertyOptional({ example: "2026-08-21" })
  notificationDate?: string;

  @ApiPropertyOptional({ example: "09:30" })
  notificationTime?: string;

  @ApiProperty({ enum: notificationRecipientModeSchema.options, example: "members" })
  notificationRecipientMode!: z.infer<typeof notificationRecipientModeSchema>;

  @ApiPropertyOptional({ format: "uuid" })
  notificationPracticeAreaId?: string;

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  notificationMembershipIds?: string[];
}

export class NotificationDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  reminderId!: string;

  @ApiProperty({ enum: ["case_task", "case_expense", "case_hearing", "meeting"] })
  resourceType!: "case_task" | "case_expense" | "case_hearing" | "meeting";

  @ApiProperty({ format: "uuid" })
  resourceId!: string;

  @ApiProperty({ format: "uuid" })
  caseId!: string;

  @ApiProperty({ example: "Tarea: Presentar escrito" })
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  body!: string | null;

  @ApiProperty({ format: "date-time" })
  scheduledAt!: string;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  deliveredAt!: string | null;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  readAt!: string | null;
}

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationDto] })
  items!: NotificationDto[];

  @ApiProperty({ example: 3 })
  unreadCount!: number;
}

export class NotificationReadResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

function toBuenosAiresDateTime(date: string, time: string) {
  if (!isValidDateString(date)) {
    return null;
  }

  const scheduledAt = new Date(`${date}T${time}:00.000-03:00`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
}

function isValidDateString(date: string) {
  const [yearValue, monthValue, dayValue] = date.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}
