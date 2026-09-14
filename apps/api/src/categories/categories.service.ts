import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type {
  CreateCategoryInput,
  FinanceCategoryKindDto,
  FinanceCategoryOriginDto,
  ListCategoriesQuery,
  UpdateCategoryInput
} from "./categories.schemas";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: ListCategoriesQuery) {
    const cursor = typeof query.cursor === "string" ? decodeCategoryCursor(query.cursor) : null;

    if (cursor && (cursor.sortBy !== query.sortBy || cursor.sortDirection !== query.sortDirection)) {
      throw new BadRequestException("El cursor no corresponde al orden seleccionado.");
    }

    const [categoryRows, metrics] = await Promise.all([
      this.prisma.$queryRaw<CategoryQueryRow[]>(buildCategoriesSeekQuery(tenantId, query, cursor)),
      getCategoryMetrics(this.prisma, tenantId)
    ]);
    const pageItems = categoryRows.map(toCategoryDto);
    const hasNextPage = pageItems.length > query.limit;
    const items = hasNextPage ? pageItems.slice(0, query.limit) : pageItems;

    return {
      items,
      metrics,
      pageInfo: {
        hasNextPage,
        limit: query.limit,
        nextCursor: hasNextPage
          ? encodeCategoryCursor(items.at(-1), query.sortBy, query.sortDirection)
          : null
      }
    };
  }

  async create(tenantId: string, input: CreateCategoryInput) {
    await this.assertTenantNameAvailable(tenantId, input.name);

    try {
      const category = await this.prisma.tenantFinanceCategory.create({
        data: {
          active: input.active,
          kind: input.kind,
          name: input.name,
          tenantId
        },
        select: tenantCategorySelect
      });

      return toTenantDto(category);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("Ya existe una categoria con ese nombre en el estudio.");
      }

      throw error;
    }
  }

  async update(tenantId: string, categoryId: string, input: UpdateCategoryInput) {
    await this.assertCategoryIsTenantScoped(tenantId, categoryId);
    await this.assertTenantNameAvailable(tenantId, input.name, categoryId);

    const category = await this.prisma.tenantFinanceCategory.update({
      where: { id: categoryId },
      data: {
        active: input.active,
        kind: input.kind,
        name: input.name
      },
      select: tenantCategorySelect
    });

    return toTenantDto(category);
  }

  async delete(tenantId: string, categoryId: string) {
    await this.assertCategoryIsTenantScoped(tenantId, categoryId);

    await this.prisma.tenantFinanceCategory.update({
      where: { id: categoryId },
      data: { active: false }
    });

    return { status: "ok" as const };
  }

  private async assertCategoryIsTenantScoped(tenantId: string, categoryId: string) {
    const tenantCategory = await this.prisma.tenantFinanceCategory.findFirst({
      where: { id: categoryId, tenantId },
      select: { id: true }
    });

    if (tenantCategory) {
      return;
    }

    const globalCategory = await this.prisma.globalFinanceCategory.findUnique({
      where: { id: categoryId },
      select: { id: true }
    });

    if (globalCategory) {
      throw new BadRequestException("Las categorias globales son de solo lectura.");
    }

    throw new NotFoundException("La categoria no existe en este estudio.");
  }

  private async assertTenantNameAvailable(
    tenantId: string,
    name: string,
    ignoredCategoryId?: string
  ) {
    const existing = await this.prisma.tenantFinanceCategory.findFirst({
      where: {
        tenantId,
        name: { equals: name, mode: Prisma.QueryMode.insensitive },
        ...(ignoredCategoryId ? { id: { not: ignoredCategoryId } } : {})
      },
      select: { id: true }
    });

    if (existing) {
      throw new ConflictException("Ya existe una categoria con ese nombre en el estudio.");
    }
  }
}

const tenantCategorySelect = {
  active: true,
  createdAt: true,
  id: true,
  kind: true,
  name: true,
  updatedAt: true
} satisfies Prisma.TenantFinanceCategorySelect;

type TenantCategoryWithSelect = Prisma.TenantFinanceCategoryGetPayload<{
  select: typeof tenantCategorySelect;
}>;

type CategoryDtoLike =
  | {
      active: boolean;
      code: string;
      createdAt: Date;
      id: string;
      kind: FinanceCategoryKindDto;
      name: string;
      origin: "global";
      updatedAt: Date;
    }
  | {
      active: boolean;
      createdAt: Date;
      id: string;
      kind: FinanceCategoryKindDto;
      name: string;
      origin: "tenant";
      updatedAt: Date;
    };
type CategoryCursor = {
  id: string;
  name: string;
  origin: FinanceCategoryOriginDto;
  sortBy: ListCategoriesQuery["sortBy"];
  sortDirection: ListCategoriesQuery["sortDirection"];
  value: string | number;
};

type CategoryQueryRow = {
  active: boolean;
  code: string | null;
  createdAt: Date;
  id: string;
  kind: FinanceCategoryKindDto;
  name: string;
  origin: FinanceCategoryOriginDto;
  updatedAt: Date;
};

function buildCategoriesSeekQuery(
  tenantId: string,
  query: ListCategoriesQuery,
  cursor: CategoryCursor | null
) {
  const sourceQueries = [
    query.origin === "tenant" ? null : buildGlobalCategorySourceQuery(query),
    query.origin === "global" ? null : buildTenantCategorySourceQuery(tenantId, query)
  ].filter(Boolean) as Prisma.Sql[];

  if (sourceQueries.length === 0) {
    throw new BadRequestException("El origen de categorias es invalido.");
  }

  return Prisma.sql`
    WITH category_rows AS (
      ${Prisma.join(sourceQueries, " UNION ALL ")}
    )
    SELECT
      id,
      name,
      kind,
      active,
      origin,
      code,
      "createdAt",
      "updatedAt"
    FROM category_rows
    ${buildCursorWhereClause(cursor)}
    ORDER BY
      sort_value ${getSortDirectionSql(query.sortDirection)},
      name ASC,
      origin ASC,
      id ASC
    LIMIT ${query.limit + 1}
  `;
}

function buildGlobalCategorySourceQuery(query: ListCategoriesQuery) {
  return Prisma.sql`
    SELECT
      id::text,
      name,
      kind::text,
      active,
      'global'::text AS origin,
      code,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      ${getSourceSortExpression(query.sortBy, "global")} AS sort_value
    FROM global_finance_categories
    ${buildSourceWhereClause(buildGlobalSourceFilters(query))}
  `;
}

function buildTenantCategorySourceQuery(tenantId: string, query: ListCategoriesQuery) {
  return Prisma.sql`
    SELECT
      id::text,
      name,
      kind::text,
      active,
      'tenant'::text AS origin,
      NULL::text AS code,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      ${getSourceSortExpression(query.sortBy, "tenant")} AS sort_value
    FROM tenant_finance_categories
    ${buildSourceWhereClause(buildTenantSourceFilters(tenantId, query))}
  `;
}

function buildGlobalSourceFilters(query: ListCategoriesQuery) {
  const filters: Prisma.Sql[] = [];

  if (query.active !== undefined) {
    filters.push(Prisma.sql`active = ${query.active}`);
  }

  if (query.kind) {
    filters.push(Prisma.sql`kind::text = ${query.kind}`);
  }

  if (query.search) {
    const search = `%${query.search}%`;
    filters.push(Prisma.sql`(name ILIKE ${search} OR code ILIKE ${search})`);
  }

  return filters;
}

function buildTenantSourceFilters(tenantId: string, query: ListCategoriesQuery) {
  const filters: Prisma.Sql[] = [Prisma.sql`tenant_id = ${tenantId}::uuid`];

  if (query.active !== undefined) {
    filters.push(Prisma.sql`active = ${query.active}`);
  }

  if (query.kind) {
    filters.push(Prisma.sql`kind::text = ${query.kind}`);
  }

  if (query.search) {
    const search = `%${query.search}%`;
    filters.push(Prisma.sql`name ILIKE ${search}`);
  }

  return filters;
}

function buildSourceWhereClause(filters: Prisma.Sql[]) {
  if (filters.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`;
}

function buildCursorWhereClause(cursor: CategoryCursor | null) {
  if (!cursor) {
    return Prisma.empty;
  }

  const sortValue = cursor.value;

  return Prisma.sql`
    WHERE (
      sort_value ${getCursorComparisonSql(cursor.sortDirection)} ${sortValue}
      OR (
        sort_value = ${sortValue}
        AND (
          name > ${cursor.name}
          OR (name = ${cursor.name} AND origin > ${cursor.origin})
          OR (name = ${cursor.name} AND origin = ${cursor.origin} AND id > ${cursor.id})
        )
      )
    )
  `;
}

function getSourceSortExpression(
  sortBy: ListCategoriesQuery["sortBy"],
  origin: FinanceCategoryOriginDto
) {
  const sortExpressionMap: Record<ListCategoriesQuery["sortBy"], Prisma.Sql> = {
    active: Prisma.sql`CASE WHEN active THEN 1 ELSE 0 END`,
    kind: Prisma.sql`kind::text`,
    name: Prisma.sql`name`,
    origin: Prisma.sql`${origin}::text`
  };

  return sortExpressionMap[sortBy];
}

function getSortDirectionSql(direction: ListCategoriesQuery["sortDirection"]) {
  return direction === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
}

function getCursorComparisonSql(direction: ListCategoriesQuery["sortDirection"]) {
  return direction === "asc" ? Prisma.sql`>` : Prisma.sql`<`;
}

async function getCategoryMetrics(prisma: PrismaService, tenantId: string) {
  const [global, tenant, activeGlobal, activeTenant] = await Promise.all([
    prisma.globalFinanceCategory.count({ where: { active: true } }),
    prisma.tenantFinanceCategory.count({ where: { tenantId } }),
    prisma.globalFinanceCategory.count({ where: { active: true } }),
    prisma.tenantFinanceCategory.count({ where: { active: true, tenantId } })
  ]);

  return {
    active: activeGlobal + activeTenant,
    global,
    tenant
  };
}

function toTenantDto(category: TenantCategoryWithSelect) {
  return {
    active: category.active,
    createdAt: category.createdAt,
    id: category.id,
    kind: category.kind as FinanceCategoryKindDto,
    name: category.name,
    origin: "tenant" as const,
    updatedAt: category.updatedAt
  };
}

function toCategoryDto(category: CategoryQueryRow): CategoryDtoLike {
  if (category.origin === "global") {
    return {
      active: category.active,
      code: category.code ?? "",
      createdAt: category.createdAt,
      id: category.id,
      kind: category.kind,
      name: category.name,
      origin: "global",
      updatedAt: category.updatedAt
    };
  }

  return {
    active: category.active,
    createdAt: category.createdAt,
    id: category.id,
    kind: category.kind,
    name: category.name,
    origin: "tenant",
    updatedAt: category.updatedAt
  };
}

function getCategorySortValue(
  category: CategoryDtoLike,
  sortBy: ListCategoriesQuery["sortBy"]
) {
  if (sortBy === "kind") {
    return category.kind;
  }

  if (sortBy === "origin") {
    return category.origin;
  }

  if (sortBy === "active") {
    return category.active ? 1 : 0;
  }

  return category.name;
}

function encodeCategoryCursor(
  category: CategoryDtoLike | undefined,
  sortBy: ListCategoriesQuery["sortBy"],
  sortDirection: ListCategoriesQuery["sortDirection"]
) {
  if (!category) {
    return null;
  }

  const cursor: CategoryCursor = {
    id: category.id,
    name: category.name,
    origin: category.origin,
    sortBy,
    sortDirection,
    value: getCategorySortValue(category, sortBy)
  };

  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCategoryCursor(cursor?: string): CategoryCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<
      CategoryCursor
    >;

    if (
      typeof parsed.id !== "string" ||
      !["global", "tenant"].includes(String(parsed.origin)) ||
      !["name", "kind", "origin", "active"].includes(String(parsed.sortBy)) ||
      !["asc", "desc"].includes(String(parsed.sortDirection))
    ) {
      throw new Error("Invalid cursor");
    }

    if (typeof parsed.name !== "string") {
      throw new Error("Invalid cursor name");
    }

    if (parsed.sortBy === "active" && typeof parsed.value !== "number") {
      throw new Error("Invalid cursor value");
    }

    if (parsed.sortBy !== "active" && typeof parsed.value !== "string") {
      throw new Error("Invalid cursor value");
    }

    return parsed as CategoryCursor;
  } catch {
    throw new BadRequestException("El cursor de categorias es invalido.");
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
