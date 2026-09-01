import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { optionalBooleanInputSchema } from "../common/boolean.schemas";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/)
  .transform((value) => value.toUpperCase());

export const listCurrenciesQuerySchema = z.object({
  active: optionalBooleanInputSchema,
  limit: z.coerce.number().int().min(1).max(100).default(12),
  offset: z.coerce.number().int().min(0).default(0),
  search: optionalTrimmedString,
  sortBy: z.enum(["name", "code", "active"]).default("name"),
  sortDirection: z.enum(["asc", "desc"]).default("asc")
});

export const listTenantCurrenciesQuerySchema = z.object({
  active: optionalBooleanInputSchema,
  cursor: optionalTrimmedString,
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: optionalTrimmedString,
  sortBy: z.enum(["name", "code", "active"]).default("name"),
  sortDirection: z.enum(["asc", "desc"]).default("asc")
});

export const listAvailableTenantCurrenciesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  search: optionalTrimmedString
});

export const createCurrencySchema = z.object({
  code: currencyCodeSchema,
  name: z.string().trim().min(2).max(80),
  symbol: z.string().trim().min(1).max(8)
});

export const updateCurrencySchema = z.object({
  active: optionalBooleanInputSchema,
  name: z.string().trim().min(2).max(80),
  symbol: z.string().trim().min(1).max(8)
});

export const addTenantCurrenciesSchema = z.object({
  currencyCodes: z.array(currencyCodeSchema).min(1).max(25).transform((codes) => [...new Set(codes)])
});

export class ListCurrenciesQueryDto extends createZodDto(listCurrenciesQuerySchema) {}
export class ListTenantCurrenciesQueryDto extends createZodDto(
  listTenantCurrenciesQuerySchema
) {}
export class ListAvailableTenantCurrenciesQueryDto extends createZodDto(
  listAvailableTenantCurrenciesQuerySchema
) {}

export class CreateCurrencyDto extends createZodDto(createCurrencySchema) {
  @ApiProperty({ example: "Peso argentino", minLength: 2, maxLength: 80 })
  name!: string;

  @ApiProperty({ example: "ARS", minLength: 3, maxLength: 3 })
  code!: string;

  @ApiProperty({ example: "$", minLength: 1, maxLength: 8 })
  symbol!: string;
}

export class UpdateCurrencyDto extends createZodDto(updateCurrencySchema) {
  @ApiProperty({ example: "Peso argentino", minLength: 2, maxLength: 80 })
  name!: string;

  @ApiProperty({ example: "$", minLength: 1, maxLength: 8 })
  symbol!: string;

  @ApiProperty({ required: false, example: true })
  active?: boolean;
}

export class AddTenantCurrenciesDto extends createZodDto(addTenantCurrenciesSchema) {
  @ApiProperty({ example: ["USD", "BRL"], isArray: true, minItems: 1, maxItems: 25, type: String })
  currencyCodes!: string[];
}

export class CurrencyDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Peso argentino" })
  name!: string;

  @ApiProperty({ example: "ARS" })
  code!: string;

  @ApiProperty({ example: "$" })
  symbol!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: "1250.00", required: false })
  cashboxBalance?: string;
}

export class CurrencyMetricsDto {
  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 3 })
  active!: number;

  @ApiProperty({ example: 0 })
  inactive!: number;
}

export class CurrencyPageInfoDto {
  @ApiProperty({ example: 12 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: false })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}

export class TenantCurrencyMetricsDto {
  @ApiProperty({ example: 2 })
  available!: number;

  @ApiProperty({ example: 1 })
  active!: number;
}

export class TenantCurrencyPageInfoDto {
  @ApiProperty({ example: 12 })
  limit!: number;

  @ApiProperty({ example: "eyJ2YWx1ZSI6IlVTRCIsImlkIjoiLi4uIn0", nullable: true })
  nextCursor!: string | null;

  @ApiProperty({ example: false })
  hasNextPage!: boolean;
}

export class CurrencyListResponseDto {
  @ApiProperty({ type: [CurrencyDto] })
  items!: CurrencyDto[];

  @ApiProperty({ type: CurrencyMetricsDto })
  metrics!: CurrencyMetricsDto;

  @ApiProperty({ type: CurrencyPageInfoDto })
  pageInfo!: CurrencyPageInfoDto;
}

export class TenantCurrencyListResponseDto {
  @ApiProperty({ type: [CurrencyDto] })
  items!: CurrencyDto[];

  @ApiProperty({ type: TenantCurrencyMetricsDto })
  metrics!: TenantCurrencyMetricsDto;

  @ApiProperty({ type: TenantCurrencyPageInfoDto })
  pageInfo!: TenantCurrencyPageInfoDto;
}

export class CurrencyDeleteResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}

export class AddTenantCurrenciesResponseDto {
  @ApiProperty({ type: [CurrencyDto] })
  items!: CurrencyDto[];
}

export class AvailableTenantCurrenciesResponseDto {
  @ApiProperty({ type: [CurrencyDto] })
  items!: CurrencyDto[];
}

export type ListCurrenciesQuery = z.infer<typeof listCurrenciesQuerySchema>;
export type ListTenantCurrenciesQuery = z.infer<typeof listTenantCurrenciesQuerySchema>;
export type ListAvailableTenantCurrenciesQuery = z.infer<
  typeof listAvailableTenantCurrenciesQuerySchema
>;
export type CreateCurrencyInput = z.infer<typeof createCurrencySchema>;
export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;
export type AddTenantCurrenciesInput = z.infer<typeof addTenantCurrenciesSchema>;
