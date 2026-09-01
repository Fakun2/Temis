import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ClientStatus, ClientType, Prisma } from "@prisma/client";
import { PrismaService, type TenantPrismaClient } from "../database/prisma.service";
import {
  decodeClientCursor,
  encodeClientCursor,
  type ClientCursor,
  type ClientOrder,
  type ClientSort,
  type ClientStatusDto,
  type ClientTypeDto,
  type CreateClientInput,
  type ListClientsQuery,
  type UpdateClientInput
} from "./clients.schemas";

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, query: ListClientsQuery) {
    return this.prisma.runWithTenant(tenantId, async (tx) => {
      const cursor = getValidatedCursor(query);
      const rows = await tx.$queryRaw<ClientListRow[]>(
        buildClientsListQuery(tenantId, query, cursor)
      );
      const hasNextPage = rows.length > query.limit;
      const pageRows = rows.slice(0, query.limit);
      const lastRow = pageRows.at(-1);

      return {
        items: pageRows.map(toClientSummaryDto),
        pageInfo: {
          hasNextPage,
          limit: query.limit,
          nextCursor:
            hasNextPage && lastRow ? encodeClientCursor(toClientCursor(lastRow, query)) : null
        }
      };
    });
  }

  create(tenantId: string, input: CreateClientInput) {
    return this.prisma.runWithTenant(tenantId, async (tx) => {
      await assertIdentifiersAvailable(tx, tenantId, getInputIdentifiers(input));

      const created = await tx.client.create({
        data: toCreateData(tenantId, input),
        select: { id: true }
      });

      return findClientDetailOrThrow(tx, tenantId, created.id);
    });
  }

  getDetail(tenantId: string, clientId: string) {
    return this.prisma.runWithTenant(tenantId, (tx) =>
      findClientDetailOrThrow(tx, tenantId, clientId)
    );
  }

  update(tenantId: string, clientId: string, input: UpdateClientInput) {
    return this.prisma.runWithTenant(tenantId, async (tx) => {
      const existing = await tx.client.findFirst({
        where: { id: clientId, tenantId }
      });

      if (!existing) {
        throw clientNotFound();
      }

      assertUpdateMatchesClientType(existing.type, input);
      const data = toUpdateData(existing.type, input);
      const identifiers = getUpdatedIdentifiers(existing, input);

      await assertIdentifiersAvailable(tx, tenantId, identifiers, clientId);
      await tx.client.updateMany({
        data,
        where: { id: clientId, tenantId }
      });

      return findClientDetailOrThrow(tx, tenantId, clientId);
    });
  }

  archive(tenantId: string, clientId: string) {
    return this.prisma.runWithTenant(tenantId, async (tx) => {
      const existing = await tx.client.findFirst({
        select: { id: true, status: true },
        where: { id: clientId, tenantId }
      });

      if (!existing) {
        throw clientNotFound();
      }

      if (existing.status !== ClientStatus.archived) {
        await tx.client.updateMany({
          data: { status: ClientStatus.archived },
          where: { id: clientId, tenantId }
        });
      }

      return {
        clientId,
        clientStatus: "archived" as const,
        status: "ok" as const
      };
    });
  }
}

const relatedCaseSelect = {
  caption: true,
  caseNumber: true,
  id: true,
  status: true
} satisfies Prisma.CaseSelect;

function getClientDetailInclude(tenantId: string) {
  return {
    caseParticipations: {
      orderBy: { caseId: Prisma.SortOrder.asc },
      select: {
        case: {
          select: relatedCaseSelect
        }
      },
      where: { case: { tenantId } }
    },
    primaryCases: {
      orderBy: [{ caseNumber: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }],
      select: relatedCaseSelect,
      where: { tenantId }
    }
  } satisfies Prisma.ClientInclude;
}

type ClientWithRelations = Prisma.ClientGetPayload<{
  include: ReturnType<typeof getClientDetailInclude>;
}>;

type ClientListRow = {
  casesCount: bigint | number;
  createdAt: Date;
  cuil: string | null;
  cuit: string | null;
  displayName: string;
  dni: string | null;
  email: string | null;
  id: string;
  phone: string | null;
  sortValue: Date | string;
  status: ClientStatusDto;
  type: ClientTypeDto;
  updatedAt: Date;
};

type ClientIdentifiers = {
  cuil?: string | null;
  cuit?: string | null;
  dni?: string | null;
};

async function findClientDetailOrThrow(tx: TenantPrismaClient, tenantId: string, clientId: string) {
  const client = await tx.client.findFirst({
    include: getClientDetailInclude(tenantId),
    where: { id: clientId, tenantId }
  });

  if (!client) {
    throw clientNotFound();
  }

  return toClientDetailDto(client);
}

function toClientDetailDto(client: ClientWithRelations) {
  const primaryCases = client.primaryCases.map(toRelatedCaseDto);
  const primaryCaseIds = new Set(primaryCases.map((caseItem) => caseItem.id));
  const participationCases = client.caseParticipations
    .map((participation) => toRelatedCaseDto(participation.case))
    .filter((caseItem) => !primaryCaseIds.has(caseItem.id));
  const uniqueParticipationCases = [
    ...new Map(participationCases.map((caseItem) => [caseItem.id, caseItem])).values()
  ].sort(compareRelatedCases);
  const totalCases = primaryCases.length + uniqueParticipationCases.length;

  return {
    address: client.address,
    age: client.age,
    businessName: client.businessName,
    casesCount: totalCases,
    cbu: client.cbu,
    createdAt: client.createdAt.toISOString(),
    cuil: client.cuil,
    cuit: client.cuit,
    displayName: getDisplayName(client),
    dni: client.dni,
    email: client.email,
    firstName: client.firstName,
    id: client.id,
    lastName: client.lastName,
    metrics: {
      caseParticipations: uniqueParticipationCases.length,
      primaryCases: primaryCases.length,
      totalCases
    },
    notes: client.notes,
    phone: client.phone,
    relatedCases: {
      caseParticipations: uniqueParticipationCases,
      primaryCases
    },
    salaryReceiptRef: client.salaryReceiptRef,
    statute: client.statute,
    status: client.status,
    type: client.type,
    updatedAt: client.updatedAt.toISOString()
  };
}

function toRelatedCaseDto(caseItem: ClientWithRelations["primaryCases"][number]) {
  return {
    caption: caseItem.caption,
    caseNumber: caseItem.caseNumber,
    id: caseItem.id,
    status: caseItem.status
  };
}

function compareRelatedCases(
  left: ReturnType<typeof toRelatedCaseDto>,
  right: ReturnType<typeof toRelatedCaseDto>
) {
  return left.caseNumber.localeCompare(right.caseNumber, "es") || left.id.localeCompare(right.id);
}

function toClientSummaryDto(row: ClientListRow) {
  return {
    casesCount: Number(row.casesCount),
    createdAt: row.createdAt.toISOString(),
    cuil: row.cuil,
    cuit: row.cuit,
    displayName: row.displayName,
    dni: row.dni,
    email: row.email,
    id: row.id,
    phone: row.phone,
    status: row.status,
    type: row.type,
    updatedAt: row.updatedAt.toISOString()
  };
}

function toCreateData(
  tenantId: string,
  input: CreateClientInput
): Prisma.ClientUncheckedCreateInput {
  const commonData = {
    address: input.address,
    cbu: input.cbu,
    email: input.email,
    notes: input.notes,
    phone: input.phone,
    status: input.status,
    tenantId,
    type: input.type
  };

  if (input.type === "human") {
    return {
      ...commonData,
      age: input.age,
      businessName: null,
      cuil: input.cuil,
      cuit: null,
      dni: input.dni,
      firstName: input.firstName,
      lastName: input.lastName,
      salaryReceiptRef: input.salaryReceiptRef,
      statute: null
    };
  }

  return {
    ...commonData,
    age: null,
    businessName: input.businessName,
    cuil: null,
    cuit: input.cuit,
    dni: null,
    firstName: null,
    lastName: null,
    salaryReceiptRef: null,
    statute: input.statute
  };
}

function toUpdateData(
  currentType: ClientType,
  input: UpdateClientInput
): Prisma.ClientUpdateManyMutationInput {
  const targetType = input.type ?? currentType;
  const data: Prisma.ClientUpdateManyMutationInput = {};

  assignDefined(data, input, ["address", "cbu", "email", "notes", "phone", "status"]);

  if (input.type !== undefined) {
    data.type = input.type;
  }

  if (targetType === ClientType.human) {
    assignDefined(data, input, ["age", "cuil", "dni", "firstName", "lastName", "salaryReceiptRef"]);

    if (currentType !== ClientType.human) {
      data.businessName = null;
      data.cuit = null;
      data.statute = null;
    }
  } else {
    assignDefined(data, input, ["businessName", "cuit", "statute"]);

    if (currentType !== ClientType.legal_entity) {
      data.age = null;
      data.cuil = null;
      data.dni = null;
      data.firstName = null;
      data.lastName = null;
      data.salaryReceiptRef = null;
    }
  }

  return data;
}

function assignDefined(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  fields: readonly string[]
) {
  for (const field of fields) {
    if (source[field] !== undefined) {
      target[field] = source[field];
    }
  }
}

function assertUpdateMatchesClientType(currentType: ClientType, input: UpdateClientInput) {
  if (input.type !== undefined) {
    return;
  }

  const humanFields = ["age", "cuil", "dni", "firstName", "lastName", "salaryReceiptRef"];
  const legalEntityFields = ["businessName", "cuit", "statute"];
  const incompatibleFields = currentType === ClientType.human ? legalEntityFields : humanFields;

  if (incompatibleFields.some((field) => input[field as keyof UpdateClientInput] !== undefined)) {
    throw new BadRequestException(
      "Para cambiar campos propios del otro tipo de cliente debe enviar type explicitamente."
    );
  }
}

function getInputIdentifiers(input: CreateClientInput): ClientIdentifiers {
  return {
    cuil: input.type === "human" ? input.cuil : null,
    cuit: input.type === "legal_entity" ? input.cuit : null,
    dni: input.type === "human" ? input.dni : null
  };
}

function getUpdatedIdentifiers(
  existing: { cuil: string | null; cuit: string | null; dni: string | null; type: ClientType },
  input: UpdateClientInput
): ClientIdentifiers {
  const targetType = input.type ?? existing.type;

  if (targetType === ClientType.human) {
    return {
      cuil: input.cuil === undefined ? existing.cuil : input.cuil,
      cuit: null,
      dni: input.dni === undefined ? existing.dni : input.dni
    };
  }

  return {
    cuil: null,
    cuit: input.cuit === undefined ? existing.cuit : input.cuit,
    dni: null
  };
}

async function assertIdentifiersAvailable(
  tx: TenantPrismaClient,
  tenantId: string,
  identifiers: ClientIdentifiers,
  ignoredClientId?: string
) {
  // Preventive validation only. Prisma currently has no tenant-scoped unique constraints for
  // DNI/CUIL/CUIT, so concurrent writes can still race until a database constraint is added.
  const checks = [
    { field: "dni" as const, label: "DNI", value: identifiers.dni },
    { field: "cuil" as const, label: "CUIL", value: identifiers.cuil },
    { field: "cuit" as const, label: "CUIT", value: identifiers.cuit }
  ];

  for (const check of checks) {
    if (!check.value) {
      continue;
    }

    const existing = await tx.client.findFirst({
      select: { id: true },
      where: {
        [check.field]: check.value,
        ...(ignoredClientId ? { id: { not: ignoredClientId } } : {}),
        tenantId
      }
    });

    if (existing) {
      throw new ConflictException(`Ya existe un cliente con ese ${check.label} en el estudio.`);
    }
  }
}

function getValidatedCursor(query: ListClientsQuery) {
  if (!query.cursor) {
    return null;
  }

  const cursor = decodeClientCursor(query.cursor);
  if (!cursor) {
    throw new BadRequestException("El cursor de clientes es invalido.");
  }

  if (
    cursor.order !== query.order ||
    cursor.search !== (query.search ?? null) ||
    cursor.sort !== query.sort ||
    cursor.status !== (query.status ?? null) ||
    cursor.type !== (query.type ?? null)
  ) {
    throw new BadRequestException(
      "El cursor no corresponde a la busqueda, filtros u orden seleccionados."
    );
  }

  return cursor;
}

function buildClientsListQuery(
  tenantId: string,
  query: ListClientsQuery,
  cursor: ClientCursor | null
) {
  const displayNameSql = Prisma.sql`
    COALESCE(
      NULLIF(
        BTRIM(
          CASE
            WHEN "type" = 'legal_entity'::"ClientType" THEN COALESCE("business_name", '')
            ELSE CONCAT_WS(' ', "first_name", "last_name")
          END
        ),
        ''
      ),
      'Cliente sin nombre'
    )
  `;
  const sortExpression = getSortExpression(query.sort, displayNameSql);
  const filters: Prisma.Sql[] = [Prisma.sql`"tenant_id" = ${tenantId}::uuid`];

  filters.push(
    query.status
      ? Prisma.sql`"status" = ${query.status}::"ClientStatus"`
      : Prisma.sql`"status" <> 'archived'::"ClientStatus"`
  );

  if (query.type) {
    filters.push(Prisma.sql`"type" = ${query.type}::"ClientType"`);
  }

  if (query.search) {
    const search = `%${query.search}%`;
    filters.push(Prisma.sql`(
      "first_name" ILIKE ${search}
      OR "last_name" ILIKE ${search}
      OR "business_name" ILIKE ${search}
      OR "dni" ILIKE ${search}
      OR "cuil" ILIKE ${search}
      OR "cuit" ILIKE ${search}
      OR "email" ILIKE ${search}
      OR "phone" ILIKE ${search}
    )`);
  }

  if (cursor) {
    const cursorValue = getCursorSqlValue(cursor);
    filters.push(Prisma.sql`(
      ${sortExpression} ${getCursorComparison(query.order)} ${cursorValue}
      OR (${sortExpression} = ${cursorValue} AND "id" > ${cursor.id}::uuid)
    )`);
  }

  return Prisma.sql`
    SELECT
      "id"::text,
      "type"::text,
      "status"::text,
      ${displayNameSql} AS "displayName",
      "dni",
      "cuil",
      "cuit",
      "email",
      "phone",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt",
      ${sortExpression} AS "sortValue",
      (
        SELECT COUNT(*)::integer
        FROM (
          SELECT linked_case."id"
          FROM "cases" linked_case
          WHERE linked_case."tenant_id" = ${tenantId}::uuid
            AND linked_case."primary_client_id" = "clients"."id"
          UNION
          SELECT participant."case_id"
          FROM "case_participants" participant
          INNER JOIN "cases" participant_case ON participant_case."id" = participant."case_id"
          WHERE participant."client_id" = "clients"."id"
            AND participant_case."tenant_id" = ${tenantId}::uuid
        ) related_cases
      ) AS "casesCount"
    FROM "clients"
    WHERE ${Prisma.join(filters, " AND ")}
    ORDER BY "sortValue" ${getSortDirection(query.order)}, "id" ASC
    LIMIT ${query.limit + 1}
  `;
}

function getSortExpression(sort: ClientSort, displayNameSql: Prisma.Sql) {
  const expressions: Record<ClientSort, Prisma.Sql> = {
    createdAt: Prisma.sql`"created_at"`,
    name: Prisma.sql`LOWER(${displayNameSql})`,
    status: Prisma.sql`"status"::text`,
    type: Prisma.sql`"type"::text`,
    updatedAt: Prisma.sql`"updated_at"`
  };

  return expressions[sort];
}

function getSortDirection(order: ClientOrder) {
  return order === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
}

function getCursorComparison(order: ClientOrder) {
  return order === "asc" ? Prisma.sql`>` : Prisma.sql`<`;
}

function getCursorSqlValue(cursor: ClientCursor) {
  return cursor.sort === "createdAt" || cursor.sort === "updatedAt"
    ? Prisma.sql`${new Date(cursor.value)}`
    : Prisma.sql`${cursor.value}`;
}

function toClientCursor(row: ClientListRow, query: ListClientsQuery): ClientCursor {
  const context = {
    id: row.id,
    order: query.order,
    search: query.search ?? null,
    status: query.status ?? null,
    type: query.type ?? null,
    version: 1 as const
  };

  if (query.sort === "createdAt" || query.sort === "updatedAt") {
    const value = row.sortValue instanceof Date ? row.sortValue : new Date(row.sortValue);
    return { ...context, sort: query.sort, value: value.toISOString() };
  }

  if (query.sort === "status") {
    return { ...context, sort: "status", value: row.sortValue as ClientStatusDto };
  }

  if (query.sort === "type") {
    return { ...context, sort: "type", value: row.sortValue as ClientTypeDto };
  }

  return { ...context, sort: "name", value: String(row.sortValue) };
}

function getDisplayName(
  client: Pick<ClientWithRelations, "businessName" | "firstName" | "lastName" | "type">
) {
  const displayName =
    client.type === ClientType.legal_entity
      ? client.businessName
      : [client.firstName, client.lastName].filter(Boolean).join(" ");

  return displayName?.trim() || "Cliente sin nombre";
}

function clientNotFound() {
  return new NotFoundException("El cliente no existe en este estudio.");
}
