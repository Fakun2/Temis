import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { booleanInputSchema } from "../common/boolean.schemas";
import { CatalogPageInfoDto } from "../legal-catalogs/pagination.schemas";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

export const listForumsQuerySchema = z.object({
  includeInactive: booleanInputSchema(false),
  limit: z.coerce.number().int().min(1).max(50).default(8),
  offset: z.coerce.number().int().min(0).default(0),
  judicialCenterId: optionalTrimmedString.pipe(z.string().uuid().optional()),
  provinceId: optionalTrimmedString.pipe(z.string().uuid().optional()),
  search: optionalTrimmedString,
  sort: z.enum(["name:asc", "name:desc"]).default("name:asc")
});

export class ListForumsQueryDto extends createZodDto(listForumsQuerySchema) {}

export class ForumProvinceDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "ar-jujuy" })
  code!: string;

  @ApiProperty({ example: "Jujuy" })
  name!: string;

  @ApiProperty({ nullable: true, type: String, example: "Jujuy" })
  province!: string | null;

  @ApiProperty({ example: "Argentina" })
  country!: string;
}

export class ForumTemplateSummaryDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "ar-jujuy-ambiental" })
  code!: string;
}

export class ForumDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Ambiental" })
  name!: string;

  @ApiProperty({ format: "uuid", type: String })
  provinceId!: string | null;

  @ApiProperty({ format: "uuid", type: String })
  templateId!: string;

  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  judicialCenterForumId!: string | null;

  @ApiProperty({ example: true })
  isSystem!: boolean;

  @ApiProperty({ example: false })
  custom!: boolean;

  @ApiProperty({ nullable: true, type: ForumProvinceDto })
  province!: ForumProvinceDto | null;

  @ApiProperty({ nullable: true, type: ForumTemplateSummaryDto })
  template!: ForumTemplateSummaryDto;

  @ApiProperty({ nullable: true, type: String, example: "Fuero oficial del Poder Judicial." })
  description!: string | null;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: "2026-07-14T15:30:00.000Z" })
  createdAt!: Date;

  @ApiProperty({ example: "2026-07-14T15:30:00.000Z" })
  updatedAt!: Date;
}

export class ForumsListResponseDto {
  @ApiProperty({ type: [ForumDto] })
  items!: ForumDto[];

  @ApiProperty({ type: CatalogPageInfoDto })
  pageInfo!: CatalogPageInfoDto;
}

export type ListForumsQuery = z.infer<typeof listForumsQuerySchema>;
