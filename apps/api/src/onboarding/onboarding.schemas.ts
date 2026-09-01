import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const roleCodeSchema = z.enum(["admin", "lawyer", "paralegal", "accounting", "viewer"]);
const caseNumberingModeSchema = z.enum(["manual", "automatic"]);
const documentStorageModeSchema = z.enum(["local", "s3"]);
const onboardingChecklistStepIdSchema = z.enum([
  "import_cases",
  "configure_finance",
  "configure_notifications",
  "connect_calendar"
]);
const updateOnboardingChecklistStepStatusSchema = z.enum(["completed", "skipped"]);
const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional()
);
const optionalStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(2).optional()
);

export const startOnboardingSchema = z.object({
  owner: z
    .object({
      fullName: z.string().trim().min(2),
      email: z.string().trim().toLowerCase().email()
    })
    .optional(),
  tenant: z.object({
    name: z.string().min(2),
    legalName: optionalStringSchema,
    taxId: z
      .string()
      .regex(/^\d{11}$/, "El CUIT/CUIL debe tener exactamente 11 dígitos numéricos."),
    country: z.string().min(2).default("Argentina"),
    province: z.string().min(2),
    city: z.string().min(2),
    timezone: z.string().min(2).default("America/Argentina/Buenos_Aires"),
    defaultCurrency: z.string().length(3).default("ARS"),
    address: z.string().optional(),
    website: optionalUrlSchema,
    logoUrl: optionalUrlSchema,
    size: z.string().optional(),
    mainPracticeAreas: z.array(z.string().min(2)).default([]),
    referralSource: z.string().optional()
  }),
  workspace: z.object({
    practiceAreaCodes: z.array(z.string().trim().min(1)).default([]),
    practiceAreas: z.array(z.string().min(2)).default([]),
    defaultRoleForInvites: roleCodeSchema.default("lawyer"),
    caseNumberingMode: caseNumberingModeSchema.default("manual"),
    documentStorageMode: documentStorageModeSchema.default("local")
  })
});

export class StartOnboardingOwnerDto {
  @ApiProperty({ example: "Mateo Alvarez" })
  fullName!: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;
}

export class StartOnboardingTenantDto {
  @ApiProperty({ example: "Estudio Alvarez" })
  name!: string;

  @ApiProperty({ required: false, example: "Estudio Juridico Alvarez" })
  legalName?: string;

  @ApiProperty({ example: "20123456789" })
  taxId!: string;

  @ApiProperty({ example: "Argentina" })
  country!: string;

  @ApiProperty({ example: "Tucuman" })
  province!: string;

  @ApiProperty({ example: "San Miguel de Tucuman" })
  city!: string;

  @ApiProperty({ example: "America/Argentina/Buenos_Aires" })
  timezone!: string;

  @ApiProperty({ example: "ARS" })
  defaultCurrency!: string;

  @ApiProperty({ required: false, example: "Calle 25 de Mayo 123" })
  address?: string;

  @ApiProperty({ required: false, example: "https://estudio.com" })
  website?: string;

  @ApiProperty({ required: false, example: "https://estudio.com/logo.png" })
  logoUrl?: string;

  @ApiProperty({ required: false, example: "small" })
  size?: string;

  @ApiProperty({ required: false, type: [String], example: ["derecho-civil", "derecho-familia"] })
  mainPracticeAreas?: string[];

  @ApiProperty({ required: false, example: "referido" })
  referralSource?: string;
}

export class StartOnboardingWorkspaceDto {
  @ApiProperty({ required: false, type: [String], example: ["derecho-civil", "derecho-familia"] })
  practiceAreaCodes?: string[];

  @ApiProperty({ required: false, type: [String], example: ["Derecho Civil"] })
  practiceAreas?: string[];

  @ApiProperty({ required: false, enum: ["admin", "lawyer", "paralegal", "accounting", "viewer"] })
  defaultRoleForInvites?: z.infer<typeof roleCodeSchema>;

  @ApiProperty({ required: false, enum: ["manual", "automatic"] })
  caseNumberingMode?: z.infer<typeof caseNumberingModeSchema>;

  @ApiProperty({ required: false, enum: ["local", "s3"] })
  documentStorageMode?: z.infer<typeof documentStorageModeSchema>;
}

export class StartOnboardingDto extends createZodDto(startOnboardingSchema) {
  @ApiProperty({
    required: false,
    type: StartOnboardingOwnerDto
  })
  owner?: z.infer<typeof startOnboardingSchema>["owner"];

  @ApiProperty({
    type: StartOnboardingTenantDto
  })
  tenant!: z.infer<typeof startOnboardingSchema>["tenant"];

  @ApiProperty({
    type: StartOnboardingWorkspaceDto
  })
  workspace!: z.infer<typeof startOnboardingSchema>["workspace"];
}

export class OnboardingTokenDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: "Bearer" })
  tokenType!: "Bearer";
}

export class StartOnboardingResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ example: "owner" })
  role!: string;

  @ApiProperty({ type: OnboardingTokenDto })
  tokens!: OnboardingTokenDto;
}

export class OnboardingStatusDto {
  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  hasProfile!: boolean;

  @ApiProperty()
  hasSettings!: boolean;

  @ApiProperty()
  hasPracticeAreas!: boolean;

  @ApiProperty()
  hasInvitedTeam!: boolean;

  @ApiProperty()
  hasFirstClient!: boolean;

  @ApiProperty()
  hasFirstCase!: boolean;

  @ApiProperty()
  hasFirstDocument!: boolean;

  @ApiProperty({ type: [String] })
  missingSteps!: string[];
}

export class OnboardingChecklistStepDto {
  @ApiProperty({
    enum: ["import_cases", "configure_finance", "configure_notifications", "connect_calendar"]
  })
  id!: OnboardingChecklistStepId;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ["pending", "completed", "skipped"] })
  status!: OnboardingChecklistStepStatus;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty({ required: false, nullable: true, type: String })
  requiredPermission?: string | null;

  @ApiProperty()
  actionLabel!: string;
}

export class OnboardingChecklistResponseDto {
  @ApiProperty({ example: 50 })
  progress!: number;

  @ApiProperty()
  completedCount!: number;

  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  hidden!: boolean;

  @ApiProperty({ type: [OnboardingChecklistStepDto] })
  steps!: OnboardingChecklistStepDto[];
}

export class UpdateOnboardingChecklistStepDto extends createZodDto(
  z.object({
    status: updateOnboardingChecklistStepStatusSchema
  })
) {
  @ApiProperty({ enum: ["completed", "skipped"] })
  status!: UpdateOnboardingChecklistStepStatus;
}

export type OnboardingChecklistStepId = z.infer<typeof onboardingChecklistStepIdSchema>;
export type OnboardingChecklistStepStatus = "pending" | "completed" | "skipped";
export type UpdateOnboardingChecklistStepStatus = z.infer<
  typeof updateOnboardingChecklistStepStatusSchema
>;

export function parseOnboardingChecklistStepId(value: string) {
  return onboardingChecklistStepIdSchema.parse(value);
}
