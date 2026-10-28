import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const optionalString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional()
  );
const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().datetime().optional()
);

export const announcementCategorySchema = z.enum([
  "general",
  "maintenance",
  "deployment",
  "incident"
]);
export const announcementSeveritySchema = z.enum(["info", "warning", "critical"]);
export const announcementAudienceSchema = z.enum(["all_tenants", "selected_tenants"]);
export const announcementStatusSchema = z.enum(["draft", "published", "cancelled"]);
export const announcementDeliveryModeSchema = z.enum(["draft", "publish_now", "schedule"]);

const announcementInputSchema = z.object({
  audience: announcementAudienceSchema,
  body: z.string().trim().min(1).max(1000),
  category: announcementCategorySchema,
  endsAt: optionalDate,
  linkLabel: optionalString(40),
  linkUrl: optionalString(500),
  severity: announcementSeveritySchema,
  startsAt: optionalDate,
  targetTenantIds: z.array(z.string().uuid()).max(250).optional(),
  title: z.string().trim().min(1).max(120)
});

function refineAnnouncementInput(
  input: z.infer<typeof announcementInputSchema>,
  context: z.RefinementCtx
) {
  if (input.audience === "selected_tenants" && !input.targetTenantIds?.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Seleccioná al menos un estudio.",
      path: ["targetTenantIds"]
    });
  }
  if (Boolean(input.linkLabel) !== Boolean(input.linkUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La etiqueta y el enlace deben completarse juntos.",
      path: input.linkUrl ? ["linkLabel"] : ["linkUrl"]
    });
  }
  if (input.linkUrl && !input.linkUrl.startsWith("/") && !input.linkUrl.startsWith("https://")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El enlace debe usar HTTPS o ser una ruta interna.",
      path: ["linkUrl"]
    });
  }
  if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La finalización debe ser posterior al inicio.",
      path: ["endsAt"]
    });
  }
}

export const createPlatformAnnouncementSchema = announcementInputSchema
  .extend({
    deliveryMode: announcementDeliveryModeSchema.default("draft")
  })
  .superRefine((input, context) => {
    refineAnnouncementInput(input, context);
    if (input.deliveryMode === "draft" && Boolean(input.startsAt) !== Boolean(input.endsAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El inicio y la finalización deben completarse juntos.",
        path: input.startsAt ? ["endsAt"] : ["startsAt"]
      });
    }
    if (input.deliveryMode === "publish_now" && !input.endsAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Definí una finalización futura.",
        path: ["endsAt"]
      });
    }
    if (input.deliveryMode === "schedule" && (!input.startsAt || !input.endsAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La programación requiere inicio y finalización.",
        path: input.startsAt ? ["endsAt"] : ["startsAt"]
      });
    }
  });
export const updatePlatformAnnouncementSchema = announcementInputSchema.superRefine(
  (input, context) => {
    refineAnnouncementInput(input, context);
    if (Boolean(input.startsAt) !== Boolean(input.endsAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El inicio y la finalización deben completarse juntos.",
        path: input.startsAt ? ["endsAt"] : ["startsAt"]
      });
    }
  }
);
export const listPlatformAnnouncementsQuerySchema = z.object({
  activity: z.enum(["active", "inactive"]).optional(),
  audience: announcementAudienceSchema.optional(),
  category: announcementCategorySchema.optional(),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: optionalString(120),
  severity: announcementSeveritySchema.optional(),
  status: announcementStatusSchema.optional()
});
export const listPlatformAnnouncementTenantOptionsQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: optionalString(120)
});

export class CreatePlatformAnnouncementDto extends createZodDto(createPlatformAnnouncementSchema) {}
export class UpdatePlatformAnnouncementDto extends createZodDto(updatePlatformAnnouncementSchema) {}
export class ListPlatformAnnouncementsQueryDto extends createZodDto(
  listPlatformAnnouncementsQuerySchema
) {}
export class ListPlatformAnnouncementTenantOptionsQueryDto extends createZodDto(
  listPlatformAnnouncementTenantOptionsQuerySchema
) {}

export class PlatformAnnouncementsPageInfoDto {
  @ApiProperty({ example: 20 }) limit!: number;
  @ApiProperty({ example: true }) hasNextPage!: boolean;
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}
export class PlatformAnnouncementListItemDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ enum: announcementCategorySchema.options })
  category!: z.infer<typeof announcementCategorySchema>;
  @ApiProperty({ enum: announcementSeveritySchema.options })
  severity!: z.infer<typeof announcementSeveritySchema>;
  @ApiProperty({ enum: announcementAudienceSchema.options })
  audience!: z.infer<typeof announcementAudienceSchema>;
  @ApiProperty({ enum: announcementStatusSchema.options })
  status!: z.infer<typeof announcementStatusSchema>;
  @ApiProperty({ enum: ["draft", "scheduled", "active", "expired", "cancelled"] })
  lifecycle!: "draft" | "scheduled" | "active" | "expired" | "cancelled";
  @ApiProperty() targetCount!: number;
  @ApiProperty() revision!: number;
  @ApiProperty() createdByName!: string;
  @ApiProperty({ format: "date-time", nullable: true, type: String }) startsAt!: Date | null;
  @ApiProperty({ format: "date-time", nullable: true, type: String }) endsAt!: Date | null;
  @ApiProperty({ nullable: true, type: String }) linkLabel!: string | null;
  @ApiProperty({ nullable: true, type: String }) linkUrl!: string | null;
  @ApiProperty({ format: "date-time", type: String }) createdAt!: Date;
  @ApiProperty({ format: "date-time", type: String }) updatedAt!: Date;
}
export class PlatformAnnouncementsSummaryDto {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() inactive!: number;
  @ApiProperty() general!: number;
  @ApiProperty({ format: "date-time" }) generatedAt!: string;
}
export class PlatformAnnouncementsListDto {
  @ApiProperty({ type: [PlatformAnnouncementListItemDto] })
  items!: PlatformAnnouncementListItemDto[];
  @ApiProperty({ type: PlatformAnnouncementsPageInfoDto })
  pageInfo!: PlatformAnnouncementsPageInfoDto;
  @ApiProperty({ format: "date-time" }) evaluatedAt!: string;
}
export class PlatformAnnouncementTenantOptionDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["active", "inactive"] }) status!: "active" | "inactive";
}
export class PlatformAnnouncementTenantOptionsListDto {
  @ApiProperty({ type: [PlatformAnnouncementTenantOptionDto] })
  items!: PlatformAnnouncementTenantOptionDto[];
  @ApiProperty({ type: PlatformAnnouncementsPageInfoDto })
  pageInfo!: PlatformAnnouncementsPageInfoDto;
}

export class PlatformAnnouncementDetailDto extends PlatformAnnouncementListItemDto {
  @ApiProperty({ type: [PlatformAnnouncementTenantOptionDto] })
  targetTenants!: PlatformAnnouncementTenantOptionDto[];
}

export type CreatePlatformAnnouncementInput = z.infer<typeof createPlatformAnnouncementSchema>;
export type UpdatePlatformAnnouncementInput = z.infer<typeof updatePlatformAnnouncementSchema>;
export type ListPlatformAnnouncementsQuery = z.infer<typeof listPlatformAnnouncementsQuerySchema>;
export type ListPlatformAnnouncementTenantOptionsQuery = z.infer<
  typeof listPlatformAnnouncementTenantOptionsQuerySchema
>;
