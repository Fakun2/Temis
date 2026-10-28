import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { ZodValidationPipe } from "nestjs-zod";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { AuthModule } from "../src/auth/auth.module";
import { CasesModule } from "../src/cases/cases.module";

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const caseA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const caseB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

type CaseRecord = {
  id: string;
  tenantId: string;
};

type HearingRecord = {
  caseId: string;
  createdAt: Date;
  date: Date;
  description: string;
  id: string;
  notificationsEnabled: boolean;
  tenantId: string;
  time: string;
  type: string;
  updatedAt: Date;
};

class InMemoryCasesPrismaService {
  private cases: CaseRecord[] = [];
  private hearings: HearingRecord[] = [];
  private nextId = 1;
  executeRawCalls = 0;
  runWithTenantCalls: string[] = [];

  readonly tenantMembership = {
    findFirst: async () => ({ id: "active-membership" })
  };

  readonly case = {
    findFirst: async ({ select, where }: { select?: unknown; where: Partial<CaseRecord> }) => {
      const record =
        this.cases.find(
          (caseItem) => caseItem.id === where.id && caseItem.tenantId === where.tenantId
        ) ?? null;

      return record ? selectRecord(record, select) : null;
    }
  };

  readonly caseHearing = {
    create: async ({ data, select }: { data: HearingWriteData; select?: unknown }) => {
      const now = new Date("2026-08-03T12:00:00.000Z");
      const record: HearingRecord = {
        caseId: data.caseId,
        createdAt: now,
        date: data.date,
        description: data.description,
        id: `00000000-0000-4000-8000-${String(this.nextId++).padStart(12, "0")}`,
        notificationsEnabled: data.notificationsEnabled,
        tenantId: data.tenantId,
        time: data.time,
        type: data.type,
        updatedAt: now
      };

      this.hearings.push(record);
      return selectRecord(record, select);
    },
    delete: async ({ where }: { where: { id: string } }) => {
      this.hearings = this.hearings.filter((hearing) => hearing.id !== where.id);
    },
    findFirst: async ({
      select,
      where
    }: {
      select?: unknown;
      where: { caseId: string; id: string; tenantId: string };
    }) => {
      const record =
        this.hearings.find(
          (hearing) =>
            hearing.caseId === where.caseId &&
            hearing.id === where.id &&
            hearing.tenantId === where.tenantId
        ) ?? null;

      return record ? selectRecord(record, select) : null;
    },
    findMany: async ({
      orderBy,
      select,
      take,
      where
    }: {
      orderBy?: unknown;
      select?: unknown;
      take?: number;
      where: HearingWhere;
    }) =>
      this.hearings
        .filter((hearing) => matchesHearing(hearing, where))
        .sort((left, right) => sortHearings(left, right, orderBy))
        .slice(0, take)
        .map((hearing) => selectRecord(hearing, select)),
    update: async ({
      data,
      select,
      where
    }: {
      data: Partial<HearingWriteData>;
      select?: unknown;
      where: { id: string };
    }) => {
      const record = this.hearings.find((hearing) => hearing.id === where.id);

      if (!record) {
        throw new Error("Hearing not found");
      }

      Object.assign(record, data, { updatedAt: new Date("2026-08-03T13:00:00.000Z") });
      return selectRecord(record, select);
    }
  };

  readonly caseExpense = {
    findMany: async () => [],
    updateMany: async () => ({ count: 0 })
  };

  readonly caseTask = {
    findMany: async () => []
  };

  async $executeRaw() {
    this.executeRawCalls += 1;
    return 2;
  }

  async $queryRaw() {
    return [{ sessionVersion: 0, status: "active" }];
  }

  async runWithTenant<T>(tenantId: string, callback: (client: this) => Promise<T>) {
    this.runWithTenantCalls.push(tenantId);
    return callback(this);
  }

  reset() {
    this.cases = [
      { id: caseA, tenantId: tenantA },
      { id: caseB, tenantId: tenantB }
    ];
    this.hearings = [];
    this.executeRawCalls = 0;
    this.runWithTenantCalls = [];
    this.nextId = 1;
  }
}

describe("Case hearings endpoints (e2e)", () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: InMemoryCasesPrismaService;

  before(async () => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
    process.env.JWT_ACCESS_TTL = "15m";
    prisma = new InMemoryCasesPrismaService();
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, CasesModule]
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

  it("requires hearing permissions", async () => {
    await request(app.getHttpServer())
      .get(`/api/cases/${caseA}/hearings`)
      .set("Authorization", `Bearer ${makeToken(jwt, ["cases:read"])}`)
      .set("x-tenant-id", tenantA)
      .expect(403);
  });

  it("validates hearing input", async () => {
    await request(app.getHttpServer())
      .post(`/api/cases/${caseA}/hearings`)
      .set("Authorization", `Bearer ${makeToken(jwt, ["cases:read", "hearings:create"])}`)
      .set("x-tenant-id", tenantA)
      .send({
        date: "",
        description: "No",
        notificationsEnabled: true,
        time: "25:61",
        type: "unknown"
      })
      .expect(400);
  });

  it("creates, lists, updates and deletes a tenant-scoped hearing", async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/cases/${caseA}/hearings`)
      .set("Authorization", `Bearer ${makeToken(jwt, hearingWritePermissions)}`)
      .set("x-tenant-id", tenantA)
      .send(makeHearingPayload())
      .expect(201);

    assert.equal(created.body.type, "preliminary");
    assert.equal(created.body.date, "2026-08-20");
    assert.equal(created.body.time, "09:30");
    assert.equal(created.body.notificationsEnabled, true);

    const listed = await request(app.getHttpServer())
      .get(`/api/cases/${caseA}/hearings`)
      .set("Authorization", `Bearer ${makeToken(jwt, ["cases:read", "hearings:read"])}`)
      .set("x-tenant-id", tenantA)
      .expect(200);

    assert.equal(listed.body.items.length, 1);
    assert.equal(listed.body.items[0].id, created.body.id);

    const updated = await request(app.getHttpServer())
      .patch(`/api/cases/${caseA}/hearings/${created.body.id}`)
      .set("Authorization", `Bearer ${makeToken(jwt, hearingWritePermissions)}`)
      .set("x-tenant-id", tenantA)
      .send({
        ...makeHearingPayload(),
        description: "Audiencia de vista de causa",
        notificationsEnabled: false,
        type: "trial_view"
      })
      .expect(200);

    assert.equal(updated.body.type, "trial_view");
    assert.equal(updated.body.notificationsEnabled, false);

    await request(app.getHttpServer())
      .delete(`/api/cases/${caseA}/hearings/${created.body.id}`)
      .set("Authorization", `Bearer ${makeToken(jwt, hearingWritePermissions)}`)
      .set("x-tenant-id", tenantA)
      .expect(200);

    const empty = await request(app.getHttpServer())
      .get(`/api/cases/${caseA}/hearings`)
      .set("Authorization", `Bearer ${makeToken(jwt, ["cases:read", "hearings:read"])}`)
      .set("x-tenant-id", tenantA)
      .expect(200);

    assert.equal(empty.body.items.length, 0);
  });

  it("does not allow cross-tenant case writes", async () => {
    await request(app.getHttpServer())
      .post(`/api/cases/${caseB}/hearings`)
      .set("Authorization", `Bearer ${makeToken(jwt, hearingWritePermissions)}`)
      .set("x-tenant-id", tenantA)
      .send(makeHearingPayload())
      .expect(404);
  });

  it("includes hearings in the cached calendar response when allowed", async () => {
    await request(app.getHttpServer())
      .post(`/api/cases/${caseA}/hearings`)
      .set("Authorization", `Bearer ${makeToken(jwt, hearingWritePermissions)}`)
      .set("x-tenant-id", tenantA)
      .send(makeHearingPayload())
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/cases/${caseA}/calendar`)
      .query({ month: "2026-08", types: "hearing" })
      .set("Authorization", `Bearer ${makeToken(jwt, ["cases:read", "hearings:read"])}`)
      .set("x-tenant-id", tenantA)
      .expect(200);

    assert.equal(response.body.events.length, 1);
    assert.equal(response.body.events[0].type, "hearing");
    assert.equal(response.body.events[0].hearingType, "preliminary");
    assert.equal(response.body.events[0].time, "09:30");
    assert.ok(prisma.runWithTenantCalls.includes(tenantA));
  });

  it("recalculates overdue expenses through an explicit write endpoint", async () => {
    await request(app.getHttpServer())
      .post(`/api/cases/${caseA}/expenses/recalculate-overdue`)
      .set("Authorization", `Bearer ${makeToken(jwt, ["cases:read", "expenses:read"])}`)
      .set("x-tenant-id", tenantA)
      .expect(403);

    const response = await request(app.getHttpServer())
      .post(`/api/cases/${caseA}/expenses/recalculate-overdue`)
      .set("Authorization", `Bearer ${makeToken(jwt, ["cases:read", "expenses:update"])}`)
      .set("x-tenant-id", tenantA)
      .expect(200);

    assert.equal(response.body.status, "ok");
    assert.equal(response.body.updatedCount, 2);
    assert.equal(prisma.executeRawCalls, 1);
  });
});

const hearingWritePermissions = [
  "cases:read",
  "hearings:read",
  "hearings:create",
  "hearings:update",
  "hearings:delete"
];

function makeHearingPayload() {
  return {
    date: "2026-08-20",
    description: "Audiencia preliminar",
    notificationsEnabled: true,
    time: "09:30",
    type: "preliminary"
  };
}

function makeToken(jwt: JwtService, permissions: string[], tenantId = tenantA) {
  return jwt.sign({
    sub: "user-1",
    email: "mateo@estudio.com",
    sessionVersion: 0,
    sessionKind: "tenant",
    tenantAccess: [
      {
        tenantId,
        role: "owner",
        permissions
      }
    ]
  });
}

type HearingWriteData = {
  caseId: string;
  date: Date;
  description: string;
  notificationsEnabled: boolean;
  tenantId: string;
  time: string;
  type: string;
};

type HearingWhere = {
  caseId: string;
  date?: { gte?: Date; lt?: Date };
  id?: string;
  tenantId: string;
};

function matchesHearing(record: HearingRecord, where: HearingWhere) {
  if (record.caseId !== where.caseId || record.tenantId !== where.tenantId) {
    return false;
  }

  if (where.id && record.id !== where.id) {
    return false;
  }

  if (where.date?.gte && record.date < where.date.gte) {
    return false;
  }

  if (where.date?.lt && record.date >= where.date.lt) {
    return false;
  }

  return true;
}

function sortHearings(left: HearingRecord, right: HearingRecord, _orderBy: unknown) {
  return (
    left.date.getTime() - right.date.getTime() ||
    left.time.localeCompare(right.time) ||
    left.id.localeCompare(right.id)
  );
}

function selectRecord<TRecord extends Record<string, unknown>>(record: TRecord, select: unknown) {
  if (!select || typeof select !== "object") {
    return record;
  }

  return Object.fromEntries(
    Object.entries(select as Record<string, boolean>)
      .filter(([, enabled]) => enabled)
      .map(([key]) => [key, record[key]])
  );
}
