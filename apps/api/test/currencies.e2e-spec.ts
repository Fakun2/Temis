import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { ZodValidationPipe } from "nestjs-zod";
import { CashboxMovementType, Prisma } from "@prisma/client";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { CurrenciesModule } from "../src/currencies/currencies.module";
import { PrismaService } from "../src/database/prisma.service";

type CurrencyRecord = {
  active: boolean;
  code: string;
  id: string;
  name: string;
  symbol: string;
};

type TenantCurrencyRecord = {
  active: boolean;
  currencyCode: string;
  id: string;
  tenantId: string;
};

type CashboxMovementRecord = {
  amount: string;
  currencyCode: string;
  tenantId: string;
  type: CashboxMovementType;
};

class InMemoryCurrenciesPrismaService {
  private currencies: CurrencyRecord[] = [];
  private cashboxMovements: CashboxMovementRecord[] = [];
  private tenantCurrencies: TenantCurrencyRecord[] = [];
  private tenantSettingsRecords: Array<{ defaultCurrencyCode: string; tenantId: string }> = [];

  readonly tenantMembership = {
    findFirst: async () => ({ id: "active-membership" })
  };

  readonly currency = {
    count: async ({ where }: { where?: CurrencyWhere }) =>
      this.currencies.filter((currency) => this.matchesCurrency(currency, where)).length,
    create: async ({ data }: { data: Omit<CurrencyRecord, "id"> }) => {
      if (this.currencies.some((currency) => currency.code === data.code)) {
        throw { code: "P2002" };
      }

      const currency = {
        ...data,
        id: `currency-${this.currencies.length + 1}`
      };

      this.currencies.push(currency);
      return currency;
    },
    findMany: async ({
      orderBy,
      skip = 0,
      take,
      where
    }: {
      orderBy?: Array<Record<string, unknown>>;
      skip?: number;
      take?: number;
      where?: CurrencyWhere;
    }) => {
      const sorted = this.currencies
        .filter((currency) => this.matchesCurrency(currency, where))
        .sort(getCurrencySort(orderBy));

      return typeof take === "number" ? sorted.slice(skip, skip + take) : sorted.slice(skip);
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const currency = this.currencies.find((current) => current.id === where.id) ?? null;

      if (!currency) {
        return null;
      }

      return {
        ...currency,
        _count: {
          tenantSettings: this.tenantSettingsRecords.filter(
            (settings) => settings.defaultCurrencyCode === currency.code
          ).length
        }
      };
    },
    update: async ({
      data,
      where
    }: {
      data: Partial<Pick<CurrencyRecord, "active" | "name" | "symbol">>;
      where: { id: string };
    }) => {
      const currency = this.currencies.find((current) => current.id === where.id);
      assert.ok(currency);

      Object.assign(currency, data);
      return currency;
    }
  };

  readonly tenantCurrency = {
    count: async ({ where }: { where?: TenantCurrencyWhere }) =>
      this.tenantCurrencies.filter((tenantCurrency) =>
        this.matchesTenantCurrency(tenantCurrency, where)
      ).length,
    findMany: async ({
      orderBy,
      take,
      where
    }: {
      orderBy?: Array<Record<string, unknown>>;
      take?: number;
      where?: TenantCurrencyWhere;
    }) => {
      const sorted = this.tenantCurrencies
        .filter((tenantCurrency) => this.matchesTenantCurrency(tenantCurrency, where))
        .sort(getTenantCurrencySort(this.currencies, orderBy))
        .map((tenantCurrency) => ({
          active: tenantCurrency.active,
          currency: this.currencies.find(
            (currency) => currency.code === tenantCurrency.currencyCode
          ),
          id: tenantCurrency.id
        }));

      return typeof take === "number" ? sorted.slice(0, take) : sorted;
    },
    findUnique: async ({
      where
    }: {
      where: { tenantId_currencyCode: { currencyCode: string; tenantId: string } };
    }) => {
      const tenantCurrency =
        this.tenantCurrencies.find(
          (current) =>
            current.currencyCode === where.tenantId_currencyCode.currencyCode &&
            current.tenantId === where.tenantId_currencyCode.tenantId
        ) ?? null;

      return tenantCurrency ? this.toTenantCurrencyResult(tenantCurrency) : null;
    },
    update: async ({
      data,
      where
    }: {
      data: { active: boolean };
      where: { tenantId_currencyCode: { currencyCode: string; tenantId: string } };
    }) => {
      const tenantCurrency = this.tenantCurrencies.find(
        (current) =>
          current.currencyCode === where.tenantId_currencyCode.currencyCode &&
          current.tenantId === where.tenantId_currencyCode.tenantId
      );
      assert.ok(tenantCurrency);

      tenantCurrency.active = data.active;
      return this.toTenantCurrencyResult(tenantCurrency);
    },
    upsert: async ({
      create,
      update,
      where
    }: {
      create: { currencyCode: string; tenantId: string };
      update: { active: boolean };
      where: { tenantId_currencyCode: { currencyCode: string; tenantId: string } };
    }) => {
      const current = this.tenantCurrencies.find(
        (tenantCurrency) =>
          tenantCurrency.tenantId === where.tenantId_currencyCode.tenantId &&
          tenantCurrency.currencyCode === where.tenantId_currencyCode.currencyCode
      );

      if (current) {
        current.active = update.active;
        return current;
      }

      const tenantCurrency = {
        active: true,
        currencyCode: create.currencyCode,
        id: `tenant-currency-${this.tenantCurrencies.length + 1}`,
        tenantId: create.tenantId
      };

      this.tenantCurrencies.push(tenantCurrency);
      return tenantCurrency;
    }
  };

  readonly tenantSettings = {
    findUnique: async ({ where }: { where: { tenantId: string } }) =>
      this.tenantSettingsRecords.find((settings) => settings.tenantId === where.tenantId) ?? null
  };

  readonly cashboxMovement = {
    groupBy: async ({
      where
    }: {
      where: { currencyCode?: { in?: string[] }; tenantId?: string };
    }) => {
      const groups = new Map<
        string,
        { amount: Prisma.Decimal; currencyCode: string; type: CashboxMovementType }
      >();

      for (const movement of this.cashboxMovements) {
        if (where.tenantId && movement.tenantId !== where.tenantId) {
          continue;
        }

        if (where.currencyCode?.in && !where.currencyCode.in.includes(movement.currencyCode)) {
          continue;
        }

        const key = `${movement.currencyCode}:${movement.type}`;
        const current = groups.get(key) ?? {
          amount: new Prisma.Decimal(0),
          currencyCode: movement.currencyCode,
          type: movement.type
        };

        current.amount = current.amount.plus(movement.amount);
        groups.set(key, current);
      }

      return [...groups.values()].map((group) => ({
        currencyCode: group.currencyCode,
        type: group.type,
        _sum: { amount: group.amount }
      }));
    }
  };

  async $queryRaw() {
    return [{ sessionVersion: 0, status: "active" }];
  }

  async $transaction<T>(operations: Array<Promise<T>>) {
    return Promise.all(operations);
  }

  reset() {
    this.currencies = [
      {
        active: true,
        code: "ARS",
        id: "currency-ars",
        name: "Peso argentino",
        symbol: "$"
      },
      {
        active: true,
        code: "USD",
        id: "currency-usd",
        name: "Dolar estadounidense",
        symbol: "US$"
      },
      {
        active: false,
        code: "BRL",
        id: "currency-brl",
        name: "Real brasileno",
        symbol: "R$"
      }
    ];
    this.tenantCurrencies = [
      {
        active: true,
        currencyCode: "ARS",
        id: "tenant-currency-ars-a",
        tenantId: "tenant-a"
      },
      {
        active: true,
        currencyCode: "BRL",
        id: "tenant-currency-brl-b",
        tenantId: "tenant-b"
      }
    ];
    this.tenantSettingsRecords = [{ defaultCurrencyCode: "ARS", tenantId: "tenant-a" }];
    this.cashboxMovements = [];
  }

  seedCashboxMovements(movements: CashboxMovementRecord[]) {
    this.cashboxMovements = movements;
  }

  private matchesCurrency(currency: CurrencyRecord, where?: CurrencyWhere) {
    if (!where) {
      return true;
    }

    if (where.active !== undefined && currency.active !== where.active) {
      return false;
    }

    if (where.code?.in && !where.code.in.includes(currency.code)) {
      return false;
    }

    if (where.tenants?.none) {
      const exists = this.tenantCurrencies.some(
        (tenantCurrency) =>
          tenantCurrency.currencyCode === currency.code &&
          tenantCurrency.tenantId === where.tenants?.none?.tenantId &&
          tenantCurrency.active === where.tenants?.none?.active
      );

      if (exists) {
        return false;
      }
    }

    if (where.OR?.length) {
      const needle = where.OR[0]?.code?.contains?.toLowerCase() ?? "";
      return [currency.code, currency.name, currency.symbol].some((value) =>
        value.toLowerCase().includes(needle)
      );
    }

    return true;
  }

  private matchesTenantCurrency(tenantCurrency: TenantCurrencyRecord, where?: TenantCurrencyWhere) {
    if (!where) {
      return true;
    }

    const clauses = where.AND ?? [where];

    return clauses.every((clause) => this.matchesTenantCurrencyClause(tenantCurrency, clause));
  }

  private matchesTenantCurrencyClause(
    tenantCurrency: TenantCurrencyRecord,
    where?: TenantCurrencyWhere
  ) {
    if (!where) {
      return true;
    }

    if (where.tenantId && tenantCurrency.tenantId !== where.tenantId) {
      return false;
    }

    if (where.active !== undefined && tenantCurrency.active !== where.active) {
      return false;
    }

    if (where.currency?.OR?.length) {
      const currency = this.currencies.find(
        (current) => current.code === tenantCurrency.currencyCode
      );
      const needle = where.currency.OR[0]?.code?.contains?.toLowerCase() ?? "";

      if (
        !currency ||
        ![currency.code, currency.name, currency.symbol].some((value) =>
          value.toLowerCase().includes(needle)
        )
      ) {
        return false;
      }
    }

    return true;
  }

  private toTenantCurrencyResult(tenantCurrency: TenantCurrencyRecord) {
    return {
      active: tenantCurrency.active,
      currency: this.currencies.find((currency) => currency.code === tenantCurrency.currencyCode),
      id: tenantCurrency.id
    };
  }
}

type CurrencyWhere = {
  active?: boolean;
  code?: { in: string[] };
  OR?: Array<{
    code?: { contains: string; mode: unknown };
    name?: { contains: string; mode: unknown };
    symbol?: { contains: string; mode: unknown };
  }>;
  tenants?: {
    none?: {
      active?: boolean;
      tenantId?: string;
    };
  };
};

type TenantCurrencyWhere = {
  active?: boolean;
  AND?: TenantCurrencyWhere[];
  currency?: {
    OR?: Array<{
      code?: { contains: string; mode: unknown };
      name?: { contains: string; mode: unknown };
      symbol?: { contains: string; mode: unknown };
    }>;
  };
  tenantId?: string;
};

describe("Currencies endpoints (e2e)", () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: InMemoryCurrenciesPrismaService;

  before(async () => {
    prisma = new InMemoryCurrenciesPrismaService();

    const moduleRef = await Test.createTestingModule({
      imports: [CurrenciesModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ZodValidationPipe());
    jwt = moduleRef.get(JwtService);

    await app.init();
  });

  beforeEach(() => {
    prisma.reset();
  });

  after(async () => {
    await app.close();
  });

  it("requires currencies read permission", async () => {
    await request(app.getHttpServer())
      .get("/api/currencies")
      .set("Authorization", `Bearer ${makeToken(jwt, ["admin:access"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(403);
  });

  it("lists currencies with metrics and filters", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/currencies")
      .query({ active: true, search: "dolar" })
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(
      response.body.items.map((currency: CurrencyRecord) => currency.code),
      ["USD"]
    );
    assert.deepEqual(response.body.metrics, {
      active: 2,
      inactive: 1,
      total: 3
    });
  });

  it("lists tenant currencies with cursor metrics and tenant isolation", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/currencies/tenant")
      .query({ limit: 1 })
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(
      response.body.items.map((currency: CurrencyRecord) => currency.code),
      ["ARS"]
    );
    assert.deepEqual(response.body.metrics, {
      active: 1,
      available: 1
    });
    assert.equal(response.body.items[0]?.cashboxBalance, "0.00");
    assert.equal(response.body.pageInfo.hasNextPage, false);
  });

  it("protects tenant currency writes with finance update", async () => {
    await request(app.getHttpServer())
      .post("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ currencyCodes: ["USD"] })
      .expect(403);
  });

  it("adds multiple currencies to the active tenant without duplicates", async () => {
    await request(app.getHttpServer())
      .post("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ currencyCodes: ["usd", "ARS"] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(response.body.items.map((currency: CurrencyRecord) => currency.code).sort(), [
      "ARS",
      "USD"
    ]);
    assert.deepEqual(response.body.metrics, {
      active: 2,
      available: 0
    });
  });

  it("protects tenant currency disable with finance update", async () => {
    await request(app.getHttpServer())
      .delete("/api/currencies/tenant/USD")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(403);
  });

  it("disables tenant currencies and recalculates tenant metrics", async () => {
    await request(app.getHttpServer())
      .post("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ currencyCodes: ["USD"] })
      .expect(201);

    const disabled = await request(app.getHttpServer())
      .delete("/api/currencies/tenant/USD")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.equal(disabled.body.code, "USD");
    assert.equal(disabled.body.active, false);

    const response = await request(app.getHttpServer())
      .get("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(response.body.items.map((currency: CurrencyRecord) => currency.code).sort(), [
      "ARS",
      "USD"
    ]);
    assert.deepEqual(response.body.metrics, {
      active: 1,
      available: 1
    });
  });

  it("lists tenant currencies with their remaining cashbox balance", async () => {
    await request(app.getHttpServer())
      .post("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ currencyCodes: ["USD"] })
      .expect(201);

    prisma.seedCashboxMovements([
      {
        amount: "200.00",
        currencyCode: "USD",
        tenantId: "tenant-a",
        type: CashboxMovementType.income
      },
      {
        amount: "50.00",
        currencyCode: "USD",
        tenantId: "tenant-a",
        type: CashboxMovementType.expense
      },
      {
        amount: "10.00",
        currencyCode: "USD",
        tenantId: "tenant-b",
        type: CashboxMovementType.income
      }
    ]);

    const response = await request(app.getHttpServer())
      .get("/api/currencies/tenant")
      .query({ search: "dolar" })
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.equal(response.body.items[0]?.code, "USD");
    assert.equal(response.body.items[0]?.cashboxBalance, "150.00");
  });

  it("reactivates disabled tenant currencies from the tenant add endpoint", async () => {
    await request(app.getHttpServer())
      .post("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ currencyCodes: ["USD"] })
      .expect(201);

    await request(app.getHttpServer())
      .delete("/api/currencies/tenant/USD")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ currencyCodes: ["USD"] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get("/api/currencies/tenant")
      .query({ active: true, search: "dolar" })
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.equal(response.body.items[0]?.code, "USD");
    assert.equal(response.body.items[0]?.active, true);
  });

  it("does not disable the tenant default currency", async () => {
    await request(app.getHttpServer())
      .delete("/api/currencies/tenant/ARS")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(400);
  });

  it("rejects inactive or missing currencies when adding to a tenant", async () => {
    await request(app.getHttpServer())
      .post("/api/currencies/tenant")
      .set("Authorization", `Bearer ${makeToken(jwt, ["finance:update"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ currencyCodes: ["BRL", "EUR"] })
      .expect(400);
  });

  it("protects mutating endpoints with dedicated permissions", async () => {
    await request(app.getHttpServer())
      .post("/api/currencies")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ code: "eur", name: "Euro", symbol: "EUR" })
      .expect(403);
  });

  it("creates currencies with uppercase codes", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/currencies")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ code: "eur", name: "Euro", symbol: "EUR" })
      .expect(201);

    assert.equal(response.body.code, "EUR");
    assert.equal(response.body.active, true);
  });

  it("rejects duplicated currency codes", async () => {
    await request(app.getHttpServer())
      .post("/api/currencies")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ code: "ARS", name: "Peso argentino", symbol: "$" })
      .expect(409);
  });

  it("does not deactivate currencies used as tenant defaults", async () => {
    await request(app.getHttpServer())
      .delete("/api/currencies/currency-ars")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:delete"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(400);
  });

  it("deactivates currencies not used as tenant defaults", async () => {
    await request(app.getHttpServer())
      .delete("/api/currencies/currency-usd")
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:delete"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    const response = await request(app.getHttpServer())
      .get("/api/currencies")
      .query({ active: false })
      .set("Authorization", `Bearer ${makeToken(jwt, ["currencies:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(response.body.items.map((currency: CurrencyRecord) => currency.code).sort(), [
      "BRL",
      "USD"
    ]);
  });
});

function makeToken(jwt: JwtService, permissions: string[], tenantId = "tenant-a") {
  return jwt.sign({
    sub: "user-1",
    email: "mateo@estudio.com",
    sessionVersion: 0,
    sessionKind: "tenant",
    tenantAccess: [
      {
        tenantId,
        role: "admin",
        permissions
      }
    ]
  });
}

function getCurrencySort(orderBy: Array<Record<string, unknown>> | undefined) {
  const serialized = JSON.stringify(orderBy?.[0] ?? {});
  const direction = serialized.includes("desc") ? "desc" : "asc";

  return (left: CurrencyRecord, right: CurrencyRecord) => {
    const comparison = left.name.localeCompare(right.name, "es");
    return direction === "asc" ? comparison : -comparison;
  };
}

function getTenantCurrencySort(
  currencies: CurrencyRecord[],
  orderBy: Array<Record<string, unknown>> | undefined
) {
  const serialized = JSON.stringify(orderBy?.[0] ?? {});
  const direction = serialized.includes("desc") ? "desc" : "asc";

  return (left: TenantCurrencyRecord, right: TenantCurrencyRecord) => {
    const leftCurrency = currencies.find((currency) => currency.code === left.currencyCode);
    const rightCurrency = currencies.find((currency) => currency.code === right.currencyCode);
    const comparison = (leftCurrency?.name ?? "").localeCompare(rightCurrency?.name ?? "", "es");

    return direction === "asc" ? comparison : -comparison;
  };
}
