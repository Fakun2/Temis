import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { CashboxMovementType, Prisma } from "@prisma/client";
import { dashboardSearchQuerySchema } from "../src/dashboard/dashboard.schemas";
import { DashboardMetricsUseCase } from "../src/dashboard/use-cases/dashboard-metrics.use-case";
import { DashboardSearchUseCase } from "../src/dashboard/use-cases/dashboard-search.use-case";

const tenantId = "11111111-1111-4111-8111-111111111111";
const caseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("Dashboard use cases", () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it("aggregates tenant-scoped dashboard metrics using the tenant timezone", async () => {
    mock.timers.enable({
      apis: ["Date"],
      now: new Date("2026-08-18T02:30:00.000Z")
    });
    const observed = {
      caseWhere: null as unknown,
      taskWhere: null as unknown,
      expenseWhere: null as unknown,
      cashboxWheres: [] as unknown[]
    };
    const useCase = new DashboardMetricsUseCase(createPrismaMock(observed) as never);

    const result = await useCase.execute(tenantId);

    assert.equal(result.activeCasesCount, 7);
    assert.equal(result.cashbox.date, "2026-08-17");
    assert.equal(result.cashbox.balance, "1550.00");
    assert.equal(result.cashbox.incomeToday, "800.00");
    assert.equal(result.cashbox.expenseToday, "125.00");
    assert.equal(result.cashbox.currency.code, "ARS");
    assert.deepEqual(result.dueToday, { paymentsCount: 3, tasksCount: 2 });
    assert.deepEqual(observed.caseWhere, { status: "open", tenantId });
    assert.deepEqual(observed.taskWhere, {
      endDate: new Date("2026-08-17T00:00:00.000Z"),
      status: { in: ["pending", "in_progress"] },
      tenantId
    });
    assert.deepEqual(observed.expenseWhere, {
      paymentDate: new Date("2026-08-17T00:00:00.000Z"),
      status: { in: ["pending", "overdue"] },
      tenantId
    });
    assert.equal(observed.cashboxWheres.length, 4);
    assert.ok(
      observed.cashboxWheres.every((where) => isTenantCashboxWhere(where, tenantId, "ARS"))
    );
  });

  it("returns lightweight global search results with pagination", async () => {
    const queryCalls: unknown[] = [];
    const useCase = new DashboardSearchUseCase(
      createPrismaMock({
        caseWhere: null,
        cashboxWheres: [],
        expenseWhere: null,
        queryCalls,
        rows: [
          makeSearchRow("case", "00000000-0000-4000-8000-000000000010", "2026-08-20"),
          makeSearchRow("document", "00000000-0000-4000-8000-000000000011", "2026-08-20", {
            file_name: "demanda.pdf",
            file_size_bytes: 245760,
            file_type: "application/pdf"
          }),
          makeSearchRow("cashbox_movement", "00000000-0000-4000-8000-000000000012", "2026-08-20", {
            amount: new Prisma.Decimal("25000.00"),
            case_caption: null,
            case_id: null,
            case_number: null,
            currency_code: "ARS",
            movement_name: "Honorarios",
            movement_type: "income"
          }),
          makeSearchRow("task_due", "00000000-0000-4000-8000-000000000001", "2026-08-21"),
          makeSearchRow("hearing", "00000000-0000-4000-8000-000000000002", "2026-08-22"),
          makeSearchRow("payment_due", "00000000-0000-4000-8000-000000000003", "2026-08-23", {
            amount: new Prisma.Decimal("1500.50"),
            currency_code: "ARS"
          })
        ],
        taskWhere: null
      }) as never
    );

    const response = await useCase.execute(
      tenantId,
      { limit: 4, offset: 0, search: "presentar exp" },
      allSearchPermissions
    );

    assert.equal(queryCalls.length, 1);
    assert.equal(response.items.length, 4);
    assert.deepEqual(Object.keys(response.items[0] ?? {}).sort(), [
      "caseCaption",
      "caseId",
      "caseNumber",
      "date",
      "description",
      "href",
      "id",
      "status",
      "title",
      "type"
    ]);
    assert.equal(response.items[0]?.href, `/admin/cases/${caseId}`);
    assert.equal(response.items[1]?.fileName, "demanda.pdf");
    assert.equal(response.items[1]?.fileType, "application/pdf");
    assert.equal(response.items[1]?.fileSizeBytes, 245760);
    assert.equal(response.items[2]?.href, "/admin/cashbox");
    assert.equal(response.items[2]?.movementName, "Honorarios");
    assert.equal(response.items[2]?.movementType, "income");
    assert.equal(response.pageInfo.hasNextPage, true);
    assert.ok(response.pageInfo.nextCursor);
  });

  it("does not query dynamic search results when permissions deny every event type", async () => {
    const queryCalls: unknown[] = [];
    const useCase = new DashboardSearchUseCase(
      createPrismaMock({
        caseWhere: null,
        cashboxWheres: [],
        expenseWhere: null,
        queryCalls,
        rows: [],
        taskWhere: null
      }) as never
    );

    const response = await useCase.execute(
      tenantId,
      { limit: 8, offset: 0, search: "presentar" },
      noSearchPermissions
    );

    assert.equal(queryCalls.length, 0);
    assert.deepEqual(response.items, []);
    assert.equal(response.pageInfo.hasNextPage, false);
  });

  it("localizes cashbox movement search fallbacks", async () => {
    const queryCalls: unknown[] = [];
    const useCase = new DashboardSearchUseCase(
      createPrismaMock({
        caseWhere: null,
        cashboxWheres: [],
        expenseWhere: null,
        queryCalls,
        rows: [
          makeSearchRow("cashbox_movement", "00000000-0000-4000-8000-000000000012", "2026-08-20", {
            case_caption: null,
            case_id: null,
            case_number: null,
            movement_name: "income",
            movement_type: "income",
            title: "income"
          })
        ],
        taskWhere: null
      }) as never
    );

    const response = await useCase.execute(
      tenantId,
      { limit: 8, offset: 0, search: "ingresos" },
      { ...noSearchPermissions, canReadFinance: true }
    );

    assert.equal(response.items[0]?.title, "Ingreso");
    assert.equal(response.items[0]?.movementName, "Ingreso");
    assert.match(JSON.stringify(queryCalls[0]), /Ingreso Ingresos/);
  });

  it("rejects a global search cursor created for a different search term", async () => {
    const useCase = new DashboardSearchUseCase(
      createPrismaMock({
        caseWhere: null,
        cashboxWheres: [],
        expenseWhere: null,
        queryCalls: [],
        rows: [
          makeSearchRow("hearing", "00000000-0000-4000-8000-000000000001", "2026-08-21"),
          makeSearchRow("hearing", "00000000-0000-4000-8000-000000000002", "2026-08-22")
        ],
        taskWhere: null
      }) as never
    );
    const firstPage = await useCase.execute(
      tenantId,
      { limit: 1, offset: 0, search: "presentar" },
      { ...noSearchPermissions, canReadHearings: true }
    );

    await assert.rejects(
      () =>
        useCase.execute(
          tenantId,
          {
            cursor: firstPage.pageInfo.nextCursor ?? undefined,
            limit: 1,
            offset: 1,
            search: "tasa"
          },
          { ...noSearchPermissions, canReadHearings: true }
        ),
      BadRequestException
    );
  });

  it("rejects dashboard search queries that exceed the maximum search length", () => {
    assert.throws(() =>
      dashboardSearchQuerySchema.parse({
        search: "x".repeat(121)
      })
    );
  });

  it("limits dashboard search terms before building the SQL query", async () => {
    const queryCalls: unknown[] = [];
    const useCase = new DashboardSearchUseCase(
      createPrismaMock({
        caseWhere: null,
        cashboxWheres: [],
        expenseWhere: null,
        queryCalls,
        rows: [],
        taskWhere: null
      }) as never
    );

    await useCase.execute(
      tenantId,
      { limit: 8, offset: 0, search: "uno dos tres cuatro cinco seis siete ocho" },
      allSearchPermissions
    );

    const serializedQuery = JSON.stringify(queryCalls[0]);

    assert.match(serializedQuery, /%seis%/);
    assert.doesNotMatch(serializedQuery, /%siete%/);
    assert.doesNotMatch(serializedQuery, /%ocho%/);
  });
});

const allSearchPermissions = {
  canReadCases: true,
  canReadDocuments: true,
  canReadExpenses: true,
  canReadFinance: true,
  canReadHearings: true,
  canReadTasks: true
};

const noSearchPermissions = {
  canReadCases: false,
  canReadDocuments: false,
  canReadExpenses: false,
  canReadFinance: false,
  canReadHearings: false,
  canReadTasks: false
};

function createPrismaMock(observed: {
  caseWhere: unknown;
  cashboxWheres: unknown[];
  expenseWhere: unknown;
  queryCalls?: unknown[];
  rows?: unknown[];
  taskWhere: unknown;
}) {
  return {
    case: {
      count: async ({ where }: { where: unknown }) => {
        observed.caseWhere = where;
        return 7;
      }
    },
    caseExpense: {
      count: async ({ where }: { where: unknown }) => {
        observed.expenseWhere = where;
        return 3;
      }
    },
    caseTask: {
      count: async ({ where }: { where: unknown }) => {
        observed.taskWhere = where;
        return 2;
      }
    },
    cashboxMovement: {
      aggregate: async ({ where }: { where: CashboxAggregateWhere }) => {
        observed.cashboxWheres.push(where);
        const types = where.type.in;
        const isDaily = Boolean(where.occurredAt.gte);

        if (isDaily && types.includes(CashboxMovementType.income)) {
          return { _sum: { amount: new Prisma.Decimal("800.00") } };
        }

        if (isDaily && types.includes(CashboxMovementType.expense)) {
          return { _sum: { amount: new Prisma.Decimal("125.00") } };
        }

        if (types.includes(CashboxMovementType.income)) {
          return { _sum: { amount: new Prisma.Decimal("2000.00") } };
        }

        return { _sum: { amount: new Prisma.Decimal("450.00") } };
      }
    },
    $queryRaw: async (query: unknown) => {
      observed.queryCalls?.push(query);
      return observed.rows ?? [];
    },
    tenantCurrency: {
      findFirst: async () => ({
        currency: {
          code: "ARS",
          name: "Peso argentino",
          symbol: "$"
        }
      })
    },
    tenantSettings: {
      findUnique: async () => ({
        defaultCurrencyCode: "ARS",
        timezone: "America/Argentina/Buenos_Aires"
      })
    }
  };
}

function makeSearchRow(
  type: "case" | "document" | "cashbox_movement" | "task_due" | "hearing" | "payment_due",
  id: string,
  date: string,
  overrides: Partial<{
    amount: Prisma.Decimal | null;
    case_caption: string | null;
    case_id: string | null;
    case_number: string | null;
    currency_code: string | null;
    description: string | null;
    file_name: string | null;
    file_size_bytes: number | null;
    file_type: string | null;
    movement_name: string | null;
    movement_type: "income" | "expense" | "conversion_in" | "conversion_out" | null;
    status: string | null;
    time: string | null;
    title: string;
  }> = {}
) {
  return {
    amount: null,
    case_caption: "Perez c/ Gomez",
    case_id: caseId,
    case_number: "EXP-123/2026",
    currency_code: null,
    date: new Date(`${date}T00:00:00.000Z`),
    description: "Notas breves",
    file_name: null,
    file_size_bytes: null,
    file_type: null,
    id,
    movement_name: null,
    movement_type: null,
    status: type === "hearing" ? null : "pending",
    time: type === "hearing" ? "09:30" : null,
    title:
      type === "case"
        ? "EXP-123/2026 · Perez c/ Gomez"
        : type === "document"
          ? "demanda.pdf"
          : type === "cashbox_movement"
            ? "Honorarios"
            : type === "task_due"
              ? "Tarea: Presentar escrito"
              : type === "hearing"
                ? "Audiencia: Vista de causa"
                : "Pago: Tasa judicial",
    type,
    ...overrides
  };
}

type CashboxAggregateWhere = {
  currencyCode: string;
  occurredAt: {
    gte?: Date;
    lt?: Date;
  };
  tenantId: string;
  type: {
    in: CashboxMovementType[];
  };
};

function isTenantCashboxWhere(
  where: unknown,
  expectedTenantId: string,
  expectedCurrencyCode: string
) {
  if (!where || typeof where !== "object") {
    return false;
  }

  const cashboxWhere = where as Partial<CashboxAggregateWhere>;

  return (
    cashboxWhere.tenantId === expectedTenantId && cashboxWhere.currencyCode === expectedCurrencyCode
  );
}
