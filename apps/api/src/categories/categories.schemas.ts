import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { booleanInputSchema, optionalBooleanInputSchema } from "../common/boolean.schemas";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

export const financeCategoryKindSchema = z.enum(["income", "expense", "both"]);
export const financeCategoryOriginSchema = z.enum(["global", "tenant"]);

export const listCategoriesQuerySchema = z.object({
  active: optionalBooleanInputSchema,
  cursor: optionalTrimmedString,
  kind: financeCategoryKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  origin: financeCategoryOriginSchema.optional(),
  search: optionalTrimmedString,
  sortBy: z.enum(["name", "kind", "origin", "active"]).default("name"),
  sortDirection: z.enum(["asc", "desc"]).default("asc")
});

export const createCategorySchema = z.object({
  active: booleanInputSchema(true),
  kind: financeCategoryKindSchema,
  name: z.string().trim().min(2).max(80)
});

export const updateCategorySchema = z.object({
  active: optionalBooleanInputSchema,
  kind: financeCategoryKindSchema,
  name: z.string().trim().min(2).max(80)
});

export class ListCategoriesQueryDto extends createZodDto(listCategoriesQuerySchema) {}

export class CreateCategoryDto extends createZodDto(createCategorySchema) {
  @ApiProperty({ example: "Honorarios", minLength: 2, maxLength: 80 })
  name!: string;

  @ApiProperty({ enum: ["income", "expense", "both"], example: "income" })
  kind!: FinanceCategoryKindDto;

  @ApiProperty({ required: false, example: true })
  active!: boolean;
}

export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {
  @ApiProperty({ example: "Honorarios", minLength: 2, maxLength: 80 })
  name!: string;

  @ApiProperty({ enum: ["income", "expense", "both"], example: "income" })
  kind!: FinanceCategoryKindDto;

  @ApiProperty({ required: false, example: true })
  active?: boolean;
}

export class CategoryDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Pago de cliente" })
  name!: string;

  @ApiProperty({ enum: ["income", "expense", "both"], example: "income" })
  kind!: FinanceCategoryKindDto;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ enum: ["global", "tenant"], example: "global" })
  origin!: FinanceCategoryOriginDto;

  @ApiProperty({ required: false, example: "pago-de-cliente" })
  code?: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ format: "date-time" })
  updatedAt!: Date;
}

export class CategoryMetricsDto {
  @ApiProperty({ example: 15 })
  global!: number;

  @ApiProperty({ example: 3 })
  tenant!: number;

  @ApiProperty({ example: 18 })
  active!: number;
}

export class CategoryPageInfoDto {
  @ApiProperty({ example: 12 })
  limit!: number;

  @ApiProperty({ example: "eyJ2YWx1ZSI6IlBhZ28iLCJpZCI6Ii4uLiJ9", nullable: true })
  nextCursor!: string | null;

  @ApiProperty({ example: false })
  hasNextPage!: boolean;
}

export class CategoryListResponseDto {
  @ApiProperty({ type: [CategoryDto] })
  items!: CategoryDto[];

  @ApiProperty({ type: CategoryMetricsDto })
  metrics!: CategoryMetricsDto;

  @ApiProperty({ type: CategoryPageInfoDto })
  pageInfo!: CategoryPageInfoDto;
}

export class CategoryDeleteResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}

export type FinanceCategoryKindDto = z.infer<typeof financeCategoryKindSchema>;
export type FinanceCategoryOriginDto = z.infer<typeof financeCategoryOriginSchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
