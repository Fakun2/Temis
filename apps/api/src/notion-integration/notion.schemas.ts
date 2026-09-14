import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

export const notionPropertyMappingSchema = z.object({
  title: z.string().trim().min(1).default("Name"),
  status: z.string().trim().min(1).default("Status"),
  dueDate: z.string().trim().min(1).default("Fecha objetivo"),
  assignee: optionalTrimmedString.default(""),
  case: optionalTrimmedString.default(""),
  notes: optionalTrimmedString.default("Notas")
});

export const notionStatusMappingSchema = z
  .record(z.enum(["pending", "in_progress", "completed", "cancelled"]))
  .default({
    "Por hacer": "pending",
    Pending: "pending",
    "To do": "pending",
    "En curso": "in_progress",
    "In progress": "in_progress",
    Finalizado: "completed",
    Done: "completed",
    Completed: "completed",
    Cancelado: "cancelled",
    Cancelled: "cancelled"
  });

export const listNotionDataSourcesQuerySchema = z.object({
  search: optionalTrimmedString,
  cursor: optionalTrimmedString,
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const createNotionMappingSchema = z.object({
  dataSourceId: z.string().trim().min(1),
  dataSourceName: z.string().trim().min(1).max(160),
  enabled: z.boolean().default(true),
  syncIntervalMinutes: z.coerce.number().int().min(5).max(1440).default(15),
  propertyMapping: notionPropertyMappingSchema.default({}),
  statusMapping: notionStatusMappingSchema
});

export const updateNotionMappingSchema = createNotionMappingSchema
  .omit({ dataSourceId: true })
  .partial();

export const resolveNotionConflictSchema = z.object({
  resolution: z.enum(["bogapp", "notion", "manual"]),
  manualTask: z
    .object({
      name: optionalTrimmedString,
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
      endDate: optionalTrimmedString,
      notes: optionalTrimmedString
    })
    .optional()
});

export class ListNotionDataSourcesQueryDto extends createZodDto(
  listNotionDataSourcesQuerySchema
) {}
export class CreateNotionMappingDto extends createZodDto(createNotionMappingSchema) {}
export class UpdateNotionMappingDto extends createZodDto(updateNotionMappingSchema) {}
export class ResolveNotionConflictDto extends createZodDto(resolveNotionConflictSchema) {}

export class NotionConnectionDto {
  @ApiProperty({ example: true })
  connected!: boolean;

  @ApiPropertyOptional({ example: "Mi Workspace" })
  workspaceName?: string | null;

  @ApiPropertyOptional({ example: "workspace-id" })
  workspaceId?: string | null;

  @ApiPropertyOptional({ format: "date-time" })
  lastSyncAt?: string | null;
}

export class NotionMappingDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  dataSourceId!: string;

  @ApiProperty()
  dataSourceName!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  syncIntervalMinutes!: number;

  @ApiProperty({
    additionalProperties: true,
    example: {
      case: "Expediente",
      title: "Name",
      status: "Status",
      dueDate: "Fecha objetivo",
      notes: "Notas"
    },
    type: "object"
  })
  propertyMapping!: z.infer<typeof notionPropertyMappingSchema>;

  @ApiProperty({
    additionalProperties: { enum: ["pending", "in_progress", "completed", "cancelled"], type: "string" },
    example: {
      "Por hacer": "pending",
      "En curso": "in_progress",
      Finalizado: "completed"
    },
    type: "object"
  })
  statusMapping!: z.infer<typeof notionStatusMappingSchema>;

  @ApiPropertyOptional({ format: "date-time" })
  lastPullAt!: string | null;

  @ApiPropertyOptional({ format: "date-time" })
  lastPushAt!: string | null;
}

export class NotionIntegrationStatusDto {
  @ApiProperty({ type: NotionConnectionDto })
  connection!: NotionConnectionDto;

  @ApiProperty({ type: [NotionMappingDto] })
  mappings!: NotionMappingDto[];

  @ApiProperty()
  openConflicts!: number;
}

export class NotionOAuthStartDto {
  @ApiProperty()
  authorizationUrl!: string;
}

export class NotionDataSourceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;
}

export class NotionDataSourcesResponseDto {
  @ApiProperty({ type: [NotionDataSourceDto] })
  items!: NotionDataSourceDto[];

  @ApiPropertyOptional()
  nextCursor!: string | null;
}

export class NotionSyncResultDto {
  @ApiProperty()
  status!: "completed" | "failed";

  @ApiProperty()
  imported!: number;

  @ApiProperty()
  updated!: number;

  @ApiProperty()
  pushed!: number;

  @ApiProperty()
  conflicts!: number;
}

export class NotionConflictDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiPropertyOptional({ format: "uuid" })
  taskId!: string | null;

  @ApiPropertyOptional()
  notionPageId!: string | null;

  @ApiProperty()
  dataSourceName!: string;

  @ApiProperty({ additionalProperties: true, type: "object" })
  fieldDiff!: unknown;

  @ApiProperty({ format: "date-time" })
  detectedAt!: string;
}

export class NotionConflictsResponseDto {
  @ApiProperty({ type: [NotionConflictDto] })
  items!: NotionConflictDto[];
}

export type CreateNotionMappingInput = z.infer<typeof createNotionMappingSchema>;
export type UpdateNotionMappingInput = z.infer<typeof updateNotionMappingSchema>;
export type ResolveNotionConflictInput = z.infer<typeof resolveNotionConflictSchema>;
export type ListNotionDataSourcesQuery = z.infer<typeof listNotionDataSourcesQuerySchema>;
export type NotionPropertyMapping = z.infer<typeof notionPropertyMappingSchema>;
export type NotionStatusMapping = z.infer<typeof notionStatusMappingSchema>;
