import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const optionalUrl = optionalTrimmedString.pipe(z.string().url().optional());
const optionalMinString = optionalTrimmedString.pipe(z.string().trim().min(2).optional());
const optionalAvatarUrl = optionalTrimmedString.pipe(
  z
    .string()
    .refine(
      (value) =>
        value === "/api/account/avatar" ||
        value.startsWith("/api/account/avatar?") ||
        z.string().url().safeParse(value).success,
      "La URL del avatar no es valida."
    )
    .optional()
);
const nameSchema = z.string().trim().min(1).max(80);

export const updateAccountProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: optionalTrimmedString.pipe(z.string().trim().max(30).optional()),
  avatarUrl: optionalAvatarUrl
});

export const updateAccountStudioSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: optionalMinString.pipe(z.string().trim().max(160).optional()),
  taxId: z.string().regex(/^\d{11}$/, "El CUIT/CUIL debe tener exactamente 11 dígitos numéricos."),
  country: z.string().trim().min(2).max(80),
  province: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  address: optionalTrimmedString.pipe(z.string().trim().max(180).optional()),
  website: optionalUrl,
  logoUrl: optionalUrl
});

export const updateAccountNotificationsSchema = z.object({
  browserNotifications: z.boolean(),
  inAppReminders: z.boolean(),
  emailReminders: z.boolean(),
  dailyDigest: z.boolean(),
  reminderLeadTime: z.coerce.number().int().min(0).max(720)
});

export const updateAccountMembershipSchema = z.object({
  accountPlan: z.string().trim().min(2).max(40),
  accountPlanStatus: z.string().trim().min(2).max(40),
  monthlyTokenLimit: z.coerce.number().int().min(0).max(10000000)
});

export const updateAccountPasswordSchema = z
  .object({
    currentPassword: z.string().max(72).optional(),
    newPassword: z
      .string()
      .min(8, "La nueva contrasena debe tener al menos 8 caracteres.")
      .max(72, "La nueva contrasena no puede superar 72 caracteres.")
      .regex(/[A-Za-z]/, "La nueva contrasena debe incluir al menos una letra.")
      .regex(/[0-9]/, "La nueva contrasena debe incluir al menos un numero.")
  })
  .refine((value) => !value.currentPassword || value.currentPassword !== value.newPassword, {
    message: "La nueva contrasena no puede ser igual a la actual.",
    path: ["newPassword"]
  });

export class UpdateAccountProfileDto extends createZodDto(updateAccountProfileSchema) {
  @ApiProperty({ example: "Mateo" })
  firstName!: string;

  @ApiProperty({ example: "Alvarez" })
  lastName!: string;

  @ApiProperty({ required: false, nullable: true, example: "+54 11 5555-5555" })
  phone?: string;

  @ApiProperty({ required: false, nullable: true, example: "https://cdn.temis.local/avatar.png" })
  avatarUrl?: string;
}

export class UpdateAccountStudioDto extends createZodDto(updateAccountStudioSchema) {
  @ApiProperty({ example: "Estudio Alvarez" })
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: "Estudio Alvarez y Asociados" })
  legalName?: string;

  @ApiProperty({ example: "20123456789" })
  taxId!: string;

  @ApiProperty({ example: "Argentina" })
  country!: string;

  @ApiProperty({ example: "Buenos Aires" })
  province!: string;

  @ApiProperty({ example: "La Plata" })
  city!: string;

  @ApiProperty({ required: false, nullable: true, example: "Calle 12 345" })
  address?: string;

  @ApiProperty({ required: false, nullable: true, example: "https://estudio.com" })
  website?: string;

  @ApiProperty({ required: false, nullable: true, example: "https://cdn.temis.local/logo.png" })
  logoUrl?: string;
}

export class UpdateAccountNotificationsDto extends createZodDto(updateAccountNotificationsSchema) {
  @ApiProperty({ example: false })
  browserNotifications!: boolean;

  @ApiProperty({ example: true })
  inAppReminders!: boolean;

  @ApiProperty({ example: false })
  emailReminders!: boolean;

  @ApiProperty({ example: false })
  dailyDigest!: boolean;

  @ApiProperty({ example: 24 })
  reminderLeadTime!: number;
}

export class UpdateAccountMembershipDto extends createZodDto(updateAccountMembershipSchema) {
  @ApiProperty({ example: "trial" })
  accountPlan!: string;

  @ApiProperty({ example: "active" })
  accountPlanStatus!: string;

  @ApiProperty({ example: 100000 })
  monthlyTokenLimit!: number;
}

export class UpdateAccountPasswordDto extends createZodDto(updateAccountPasswordSchema) {
  @ApiProperty({ required: false, maxLength: 72, example: "password123" })
  currentPassword?: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: "password456" })
  newPassword!: string;
}

export class UpdateAccountPasswordResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}

export class AccountAvatarUploadResponseDto {
  @ApiProperty({ example: "/api/account/avatar" })
  avatarUrl!: string;
}

export class AccountProfileDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Mateo" })
  firstName!: string;

  @ApiProperty({ example: "Alvarez" })
  lastName!: string;

  @ApiProperty({ example: "Mateo Alvarez" })
  fullName!: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl!: string | null;

  @ApiProperty({ example: true })
  hasPassword!: boolean;
}

export class AccountStudioDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Estudio Alvarez" })
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  legalName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  taxId!: string | null;

  @ApiProperty({ example: "Argentina" })
  country!: string;

  @ApiProperty({ example: "Buenos Aires" })
  province!: string;

  @ApiProperty({ example: "La Plata" })
  city!: string;

  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: String })
  website!: string | null;

  @ApiProperty({ nullable: true, type: String })
  logoUrl!: string | null;
}

export class AccountMembershipDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ nullable: true, type: String })
  roleCode!: string | null;

  @ApiProperty({ nullable: true, type: String })
  roleName!: string | null;

  @ApiProperty({ enum: ["invited", "active", "suspended"] })
  status!: "invited" | "active" | "suspended";

  @ApiProperty({ example: "trial" })
  accountPlan!: string;

  @ApiProperty({ example: "active" })
  accountPlanStatus!: string;

  @ApiProperty({ example: 100000 })
  monthlyTokenLimit!: number;
}

export class AccountNotificationsDto {
  @ApiProperty({ example: false })
  browserNotifications!: boolean;

  @ApiProperty({ example: true })
  inAppReminders!: boolean;

  @ApiProperty({ example: false })
  emailReminders!: boolean;

  @ApiProperty({ example: false })
  dailyDigest!: boolean;

  @ApiProperty({ example: 24 })
  reminderLeadTime!: number;
}

export class AccountTokenUsageDto {
  @ApiProperty({ example: "2026-08-01T00:00:00.000Z" })
  periodStart!: string;

  @ApiProperty({ example: "2026-09-01T00:00:00.000Z" })
  periodEnd!: string;

  @ApiProperty({ example: 12500 })
  usedTokens!: number;

  @ApiProperty({ example: 87500 })
  remainingTokens!: number;
}

export class AccountAiUsageMetricsDto {
  @ApiProperty({ example: 2226200000 })
  totalTokens!: number;

  @ApiProperty({ example: 98700000 })
  maxDailyTokens!: number;

  @ApiProperty({ example: 9 })
  currentStreak!: number;

  @ApiProperty({ example: 21 })
  longestStreak!: number;
}

export class AccountAiUsageDayDto {
  @ApiProperty({ example: "2026-08-31" })
  date!: string;

  @ApiProperty({ example: 1200 })
  inputTokens!: number;

  @ApiProperty({ example: 3400 })
  outputTokens!: number;

  @ApiProperty({ example: 4600 })
  totalTokens!: number;
}

export class AccountAiUsageResponseDto {
  @ApiProperty({ type: AccountProfileDto })
  profile!: AccountProfileDto;

  @ApiProperty({ type: AccountMembershipDto })
  membership!: AccountMembershipDto;

  @ApiProperty({ type: AccountTokenUsageDto })
  tokenUsage!: AccountTokenUsageDto;

  @ApiProperty({ example: "2025-09-01T00:00:00.000Z" })
  historyPeriodStart!: string;

  @ApiProperty({ example: "2026-09-01T00:00:00.000Z" })
  historyPeriodEnd!: string;

  @ApiProperty({ type: AccountAiUsageMetricsDto })
  metrics!: AccountAiUsageMetricsDto;

  @ApiProperty({ type: [AccountAiUsageDayDto] })
  dailyUsage!: AccountAiUsageDayDto[];
}

export class AccountPermissionsDto {
  @ApiProperty({ example: true })
  canManageStudio!: boolean;

  @ApiProperty({ example: true })
  canManageMembership!: boolean;

  @ApiProperty({ example: true })
  canImportSae!: boolean;
}

export class AccountResponseDto {
  @ApiProperty({ type: AccountProfileDto })
  profile!: AccountProfileDto;

  @ApiProperty({ type: AccountStudioDto })
  studio!: AccountStudioDto;

  @ApiProperty({ type: AccountMembershipDto })
  membership!: AccountMembershipDto;

  @ApiProperty({ type: AccountNotificationsDto })
  notifications!: AccountNotificationsDto;

  @ApiProperty({ type: AccountTokenUsageDto })
  tokenUsage!: AccountTokenUsageDto;

  @ApiProperty({ type: AccountPermissionsDto })
  permissions!: AccountPermissionsDto;
}

export type UpdateAccountProfileInput = z.infer<typeof updateAccountProfileSchema>;
export type UpdateAccountStudioInput = z.infer<typeof updateAccountStudioSchema>;
export type UpdateAccountNotificationsInput = z.infer<typeof updateAccountNotificationsSchema>;
export type UpdateAccountMembershipInput = z.infer<typeof updateAccountMembershipSchema>;
export type UpdateAccountPasswordInput = z.infer<typeof updateAccountPasswordSchema>;
