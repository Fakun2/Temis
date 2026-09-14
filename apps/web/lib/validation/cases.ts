import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);
const optionalDniSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, "El DNI debe tener solo numeros, minimo 7 y maximo 8 digitos.")
    .optional()
);
const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^\d{0,15}$/, "El telefono debe tener solo numeros y maximo 15 digitos.")
    .optional()
);
const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, "Selecciona una moneda.")
  .transform((value) => value.toUpperCase());

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().optional()
);
const requiredDateString = z.string().trim().min(1, "Selecciona una fecha.");
const optionalTimeSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora valida.")
    .optional()
);
const notificationSettingsFormSchema = z
  .object({
    notificationEnabled: z.coerce.boolean().default(false),
    notificationDate: optionalTrimmedString,
    notificationTime: optionalTimeSchema,
    notificationRecipientMode: z
      .enum(["self", "tenant", "practice_area", "members"])
      .default("self"),
    notificationPracticeAreaId: optionalUuid,
    notificationMembershipIds: z.array(z.string().uuid()).default([])
  })
  .superRefine((input, context) => {
    if (!input.notificationEnabled) {
      return;
    }

    if (!input.notificationDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona la fecha de notificacion.",
        path: ["notificationDate"]
      });
    }

    if (!input.notificationTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona la hora de notificacion.",
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
        message: "Selecciona un area de trabajo.",
        path: ["notificationPracticeAreaId"]
      });
    }

    if (
      input.notificationRecipientMode === "members" &&
      input.notificationMembershipIds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona al menos una persona.",
        path: ["notificationMembershipIds"]
      });
    }
  });

export const caseParticipantFormSchema = z.object({
  participantKind: z.enum(["client", "opposing_party", "third_party", "other"]).default("other"),
  role: z
    .enum([
      "claimant",
      "defendant",
      "complainant",
      "accused",
      "third_party",
      "client",
      "opposing_party",
      "other"
    ])
    .default("other"),
  displayName: z.string().trim().min(2, "Minimo 2 caracteres.").max(160, "Maximo 160 caracteres."),
  document: optionalDniSchema,
  address: optionalTrimmedString,
  email: optionalTrimmedString.pipe(z.string().email("Email invalido.").optional()),
  phone: optionalPhoneSchema,
  notes: optionalTrimmedString,
  clientId: optionalUuid
});

export const caseFormSchema = z.object({
  caseNumber: z.string().trim().min(1, "Ingresa el nro. de expediente.").max(80),
  caption: z.string().trim().min(3, "Ingresa la caratula.").max(240),
  subject: optionalTrimmedString,
  description: optionalTrimmedString,
  provinceId: z.string().uuid("Selecciona una provincia."),
  forumTemplateId: z.string().uuid("Selecciona un fuero."),
  judicialCenterForumId: optionalUuid,
  judicialCenterText: optionalTrimmedString,
  court: optionalTrimmedString,
  instance: z.enum(["first", "second", "third"]).default("first"),
  status: z.enum(["open", "paused", "closed"]).default("open"),
  filingDate: optionalTrimmedString,
  primaryClientId: optionalUuid,
  practiceAreaId: optionalUuid,
  responsibleMembershipId: optionalUuid,
  participants: z.array(caseParticipantFormSchema).max(20).default([])
});

export const caseTaskFormSchema = z
  .object({
    name: z.string().trim().min(2, "Minimo 2 caracteres.").max(160, "Maximo 160 caracteres."),
    assignedMembershipId: optionalUuid,
    startDate: optionalTrimmedString,
    endDate: optionalTrimmedString,
    status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
    notes: optionalTrimmedString
  })
  .and(notificationSettingsFormSchema);

export const caseExpenseFormSchema = z
  .object({
    concept: z.string().trim().min(3, "Minimo 3 caracteres.").max(160, "Maximo 160 caracteres."),
    amount: z.coerce.number().min(0.01, "Ingresa un monto mayor a cero."),
    currencyCode: currencyCodeSchema,
    expenseDate: requiredDateString,
    paymentDate: requiredDateString,
    status: z.enum(["pending", "paid", "cancelled"]),
    notes: optionalTrimmedString.pipe(z.string().max(100, "Maximo 100 caracteres.").optional()),
    taskId: optionalUuid
  })
  .and(notificationSettingsFormSchema)
  .superRefine((input, context) => {
    if (input.status === "paid" && input.paymentDate !== getBuenosAiresTodayDateString()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de pago debe ser hoy para marcar el gasto como pagado.",
        path: ["paymentDate"]
      });
    }
  });

export const caseHearingTypeSchema = z.enum([
  "preliminary",
  "trial_view",
  "conciliation",
  "mediation",
  "testimonial",
  "confessional",
  "debate",
  "investigative_statement",
  "other"
]);

export const caseHearingFormSchema = z
  .object({
    type: caseHearingTypeSchema,
    date: requiredDateString,
    time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora valida."),
    description: z
      .string()
      .trim()
      .min(3, "Minimo 3 caracteres.")
      .max(500, "Maximo 500 caracteres."),
    notificationsEnabled: z.coerce.boolean().default(false),
    participantMembershipIds: z.array(z.string().uuid()).max(50).default([])
  })
  .and(notificationSettingsFormSchema);

export type CaseFormValues = z.infer<typeof caseFormSchema>;
export type CaseTaskFormValues = z.infer<typeof caseTaskFormSchema>;
export type CaseExpenseFormValues = z.infer<typeof caseExpenseFormSchema>;
export type CaseHearingFormValues = z.infer<typeof caseHearingFormSchema>;

function getBuenosAiresTodayDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function toBuenosAiresDateTime(date: string, time: string) {
  const scheduledAt = new Date(`${date}T${time}:00.000-03:00`);
  return Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt;
}
