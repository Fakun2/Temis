import { z } from "zod";

const accountAvatarEndpoint = "/api/account/avatar";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url("Ingresa una URL valida.").optional()
);

const optionalAccountAvatarUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .refine(
      (value) =>
        value === accountAvatarEndpoint ||
        value.startsWith(`${accountAvatarEndpoint}?`) ||
        z.string().url().safeParse(value).success,
      "Ingresa una URL valida."
    )
    .optional()
);

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const optionalMinText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(2, "Ingresa al menos 2 caracteres.").optional()
);

export const accountProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresa el nombre.").max(80),
  lastName: z.string().trim().min(1, "Ingresa el apellido.").max(80),
  phone: optionalText,
  avatarUrl: optionalAccountAvatarUrl
});

export const accountStudioSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del estudio.").max(120),
  legalName: optionalMinText,
  taxId: z.string().regex(/^\d{11}$/, "El CUIT/CUIL debe tener exactamente 11 digitos numericos."),
  country: z.string().trim().min(2, "Ingresa el pais.").max(80),
  province: z.string().trim().min(2, "Ingresa la provincia.").max(80),
  city: z.string().trim().min(2, "Ingresa la ciudad.").max(80),
  address: optionalText,
  website: optionalUrl,
  logoUrl: optionalUrl
});

export const accountNotificationsSchema = z.object({
  browserNotifications: z.boolean(),
  inAppReminders: z.boolean(),
  emailReminders: z.boolean(),
  dailyDigest: z.boolean(),
  reminderLeadTime: z.coerce.number().int().min(0).max(720)
});

export const accountMembershipSchema = z.object({
  accountPlan: z.string().trim().min(2, "Ingresa un plan.").max(40),
  accountPlanStatus: z.string().trim().min(2, "Ingresa un estado.").max(40),
  monthlyTokenLimit: z.coerce.number().int().min(0).max(10000000)
});

export const saePreviewSchema = z.object({
  username: z.string().trim().min(1, "Ingresa el CUIL SAE.").max(160),
  password: z.string().min(1, "Ingresa la contrasena SAE.").max(500)
});

const accountPasswordBaseSchema = z.object({
  currentPassword: z.string().max(72).optional(),
  newPassword: z
    .string()
    .min(8, "La nueva contrasena debe tener al menos 8 caracteres.")
    .max(72, "La nueva contrasena no puede superar 72 caracteres.")
    .regex(/[A-Za-z]/, "La nueva contrasena debe incluir al menos una letra.")
    .regex(/[0-9]/, "La nueva contrasena debe incluir al menos un numero.")
});

export const accountPasswordSchema = accountPasswordBaseSchema.refine(
  (value) => !value.currentPassword || value.currentPassword !== value.newPassword,
  {
    message: "La nueva contrasena no puede ser igual a la actual.",
    path: ["newPassword"]
  }
);

export const accountPasswordChangeSchema = accountPasswordBaseSchema
  .extend({
    currentPassword: z.string().min(1, "Ingresa tu contrasena actual.").max(72)
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "La nueva contrasena no puede ser igual a la actual.",
    path: ["newPassword"]
  });

export type AccountProfileFormValues = z.infer<typeof accountProfileSchema>;
export type AccountStudioFormValues = z.infer<typeof accountStudioSchema>;
export type AccountNotificationsFormValues = z.infer<typeof accountNotificationsSchema>;
export type AccountMembershipFormValues = z.infer<typeof accountMembershipSchema>;
export type AccountPasswordFormValues = z.infer<typeof accountPasswordSchema>;
export type SaePreviewFormValues = z.infer<typeof saePreviewSchema>;
