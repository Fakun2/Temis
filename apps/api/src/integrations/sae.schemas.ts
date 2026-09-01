import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const saePreviewSchema = z.object({
  username: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(500)
});

export const saeImportSchema = z.object({
  importSessionId: z.string().uuid(),
  selectedExternalIds: z.array(z.string().trim().min(1)).min(1).max(500)
});

export class SaePreviewDto extends createZodDto(saePreviewSchema) {
  @ApiProperty()
  username!: string;

  @ApiProperty({ format: "password" })
  password!: string;
}

export class SaeImportDto extends createZodDto(saeImportSchema) {}

export class SaePreviewItemDto {
  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  caption!: string;

  @ApiProperty({ nullable: true, type: String })
  jurisdictionText!: string | null;

  @ApiProperty({ nullable: true, type: String })
  unitText!: string | null;

  @ApiProperty({ nullable: true, type: String })
  court!: string | null;

  @ApiProperty({ nullable: true, type: String })
  provinceText!: string | null;

  @ApiProperty({ enum: ["open", "paused", "closed"] })
  suggestedStatus!: "open" | "paused" | "closed";

  @ApiProperty({ enum: ["create", "update"] })
  action!: "create" | "update";

  @ApiProperty({ type: [String] })
  warnings!: string[];
}

export class SaePreviewSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  createCount!: number;

  @ApiProperty()
  updateCount!: number;

  @ApiProperty()
  warningCount!: number;
}

export class SaePreviewResponseDto {
  @ApiProperty({ format: "uuid" })
  importSessionId!: string;

  @ApiProperty({ format: "date-time" })
  expiresAt!: string;

  @ApiProperty({ type: [SaePreviewItemDto] })
  items!: SaePreviewItemDto[];

  @ApiProperty({ type: SaePreviewSummaryDto })
  summary!: SaePreviewSummaryDto;
}

export class SaeImportItemDto {
  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty({ format: "uuid", nullable: true, type: String })
  caseId!: string | null;

  @ApiProperty({ enum: ["imported", "updated", "skipped"] })
  status!: "imported" | "updated" | "skipped";

  @ApiProperty({ nullable: true, type: String })
  message!: string | null;
}

export class SaeImportResponseDto {
  @ApiProperty()
  importedCount!: number;

  @ApiProperty()
  updatedCount!: number;

  @ApiProperty()
  skippedCount!: number;

  @ApiProperty({ type: [SaeImportItemDto] })
  items!: SaeImportItemDto[];
}

export type SaePreviewInput = z.infer<typeof saePreviewSchema>;
export type SaeImportInput = z.infer<typeof saeImportSchema>;
export type SaeCaseStatus = SaePreviewItemDto["suggestedStatus"];
