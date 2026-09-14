import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const maxCursorLength = 2048;
const maxSearchLength = 120;

const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalNullableText = (max: number) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().max(max).nullable().optional());
const optionalDigits = (length: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .trim()
      .regex(new RegExp(`^\\d{${length}}$`))
      .nullable()
      .optional()
  );

const optionalDniSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{7,8}$/)
    .nullable()
    .optional()
);
const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().toLowerCase().email().max(160).nullable().optional()
);
const optionalAgeSchema = z.preprocess(
  emptyStringToUndefined,
  z.number().int().min(0).max(120).nullable().optional()
);
const optionalSearchSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().max(maxSearchLength).optional()
);

export const clientTypeSchema = z.enum(["human", "legal_entity"]);
export const clientStatusSchema = z.enum(["active", "inactive", "archived"]);
export const mutableClientStatusSchema = z.enum(["active", "inactive"]);
export const clientSortSchema = z.enum(["name", "createdAt", "updatedAt", "status", "type"]);
export const clientOrderSchema = z.enum(["asc", "desc"]);

const commonClientInputShape = {
  address: optionalNullableText(240),
  cbu: optionalDigits(22),
  email: optionalEmailSchema,
  notes: optionalNullableText(4000),
  phone: optionalNullableText(40)
};

const humanClientInputShape = {
  age: optionalAgeSchema,
  cuil: optionalDigits(11),
  dni: optionalDniSchema,
  firstName: requiredText(80),
  lastName: requiredText(80),
  salaryReceiptRef: optionalNullableText(500)
};

const legalEntityClientInputShape = {
  businessName: requiredText(160),
  cuit: optionalDigits(11),
  statute: optionalNullableText(500)
};

export const createHumanClientSchema = z
  .object({
    ...commonClientInputShape,
    ...humanClientInputShape,
    status: mutableClientStatusSchema.default("active"),
    type: z.literal("human")
  })
  .strict();

export const createLegalEntityClientSchema = z
  .object({
    ...commonClientInputShape,
    ...legalEntityClientInputShape,
    status: mutableClientStatusSchema.default("active"),
    type: z.literal("legal_entity")
  })
  .strict();

export const createClientSchema = z
  .object({
    ...commonClientInputShape,
    age: humanClientInputShape.age,
    businessName: legalEntityClientInputShape.businessName.optional(),
    cuil: humanClientInputShape.cuil,
    cuit: legalEntityClientInputShape.cuit,
    dni: humanClientInputShape.dni,
    firstName: humanClientInputShape.firstName.optional(),
    lastName: humanClientInputShape.lastName.optional(),
    salaryReceiptRef: humanClientInputShape.salaryReceiptRef,
    statute: legalEntityClientInputShape.statute,
    status: mutableClientStatusSchema.default("active"),
    type: clientTypeSchema
  })
  .strict()
  .superRefine((input, context) => {
    if (input.type === "human") {
      requireFields(input, ["firstName", "lastName"], context);
      rejectFields(input, ["businessName", "cuit", "statute"], context);
      return;
    }

    requireFields(input, ["businessName"], context);
    rejectFields(
      input,
      ["firstName", "lastName", "age", "dni", "cuil", "salaryReceiptRef"],
      context
    );
  });

const commonClientUpdateShape = {
  address: commonClientInputShape.address,
  cbu: commonClientInputShape.cbu,
  email: commonClientInputShape.email,
  notes: commonClientInputShape.notes,
  phone: commonClientInputShape.phone,
  status: mutableClientStatusSchema.optional()
};

export const updateClientSchema = z
  .object({
    ...commonClientUpdateShape,
    age: humanClientInputShape.age,
    businessName: legalEntityClientInputShape.businessName.optional(),
    cuil: humanClientInputShape.cuil,
    cuit: legalEntityClientInputShape.cuit,
    dni: humanClientInputShape.dni,
    firstName: humanClientInputShape.firstName.optional(),
    lastName: humanClientInputShape.lastName.optional(),
    salaryReceiptRef: humanClientInputShape.salaryReceiptRef,
    statute: legalEntityClientInputShape.statute,
    type: clientTypeSchema.optional()
  })
  .strict()
  .superRefine((input, context) => {
    if (Object.keys(input).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debe enviar al menos un campo."
      });
      return;
    }

    if (input.type === "human") {
      requireFields(input, ["firstName", "lastName"], context);
      rejectFields(input, ["businessName", "cuit", "statute"], context);
      return;
    }

    if (input.type === "legal_entity") {
      requireFields(input, ["businessName"], context);
      rejectFields(
        input,
        ["firstName", "lastName", "age", "dni", "cuil", "salaryReceiptRef"],
        context
      );
      return;
    }

    const hasHumanFields = hasDefinedField(input, [
      "firstName",
      "lastName",
      "age",
      "dni",
      "cuil",
      "salaryReceiptRef"
    ]);
    const hasLegalEntityFields = hasDefinedField(input, ["businessName", "cuit", "statute"]);

    if (hasHumanFields && hasLegalEntityFields) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No se pueden mezclar campos de persona fisica y persona juridica."
      });
    }
  });

const clientCursorContextShape = {
  id: z.string().uuid(),
  order: clientOrderSchema,
  search: z.string().trim().max(maxSearchLength).nullable(),
  status: clientStatusSchema.nullable(),
  type: clientTypeSchema.nullable(),
  version: z.literal(1)
};

export const clientCursorSchema = z.discriminatedUnion("sort", [
  z
    .object({
      ...clientCursorContextShape,
      sort: z.literal("name"),
      value: z.string().min(1).max(160)
    })
    .strict(),
  z
    .object({
      ...clientCursorContextShape,
      sort: z.literal("createdAt"),
      value: z.string().datetime({ offset: true })
    })
    .strict(),
  z
    .object({
      ...clientCursorContextShape,
      sort: z.literal("updatedAt"),
      value: z.string().datetime({ offset: true })
    })
    .strict(),
  z
    .object({
      ...clientCursorContextShape,
      sort: z.literal("status"),
      value: clientStatusSchema
    })
    .strict(),
  z
    .object({
      ...clientCursorContextShape,
      sort: z.literal("type"),
      value: clientTypeSchema
    })
    .strict()
]);

const optionalCursorSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).max(maxCursorLength).optional()
);

export const listClientsQuerySchema = z
  .object({
    cursor: optionalCursorSchema,
    limit: z.coerce.number().int().min(1).max(100).default(20),
    order: clientOrderSchema.default("asc"),
    search: optionalSearchSchema,
    sort: clientSortSchema.default("name"),
    status: clientStatusSchema.optional(),
    type: clientTypeSchema.optional()
  })
  .strict()
  .superRefine((query, context) => {
    if (!query.cursor) {
      return;
    }

    const cursor = decodeClientCursor(query.cursor);
    if (!cursor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El cursor de clientes es invalido.",
        path: ["cursor"]
      });
      return;
    }

    const matchesQuery =
      cursor.order === query.order &&
      cursor.search === (query.search ?? null) &&
      cursor.sort === query.sort &&
      cursor.status === (query.status ?? null) &&
      cursor.type === (query.type ?? null);

    if (!matchesQuery) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El cursor no corresponde a la busqueda, filtros u orden seleccionados.",
        path: ["cursor"]
      });
    }
  });

export class CreateClientDto extends createZodDto(createClientSchema) {}
export class UpdateClientDto extends createZodDto(updateClientSchema) {}
export class ListClientsQueryDto extends createZodDto(listClientsQuerySchema) {
  @ApiPropertyOptional({ maxLength: maxSearchLength })
  search?: string;

  @ApiPropertyOptional({ enum: clientTypeSchema.options, enumName: "ClientType" })
  type?: ClientTypeDto;

  @ApiPropertyOptional({ enum: clientStatusSchema.options, enumName: "ClientStatus" })
  status?: ClientStatusDto;

  @ApiPropertyOptional({ default: 20, maximum: 100, minimum: 1, type: Number })
  limit!: number;

  @ApiPropertyOptional({ description: "Cursor opaco devuelto por pageInfo.nextCursor." })
  cursor?: string;

  @ApiPropertyOptional({ default: "name", enum: clientSortSchema.options, enumName: "ClientSort" })
  sort!: ClientSort;

  @ApiPropertyOptional({ default: "asc", enum: clientOrderSchema.options, enumName: "ClientOrder" })
  order!: ClientOrder;
}

class ClientCommonFieldsDocumentationDto {
  @ApiPropertyOptional({ maxLength: 240, nullable: true, type: String })
  address?: string | null;

  @ApiPropertyOptional({ nullable: true, pattern: "^\\d{22}$", type: String })
  cbu?: string | null;

  @ApiPropertyOptional({ format: "email", maxLength: 160, nullable: true, type: String })
  email?: string | null;

  @ApiPropertyOptional({ maxLength: 4000, nullable: true, type: String })
  notes?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true, type: String })
  phone?: string | null;
}

class CreateClientCommonInputDocumentationDto extends ClientCommonFieldsDocumentationDto {
  @ApiPropertyOptional({
    default: "active",
    enum: mutableClientStatusSchema.options,
    enumName: "MutableClientStatus"
  })
  status?: z.infer<typeof mutableClientStatusSchema>;
}

class UpdateClientCommonInputDocumentationDto extends ClientCommonFieldsDocumentationDto {
  @ApiPropertyOptional({
    enum: mutableClientStatusSchema.options,
    enumName: "MutableClientStatus"
  })
  status?: z.infer<typeof mutableClientStatusSchema>;
}

export class CreateHumanClientInputDto extends CreateClientCommonInputDocumentationDto {
  @ApiProperty({ enum: ["human"] })
  type!: "human";

  @ApiProperty({ maxLength: 80, minLength: 1 })
  firstName!: string;

  @ApiProperty({ maxLength: 80, minLength: 1 })
  lastName!: string;

  @ApiPropertyOptional({ maximum: 120, minimum: 0, nullable: true, type: Number })
  age?: number | null;

  @ApiPropertyOptional({ nullable: true, pattern: "^\\d{7,8}$", type: String })
  dni?: string | null;

  @ApiPropertyOptional({ nullable: true, pattern: "^\\d{11}$", type: String })
  cuil?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true, type: String })
  salaryReceiptRef?: string | null;
}

export class CreateLegalEntityClientInputDto extends CreateClientCommonInputDocumentationDto {
  @ApiProperty({ enum: ["legal_entity"] })
  type!: "legal_entity";

  @ApiProperty({ maxLength: 160, minLength: 1 })
  businessName!: string;

  @ApiPropertyOptional({ nullable: true, pattern: "^\\d{11}$", type: String })
  cuit?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true, type: String })
  statute?: string | null;
}

export class UpdateCommonClientInputDto extends UpdateClientCommonInputDocumentationDto {}

export class UpdateHumanClientInputDto extends UpdateClientCommonInputDocumentationDto {
  @ApiPropertyOptional({ maxLength: 80, minLength: 1 })
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 80, minLength: 1 })
  lastName?: string;

  @ApiPropertyOptional({ maximum: 120, minimum: 0, nullable: true, type: Number })
  age?: number | null;

  @ApiPropertyOptional({ nullable: true, pattern: "^\\d{7,8}$", type: String })
  dni?: string | null;

  @ApiPropertyOptional({ nullable: true, pattern: "^\\d{11}$", type: String })
  cuil?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true, type: String })
  salaryReceiptRef?: string | null;
}

export class UpdateLegalEntityClientInputDto extends UpdateClientCommonInputDocumentationDto {
  @ApiPropertyOptional({ maxLength: 160, minLength: 1 })
  businessName?: string;

  @ApiPropertyOptional({ nullable: true, pattern: "^\\d{11}$", type: String })
  cuit?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true, type: String })
  statute?: string | null;
}

export class ClientSummaryDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ enum: clientTypeSchema.options, enumName: "ClientType" })
  type!: ClientTypeDto;

  @ApiProperty({ enum: clientStatusSchema.options, enumName: "ClientStatus" })
  status!: ClientStatusDto;

  @ApiProperty({ example: "Ana Perez" })
  displayName!: string;

  @ApiProperty({ nullable: true, type: String, example: "30111222" })
  dni!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "27301112221" })
  cuil!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "30711222334" })
  cuit!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "ana@ejemplo.com" })
  email!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "+54 381 555-0000" })
  phone!: string | null;

  @ApiProperty({ example: 3 })
  casesCount!: number;

  @ApiProperty({ format: "date-time", type: String })
  createdAt!: string;

  @ApiProperty({ format: "date-time", type: String })
  updatedAt!: string;
}

export class ClientMetricsDto {
  @ApiProperty({ example: 2 })
  primaryCases!: number;

  @ApiProperty({ example: 1 })
  caseParticipations!: number;

  @ApiProperty({ example: 3 })
  totalCases!: number;
}

export class ClientsListMetricsDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 7 })
  withBalance!: number;

  @ApiProperty({ example: 35 })
  active!: number;

  @ApiProperty({ example: 5 })
  inactive!: number;
}

export class ClientRelatedCaseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "EXP-1234/2026" })
  caseNumber!: string;

  @ApiProperty({ example: "Perez c/ Gomez s/ Danos y perjuicios" })
  caption!: string;

  @ApiProperty({ enum: ["open", "paused", "closed"] })
  status!: "open" | "paused" | "closed";
}

export class ClientRelatedCasesDto {
  @ApiProperty({ type: [ClientRelatedCaseDto] })
  primaryCases!: ClientRelatedCaseDto[];

  @ApiProperty({ type: [ClientRelatedCaseDto] })
  caseParticipations!: ClientRelatedCaseDto[];
}

export class ClientDetailDto extends ClientSummaryDto {
  @ApiProperty({ nullable: true, type: String, example: "Ana" })
  firstName!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "Perez" })
  lastName!: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 38 })
  age!: number | null;

  @ApiProperty({ nullable: true, type: String, example: "Estudio Comercial SA" })
  businessName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ nullable: true, type: String })
  statute!: string | null;

  @ApiProperty({ nullable: true, type: String })
  salaryReceiptRef!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "2850590940090418135201" })
  cbu!: string | null;

  @ApiProperty({ type: ClientMetricsDto })
  metrics!: ClientMetricsDto;

  @ApiProperty({ type: ClientRelatedCasesDto })
  relatedCases!: ClientRelatedCasesDto;
}

export class ClientsPageInfoDto {
  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty({ example: false })
  hasNextPage!: boolean;
}

export class ClientsListResponseDto {
  @ApiProperty({ type: [ClientSummaryDto] })
  items!: ClientSummaryDto[];

  @ApiProperty({ type: ClientsListMetricsDto })
  metrics!: ClientsListMetricsDto;

  @ApiProperty({ type: ClientsPageInfoDto })
  pageInfo!: ClientsPageInfoDto;
}

export class ClientArchiveResponseDto {
  @ApiProperty({ format: "uuid" })
  clientId!: string;

  @ApiProperty({ enum: ["archived"], example: "archived" })
  clientStatus!: "archived";

  @ApiProperty({ enum: ["ok"], example: "ok" })
  status!: "ok";
}

export class ClientDeleteResponseDto {
  @ApiProperty({ format: "uuid" })
  clientId!: string;

  @ApiProperty({ enum: ["deleted"], example: "deleted" })
  clientStatus!: "deleted";

  @ApiProperty({ enum: ["ok"], example: "ok" })
  status!: "ok";
}

function hasDefinedField(input: Record<string, unknown>, fields: readonly string[]) {
  return fields.some((field) => input[field] !== undefined);
}

function requireFields(
  input: Record<string, unknown>,
  fields: readonly string[],
  context: z.RefinementCtx
) {
  for (const field of fields) {
    if (input[field] === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Campo obligatorio para el tipo de cliente.",
        path: [field]
      });
    }
  }
}

function rejectFields(
  input: Record<string, unknown>,
  fields: readonly string[],
  context: z.RefinementCtx
) {
  for (const field of fields) {
    if (input[field] !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Campo no permitido para el tipo de cliente.",
        path: [field]
      });
    }
  }
}

export function encodeClientCursor(cursor: ClientCursor) {
  const parsed = clientCursorSchema.parse(cursor);
  return Buffer.from(JSON.stringify(parsed)).toString("base64url");
}

export function decodeClientCursor(cursor: string): ClientCursor | null {
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    const parsed = clientCursorSchema.safeParse(value);

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type ClientTypeDto = z.infer<typeof clientTypeSchema>;
export type ClientStatusDto = z.infer<typeof clientStatusSchema>;
export type ClientSort = z.infer<typeof clientSortSchema>;
export type ClientOrder = z.infer<typeof clientOrderSchema>;
export type ClientCursor = z.infer<typeof clientCursorSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
