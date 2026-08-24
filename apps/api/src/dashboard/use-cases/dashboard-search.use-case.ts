import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import type { DashboardSearchQuery } from "../dashboard.schemas";

const maxDashboardSearchTerms = 6;

export type DashboardSearchPermissions = {
  canReadCases: boolean;
  canReadDocuments: boolean;
  canReadExpenses: boolean;
  canReadFinance: boolean;
  canReadHearings: boolean;
  canReadTasks: boolean;
};

@Injectable()
export class DashboardSearchUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    tenantId: string,
    query: DashboardSearchQuery,
    permissions: DashboardSearchPermissions
  ) {
    const search = query.search.trim();
    const terms = splitSearchTerms(search).slice(0, maxDashboardSearchTerms);
    const cursor = decodeDashboardSearchCursor(query.cursor);

    if (cursor && cursor.search !== search) {
      throw new BadRequestException("El cursor no corresponde a la busqueda actual.");
    }

    if (terms.length === 0) {
      return toDashboardSearchResponse([], query.limit, query.offset);
    }

    const eventQueries: Prisma.Sql[] = [];

    if (permissions.canReadCases) {
      eventQueries.push(Prisma.sql`
        SELECT
          'case'::text AS type,
          cases.id::text AS id,
          (cases.case_number || ' · ' || cases.caption)::text AS title,
          cases.created_at::date AS date,
          NULL::text AS status,
          NULL::numeric AS amount,
          NULL::text AS currency_code,
          NULL::text AS time,
          cases.subject::text AS description,
          cases.id::text AS case_id,
          cases.case_number::text AS case_number,
          cases.caption::text AS case_caption,
          NULL::text AS file_name,
          NULL::text AS file_type,
          NULL::integer AS file_size_bytes,
          NULL::text AS movement_name,
          NULL::text AS movement_type
        FROM cases
        WHERE cases.tenant_id = ${tenantId}::uuid
          AND ${toDashboardSearchTermsSql(terms, [
            Prisma.sql`cases.case_number`,
            Prisma.sql`cases.caption`,
            Prisma.sql`cases.subject`
          ])}
      `);
    }

    if (permissions.canReadDocuments) {
      eventQueries.push(Prisma.sql`
        SELECT
          'document'::text AS type,
          documents.id::text AS id,
          documents.original_name::text AS title,
          documents.created_at::date AS date,
          documents.status::text AS status,
          NULL::numeric AS amount,
          NULL::text AS currency_code,
          NULL::text AS time,
          documents.title::text AS description,
          cases.id::text AS case_id,
          cases.case_number::text AS case_number,
          cases.caption::text AS case_caption,
          documents.original_name::text AS file_name,
          documents.mime_type::text AS file_type,
          documents.size_bytes::integer AS file_size_bytes,
          NULL::text AS movement_name,
          NULL::text AS movement_type
        FROM documents
        LEFT JOIN cases ON cases.tenant_id = documents.tenant_id AND cases.id = documents.case_id
        WHERE documents.tenant_id = ${tenantId}::uuid
          AND documents.deleted_at IS NULL
          AND documents.status = 'active'
          AND ${toDashboardSearchTermsSql(terms, [
            Prisma.sql`documents.original_name`,
            Prisma.sql`documents.title`,
            Prisma.sql`documents.mime_type`,
            Prisma.sql`cases.case_number`,
            Prisma.sql`cases.caption`
          ])}
      `);
    }

    if (permissions.canReadFinance) {
      eventQueries.push(Prisma.sql`
        SELECT
          'cashbox_movement'::text AS type,
          cashbox_movements.id::text AS id,
          COALESCE(
            cashbox_movements.description,
            CASE cashbox_movements.type::text
              WHEN 'income' THEN 'Ingreso'
              WHEN 'expense' THEN 'Egreso'
              WHEN 'conversion_in' THEN 'Conversion entrada'
              WHEN 'conversion_out' THEN 'Conversion salida'
              ELSE 'Movimiento'
            END
          )::text AS title,
          cashbox_movements.occurred_at::date AS date,
          NULL::text AS status,
          cashbox_movements.amount AS amount,
          cashbox_movements.currency_code::text AS currency_code,
          NULL::text AS time,
          cashbox_movements.category_origin::text AS description,
          NULL::text AS case_id,
          NULL::text AS case_number,
          NULL::text AS case_caption,
          NULL::text AS file_name,
          NULL::text AS file_type,
          NULL::integer AS file_size_bytes,
          COALESCE(
            cashbox_movements.description,
            CASE cashbox_movements.type::text
              WHEN 'income' THEN 'Ingreso'
              WHEN 'expense' THEN 'Egreso'
              WHEN 'conversion_in' THEN 'Conversion entrada'
              WHEN 'conversion_out' THEN 'Conversion salida'
              ELSE 'Movimiento'
            END
          )::text AS movement_name,
          cashbox_movements.type::text AS movement_type
        FROM cashbox_movements
        WHERE cashbox_movements.tenant_id = ${tenantId}::uuid
          AND ${toDashboardSearchTermsSql(terms, [
            Prisma.sql`cashbox_movements.description`,
            Prisma.sql`cashbox_movements.type`,
            Prisma.sql`CASE cashbox_movements.type::text
              WHEN 'income' THEN 'Ingreso Ingresos'
              WHEN 'expense' THEN 'Egreso Egresos'
              WHEN 'conversion_in' THEN 'Conversion entrada Ingresos'
              WHEN 'conversion_out' THEN 'Conversion salida Egresos'
              ELSE 'Movimiento'
            END`,
            Prisma.sql`cashbox_movements.currency_code`,
            Prisma.sql`cashbox_movements.category_origin`
          ])}
      `);
    }

    if (permissions.canReadExpenses) {
      eventQueries.push(Prisma.sql`
        SELECT
          'payment_due'::text AS type,
          case_expenses.id::text AS id,
          ('Pago: ' || case_expenses.concept)::text AS title,
          case_expenses.payment_date::date AS date,
          case_expenses.status::text AS status,
          case_expenses.amount AS amount,
          case_expenses.currency_code::text AS currency_code,
          NULL::text AS time,
          case_expenses.notes::text AS description,
          cases.id::text AS case_id,
          cases.case_number::text AS case_number,
          cases.caption::text AS case_caption,
          NULL::text AS file_name,
          NULL::text AS file_type,
          NULL::integer AS file_size_bytes,
          NULL::text AS movement_name,
          NULL::text AS movement_type
        FROM case_expenses
        INNER JOIN cases ON cases.id = case_expenses.case_id
        WHERE case_expenses.tenant_id = ${tenantId}::uuid
          AND cases.tenant_id = ${tenantId}::uuid
          AND case_expenses.status IN ('pending', 'overdue')
          AND ${toDashboardSearchTermsSql(terms, [
            Prisma.sql`case_expenses.concept`,
            Prisma.sql`case_expenses.notes`,
            Prisma.sql`case_expenses.currency_code`,
            Prisma.sql`cases.case_number`,
            Prisma.sql`cases.caption`
          ])}
      `);
    }

    if (permissions.canReadTasks) {
      eventQueries.push(Prisma.sql`
        SELECT
          'task_due'::text AS type,
          case_tasks.id::text AS id,
          ('Tarea: ' || case_tasks.name)::text AS title,
          COALESCE(case_tasks.end_date, case_tasks.start_date)::date AS date,
          case_tasks.status::text AS status,
          NULL::numeric AS amount,
          NULL::text AS currency_code,
          NULL::text AS time,
          case_tasks.notes::text AS description,
          cases.id::text AS case_id,
          cases.case_number::text AS case_number,
          cases.caption::text AS case_caption,
          NULL::text AS file_name,
          NULL::text AS file_type,
          NULL::integer AS file_size_bytes,
          NULL::text AS movement_name,
          NULL::text AS movement_type
        FROM case_tasks
        INNER JOIN cases ON cases.id = case_tasks.case_id
        WHERE case_tasks.tenant_id = ${tenantId}::uuid
          AND cases.tenant_id = ${tenantId}::uuid
          AND case_tasks.status IN ('pending', 'in_progress')
          AND COALESCE(case_tasks.end_date, case_tasks.start_date) IS NOT NULL
          AND ${toDashboardSearchTermsSql(terms, [
            Prisma.sql`case_tasks.name`,
            Prisma.sql`case_tasks.notes`,
            Prisma.sql`cases.case_number`,
            Prisma.sql`cases.caption`
          ])}
      `);
    }

    if (permissions.canReadHearings) {
      eventQueries.push(Prisma.sql`
        SELECT
          'hearing'::text AS type,
          case_hearings.id::text AS id,
          ('Audiencia: ' || case_hearings.description)::text AS title,
          case_hearings.date::date AS date,
          NULL::text AS status,
          NULL::numeric AS amount,
          NULL::text AS currency_code,
          case_hearings.time::text AS time,
          case_hearings.type::text AS description,
          cases.id::text AS case_id,
          cases.case_number::text AS case_number,
          cases.caption::text AS case_caption,
          NULL::text AS file_name,
          NULL::text AS file_type,
          NULL::integer AS file_size_bytes,
          NULL::text AS movement_name,
          NULL::text AS movement_type
        FROM case_hearings
        INNER JOIN cases ON cases.id = case_hearings.case_id
        WHERE case_hearings.tenant_id = ${tenantId}::uuid
          AND cases.tenant_id = ${tenantId}::uuid
          AND ${toDashboardSearchTermsSql(terms, [
            Prisma.sql`case_hearings.description`,
            Prisma.sql`case_hearings.type`,
            Prisma.sql`cases.case_number`,
            Prisma.sql`cases.caption`
          ])}
      `);
    }

    if (eventQueries.length === 0) {
      return toDashboardSearchResponse([], query.limit, query.offset);
    }

    const rows = await this.prisma.$queryRaw<DashboardSearchRow[]>(Prisma.sql`
      SELECT type, id, title, date, status, amount, currency_code, time, description, case_id, case_number, case_caption, file_name, file_type, file_size_bytes, movement_name, movement_type
      FROM (${joinSql(eventQueries, Prisma.sql`UNION ALL`)}) AS dashboard_search
      ${
        cursor
          ? Prisma.sql`WHERE (date, id) > (${cursor.date}::date, ${cursor.id}::text)`
          : Prisma.empty
      }
      ORDER BY date ASC, id ASC
      LIMIT ${query.limit + 1}
    `);

    return toDashboardSearchResponse(rows, query.limit, query.offset, search);
  }
}

type DashboardSearchType =
  | "case"
  | "document"
  | "cashbox_movement"
  | "task_due"
  | "hearing"
  | "payment_due";

type DashboardSearchCursor = {
  date: string;
  id: string;
  search: string;
};

type DashboardSearchRow = {
  amount: Prisma.Decimal | null;
  case_caption: string | null;
  case_id: string | null;
  case_number: string | null;
  currency_code: string | null;
  date: Date | string;
  description: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  file_type: string | null;
  id: string;
  movement_name: string | null;
  movement_type: "income" | "expense" | "conversion_in" | "conversion_out" | null;
  status: string | null;
  time: string | null;
  title: string;
  type: DashboardSearchType;
};

function splitSearchTerms(search: string) {
  return search
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function toDashboardSearchTermsSql(terms: string[], fields: Prisma.Sql[]) {
  return joinSql(
    terms.map((term) => {
      const likeTerm = `%${term}%`;

      return Prisma.sql`(${joinSql(
        fields.map((field) => Prisma.sql`COALESCE(${field}::text, '') ILIKE ${likeTerm}`),
        Prisma.sql`OR`
      )})`;
    }),
    Prisma.sql`AND`
  );
}

function toDashboardSearchResponse(
  rows: DashboardSearchRow[],
  limit: number,
  offset: number,
  search?: string
) {
  const pageRows = rows.slice(0, limit);
  const lastRow = pageRows.at(-1);
  const hasNextPage = rows.length > limit;

  return {
    items: pageRows.map(toDashboardSearchItem),
    pageInfo: {
      limit,
      offset,
      nextCursor:
        hasNextPage && lastRow && search
          ? encodeDashboardSearchCursor({
              date: toIsoDateString(lastRow.date),
              id: lastRow.id,
              search
            })
          : null,
      hasNextPage,
      total: pageRows.length + (hasNextPage ? 1 : 0)
    }
  };
}

function toDashboardSearchItem(row: DashboardSearchRow) {
  const title = getDashboardSearchTitle(row);
  const movementName = getDashboardSearchMovementName(row);

  return {
    type: row.type,
    id: row.id,
    title,
    date: toIsoDateString(row.date),
    href: toDashboardSearchHref(row),
    ...(row.case_id ? { caseId: row.case_id } : {}),
    ...(row.case_number ? { caseNumber: row.case_number } : {}),
    ...(row.case_caption ? { caseCaption: row.case_caption } : {}),
    description: row.description,
    status: row.status,
    ...(row.amount !== null ? { amount: Number(row.amount) } : {}),
    ...(row.currency_code ? { currencyCode: row.currency_code } : {}),
    ...(row.time ? { time: row.time } : {}),
    ...(row.file_name ? { fileName: row.file_name } : {}),
    ...(row.file_type ? { fileType: row.file_type } : {}),
    ...(row.file_size_bytes !== null ? { fileSizeBytes: row.file_size_bytes } : {}),
    ...(movementName ? { movementName } : {}),
    ...(row.movement_type ? { movementType: row.movement_type } : {})
  };
}

function getDashboardSearchTitle(row: DashboardSearchRow) {
  if (row.type === "cashbox_movement" && row.movement_type && row.title === row.movement_type) {
    return getCashboxMovementTypeLabel(row.movement_type);
  }

  return row.title;
}

function getDashboardSearchMovementName(row: DashboardSearchRow) {
  if (!row.movement_name) {
    return null;
  }

  if (
    row.type === "cashbox_movement" &&
    row.movement_type &&
    row.movement_name === row.movement_type
  ) {
    return getCashboxMovementTypeLabel(row.movement_type);
  }

  return row.movement_name;
}

function getCashboxMovementTypeLabel(
  type: NonNullable<DashboardSearchRow["movement_type"]>
) {
  const labels: Record<NonNullable<DashboardSearchRow["movement_type"]>, string> = {
    conversion_in: "Conversion entrada",
    conversion_out: "Conversion salida",
    expense: "Egreso",
    income: "Ingreso"
  };

  return labels[type];
}

function toDashboardSearchHref(row: DashboardSearchRow) {
  if (row.type === "cashbox_movement") {
    return "/admin/cashbox";
  }

  if (row.type === "document" && !row.case_id) {
    return "/admin/library";
  }

  return row.case_id ? `/admin/cases/${row.case_id}` : "/admin";
}

function toIsoDateString(date: Date | string) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
}

function joinSql(parts: Prisma.Sql[], separator: Prisma.Sql) {
  return parts
    .slice(1)
    .reduce((joined, part) => Prisma.sql`${joined} ${separator} ${part}`, parts[0]);
}

function encodeDashboardSearchCursor(cursor: DashboardSearchCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeDashboardSearchCursor(cursor?: string) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as Partial<DashboardSearchCursor>;

    if (!parsed.date || !parsed.id || !parsed.search) {
      return null;
    }

    return {
      date: parsed.date,
      id: parsed.id,
      search: parsed.search
    };
  } catch {
    return null;
  }
}
