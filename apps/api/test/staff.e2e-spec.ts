import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { ZodValidationPipe } from "nestjs-zod";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { StaffModule } from "../src/staff/staff.module";

const areaCivilId = "11111111-1111-4111-8111-111111111111";
const areaCustomId = "22222222-2222-4222-8222-222222222222";
const areaLaborId = "33333333-3333-4333-8333-333333333333";

type UserRecord = {
  dni: string | null;
  email: string;
  fullName: string;
  id: string;
  passwordHash: string;
  phone: string | null;
  status: "active";
};

type RoleRecord = {
  code: string;
  description: string | null;
  hierarchyLevel: 1 | 2 | 3;
  id: string;
  isSystem: boolean;
  name: string;
  tenantId: string | null;
};

type PracticeAreaRecord = {
  active: boolean;
  description: string | null;
  id: string;
  name: string;
  template: { code: string } | null;
  templateId: string | null;
  tenantId: string;
};

type MembershipRecord = {
  id: string;
  practiceAreas: Array<{ practiceArea: PracticeAreaRecord }>;
  role: RoleRecord;
  roleId: string;
  status: "active" | "invited" | "suspended";
  tenantId: string;
  user: UserRecord;
  userId: string;
};

class InMemoryStaffPrismaService {
  private memberships: MembershipRecord[] = [];
  private practiceAreas: PracticeAreaRecord[] = [];
  private roles: RoleRecord[] = [];
  private users: UserRecord[] = [];

  readonly tenantMembership = {
    findMany: async ({
      cursor,
      orderBy,
      skip = 0,
      take,
      where
    }: {
      cursor?: { id: string };
      orderBy?: Array<Record<string, unknown>>;
      skip?: number;
      take?: number;
      where: StaffWhere;
    }) => {
      const direction = getInMemorySortDirection(orderBy);
      const sorted = this.memberships
        .filter((membership) => this.matchesMembership(membership, where))
        .sort((left, right) => {
          const comparison = left.user.fullName.localeCompare(right.user.fullName, "es");
          return direction === "asc" ? comparison : -comparison;
        });
      const cursorIndex = cursor
        ? sorted.findIndex((membership) => membership.id === cursor.id)
        : -1;
      const startIndex = cursorIndex >= 0 ? cursorIndex + skip : 0;

      return typeof take === "number" ? sorted.slice(startIndex, startIndex + take) : sorted;
    },
    count: async ({ where }: { where: StaffWhere }) =>
      this.memberships.filter((membership) => this.matchesMembership(membership, where)).length,
    findFirst: async ({
      where
    }: {
      where: StaffWhere & { tenant?: unknown; userId?: string };
    }) => {
      if (where.tenantId === "tenant-empty" && where.userId === "user-1" && where.tenant) {
        return { id: "tenant-empty-membership" } as MembershipRecord;
      }

      return this.memberships.find((membership) => this.matchesMembership(membership, where)) ?? null;
    },
    create: async ({ data }: { data: CreateMembershipData }) => {
      const user = this.users.find((current) => current.id === data.userId);
      const role = this.roles.find((current) => current.id === data.roleId);
      assert.ok(user);
      assert.ok(role);

      const membership: MembershipRecord = {
        id: `membership-${this.memberships.length + 1}`,
        practiceAreas: [],
        role,
        roleId: role.id,
        status: data.status,
        tenantId: data.tenantId,
        user,
        userId: user.id
      };

      this.memberships.push(membership);
      return membership;
    },
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      const membership = this.memberships.find((current) => current.id === where.id);
      assert.ok(membership);
      return membership;
    }
  };

  readonly practiceArea = {
    findMany: async ({ where }: { where: PracticeAreaWhere }) => {
      return this.practiceAreas
        .filter(
          (area) =>
            area.tenantId === where.tenantId &&
            area.active === where.active &&
            (!where.id?.in || where.id.in.includes(area.id))
        )
        .sort((left, right) => left.name.localeCompare(right.name, "es"));
    }
  };

  readonly role = {
    findUnique: async ({ where }: { where: { code: string } }) =>
      this.roles.find((role) => role.code === where.code) ?? null,
    findMany: async () =>
      this.roles.sort((left, right) => left.name.localeCompare(right.name, "es"))
  };

  async $queryRaw() {
    return [{ sessionVersion: 0, status: "active" }];
  }

  readonly user = {
    findUnique: async ({ where }: { where: { dni?: string; email?: string } }) =>
      this.users.find(
        (user) =>
          (where.email !== undefined && user.email === where.email) ||
          (where.dni !== undefined && user.dni === where.dni)
      ) ?? null,
    create: async ({ data }: { data: CreateUserData }) => {
      const user: UserRecord = {
        dni: data.dni,
        email: data.email,
        fullName: data.fullName,
        id: `user-${this.users.length + 1}`,
        passwordHash: data.passwordHash,
        phone: data.phone ?? null,
        status: data.status
      };

      this.users.push(user);
      return user;
    }
  };

  readonly tenantMembershipPracticeArea = {
    createMany: async ({
      data
    }: {
      data: Array<{ practiceAreaId: string; tenantMembershipId: string }>;
    }) => {
      for (const assignment of data) {
        const membership = this.memberships.find(
          (current) => current.id === assignment.tenantMembershipId
        );
        const practiceArea = this.practiceAreas.find(
          (current) => current.id === assignment.practiceAreaId
        );
        if (membership && practiceArea) {
          membership.practiceAreas.push({ practiceArea });
        }
      }

      return { count: data.length };
    }
  };

  async $transaction(
    operations: Array<Promise<unknown>> | ((tx: InMemoryStaffPrismaService) => Promise<unknown>)
  ) {
    if (typeof operations === "function") {
      return operations(this);
    }

    return Promise.all(operations);
  }

  reset() {
    const ownerRole = makeRole("role-owner", "owner", "Owner", 3);
    const adminRole = makeRole("role-admin", "admin", "Administrador", 2);
    const lawyerRole = makeRole("role-lawyer", "lawyer", "Abogado", 1);
    const paralegalRole = makeRole("role-paralegal", "paralegal", "Paralegal", 1);
    this.roles = [ownerRole, adminRole, lawyerRole, paralegalRole];

    const civil = makePracticeArea(areaCivilId, "tenant-a", "Derecho Civil", "derecho-civil");
    const custom = makePracticeArea(areaCustomId, "tenant-a", "Marcas y Patentes", null);
    const labor = makePracticeArea(areaLaborId, "tenant-b", "Derecho Laboral", "derecho-laboral");
    this.practiceAreas = [civil, custom, labor];

    this.memberships = [
      makeMembership("membership-1", "tenant-a", "user-1", "Mateo Alvarez", adminRole, [civil]),
      makeMembership("membership-2", "tenant-a", "user-2", "Sofia Benitez", lawyerRole, [custom]),
      makeMembership(
        "membership-3",
        "tenant-a",
        "user-3",
        "Lucas Herrera",
        paralegalRole,
        [],
        "suspended"
      ),
      makeMembership("membership-4", "tenant-b", "user-4", "Camila Rojas", lawyerRole, [labor]),
      makeMembership("membership-5", "tenant-owner", "user-5", "Olivia Owner", ownerRole, [])
    ];
    const tenantBMembership = this.memberships.find(
      (membership) => membership.id === "membership-4"
    );
    assert.ok(tenantBMembership);
    tenantBMembership.user.dni = "39111222";
    const ownerMembership = this.memberships.find((membership) => membership.id === "membership-5");
    assert.ok(ownerMembership);
    ownerMembership.user.dni = "40111222";
    ownerMembership.user.email = "owner@estudio.com";
    this.users = this.memberships.map((membership) => membership.user);
  }

  private matchesMembership(membership: MembershipRecord, where: StaffWhere) {
    if (typeof where.id === "string" && membership.id !== where.id) {
      return false;
    }

    if (typeof where.id === "object" && where.id.not && membership.id === where.id.not) {
      return false;
    }

    if (where.tenantId && membership.tenantId !== where.tenantId) {
      return false;
    }

    if (where.status && membership.status !== where.status) {
      return false;
    }

    if (where.role?.code && membership.role.code !== where.role.code) {
      return false;
    }

    if (where.user?.fullName?.contains) {
      const needle = where.user.fullName.contains.toLowerCase();
      if (!membership.user.fullName.toLowerCase().includes(needle)) {
        return false;
      }
    }

    if (where.user?.fullName?.equals) {
      const expected = where.user.fullName.equals.toLowerCase();
      if (membership.user.fullName.toLowerCase() !== expected) {
        return false;
      }
    }

    if (where.user?.email && membership.user.email !== where.user.email) {
      return false;
    }

    if (where.user?.dni && membership.user.dni !== where.user.dni) {
      return false;
    }

    const areaId = where.practiceAreas?.some?.practiceArea?.id;
    if (areaId) {
      return membership.practiceAreas.some(
        ({ practiceArea }) =>
          practiceArea.id === areaId &&
          practiceArea.tenantId === where.practiceAreas?.some?.practiceArea?.tenantId
      );
    }

    return true;
  }
}

type StaffWhere = {
  id?: string | { not: string };
  practiceAreas?: { some: { practiceArea: { id: string; tenantId: string } } };
  role?: { code: string };
  status?: "active" | "invited" | "suspended";
  tenantId?: string;
  user?: {
    dni?: string;
    email?: string;
    fullName?: { contains?: string; equals?: string; mode: string };
  };
};

type PracticeAreaWhere = {
  active: boolean;
  id?: { in: string[] };
  tenantId: string;
};

type CreateUserData = {
  dni: string | null;
  email: string;
  fullName: string;
  passwordHash: string;
  phone?: string;
  status: "active";
};

type CreateMembershipData = {
  joinedAt: Date;
  roleId: string;
  status: "active";
  tenantId: string;
  userId: string;
};

describe("Staff endpoints (e2e)", () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: InMemoryStaffPrismaService;

  before(async () => {
    prisma = new InMemoryStaffPrismaService();

    const moduleRef = await Test.createTestingModule({
      imports: [StaffModule]
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

  it("requires an authenticated user", async () => {
    await request(app.getHttpServer()).get("/api/staff").set("x-tenant-id", "tenant-a").expect(401);
  });

  it("requires an active tenant header", async () => {
    await request(app.getHttpServer())
      .get("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:read"])}`)
      .expect(403);
  });

  it("requires staff read permission", async () => {
    await request(app.getHttpServer())
      .get("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["admin:access"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(403);
  });

  it("lists only staff from the active tenant", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(
      response.body.workers.map((worker: { fullName: string }) => worker.fullName),
      ["Lucas Herrera", "Mateo Alvarez", "Sofia Benitez"]
    );
    assert.equal(response.body.metrics.totalWorkers, 3);
    assert.equal(response.body.metrics.activeWorkers, 2);
    assert.equal(response.body.metrics.practiceAreasCount, 2);
    assert.deepEqual(
      response.body.filterOptions.practiceAreas.map((area: { custom: boolean; name: string }) => ({
        custom: area.custom,
        name: area.name
      })),
      [
        { custom: false, name: "Derecho Civil" },
        { custom: true, name: "Marcas y Patentes" }
      ]
    );
    assert.deepEqual(response.body.pageInfo, {
      hasNextPage: false,
      limit: 6,
      nextCursor: null
    });
  });

  it("returns an empty list with 200 when the tenant has no staff", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:read"], "tenant-empty")}`)
      .set("x-tenant-id", "tenant-empty")
      .expect(200);

    assert.deepEqual(response.body.workers, []);
    assert.equal(response.body.pageInfo.hasNextPage, false);
  });

  it("paginates staff with a cursor", async () => {
    const firstPage = await request(app.getHttpServer())
      .get("/api/staff")
      .query({ limit: 2 })
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.equal(firstPage.body.workers.length, 2);
    assert.equal(firstPage.body.pageInfo.hasNextPage, true);
    assert.ok(firstPage.body.pageInfo.nextCursor);

    const secondPage = await request(app.getHttpServer())
      .get("/api/staff")
      .query({ cursor: firstPage.body.pageInfo.nextCursor, limit: 2 })
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.equal(secondPage.body.workers.length, 1);
    assert.notDeepEqual(
      firstPage.body.workers.map((worker: { id: string }) => worker.id),
      secondPage.body.workers.map((worker: { id: string }) => worker.id)
    );
  });

  it("filters by role, status and practice area", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/staff")
      .query({ practiceAreaId: areaCustomId, role: "lawyer", status: "active" })
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(
      response.body.workers.map((worker: { fullName: string }) => worker.fullName),
      ["Sofia Benitez"]
    );
  });

  it("sorts workers by requested field and direction", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/staff")
      .query({ sortBy: "firstName", sortDirection: "desc" })
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(
      response.body.workers.map((worker: { firstName: string }) => worker.firstName),
      ["Sofia", "Mateo", "Lucas"]
    );
  });

  it("requires staff create permission to create staff", async () => {
    await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .send(makeCreateStaffPayload())
      .expect(403);
  });

  it("creates staff without returning password data", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send(makeCreateStaffPayload())
      .expect(201);

    assert.equal(response.body.fullName, "Valeria Torres");
    assert.equal(response.body.dni, "35111222");
    assert.equal(response.body.email, "valeria@estudio.com");
    assert.equal(response.body.role.code, "lawyer");
    assert.deepEqual(response.body.practiceAreas, []);
    assert.equal(response.body.password, undefined);
    assert.equal(response.body.passwordHash, undefined);
  });

  it("creates staff when phone is omitted", async () => {
    const { phone: _phone, ...payload } = makeCreateStaffPayload();

    const response = await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send(payload)
      .expect(201);

    assert.equal(response.body.phone, null);
  });

  it("creates staff when dni is omitted", async () => {
    const { dni: _dni, ...payload } = makeCreateStaffPayload();

    const response = await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send(payload)
      .expect(201);

    assert.equal(response.body.dni, null);
  });

  it("creates staff with assigned practice areas", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        practiceAreaIds: [areaCivilId, areaCustomId]
      })
      .expect(201);

    assert.deepEqual(response.body.practiceAreas.map((area: { id: string }) => area.id).sort(), [
      areaCivilId,
      areaCustomId
    ]);
  });

  it("rejects staff phone with more than 15 digits", async () => {
    await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        phone: "1234567890123456"
      })
      .expect(400);
  });

  it("prevents an admin from assigning a role with equal or higher hierarchy", async () => {
    await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        role: "admin"
      })
      .expect(403);

    await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        role: "owner"
      })
      .expect(403);
  });

  it("prevents an owner from changing their own role", async () => {
    await request(app.getHttpServer())
      .patch("/api/staff/membership-5")
      .set(
        "Authorization",
        `Bearer ${makeToken(jwt, ["staff:update"], "tenant-owner", "user-5", "owner")}`
      )
      .set("x-tenant-id", "tenant-owner")
      .send({
        dni: "40111222",
        email: "owner@estudio.com",
        firstName: "Olivia",
        lastName: "Owner",
        phone: "5491155555555",
        practiceAreaIds: [],
        role: "admin",
        status: "active"
      })
      .expect(403);
  });

  it("rejects invalid create staff input", async () => {
    await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        dni: "123",
        password: "weak"
      })
      .expect(400);
  });

  it("rejects duplicate email and DNI", async () => {
    await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        dni: "35111222"
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        email: "otra@estudio.com"
      })
      .expect(409);

    await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        dni: "36111222"
      })
      .expect(409);
  });

  it("reuses an existing global user when the email belongs to another tenant", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/staff")
      .set("Authorization", `Bearer ${makeToken(jwt, ["staff:create"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({
        ...makeCreateStaffPayload(),
        dni: "39111222",
        email: "user-4@estudio.com"
      })
      .expect(201);

    assert.equal(response.body.userId, "user-4");
    assert.equal(response.body.email, "user-4@estudio.com");
  });

  it("prevents deleting the tenant owner membership", async () => {
    await request(app.getHttpServer())
      .delete("/api/staff/membership-5")
      .set(
        "Authorization",
        `Bearer ${makeToken(jwt, ["staff:delete"], "tenant-owner", "user-5", "owner")}`
      )
      .set("x-tenant-id", "tenant-owner")
      .expect(403);
  });
});

function makeToken(
  jwt: JwtService,
  permissions: string[],
  tenantId = "tenant-a",
  userId = "user-1",
  role = "admin"
) {
  return jwt.sign({
    sub: userId,
    email: "mateo@estudio.com",
    sessionVersion: 0,
    sessionKind: "tenant",
    tenantAccess: [
      {
        tenantId,
        role,
        permissions
      }
    ]
  });
}

function makePracticeArea(
  id: string,
  tenantId: string,
  name: string,
  templateCode: string | null
): PracticeAreaRecord {
  return {
    active: true,
    description: null,
    id,
    name,
    template: templateCode ? { code: templateCode } : null,
    templateId: templateCode ? `template-${templateCode}` : null,
    tenantId
  };
}

function makeRole(id: string, code: string, name: string, hierarchyLevel: 1 | 2 | 3): RoleRecord {
  return {
    code,
    description: null,
    hierarchyLevel,
    id,
    isSystem: true,
    tenantId: null,
    name
  };
}

function makeMembership(
  id: string,
  tenantId: string,
  userId: string,
  fullName: string,
  role: RoleRecord,
  practiceAreas: PracticeAreaRecord[],
  status: "active" | "invited" | "suspended" = "active"
): MembershipRecord {
  return {
    id,
    practiceAreas: practiceAreas.map((practiceArea) => ({ practiceArea })),
    role,
    roleId: role.id,
    status,
    tenantId,
    user: {
      dni: null,
      email: `${userId}@estudio.com`,
      fullName,
      id: userId,
      passwordHash: "hashed-password",
      phone: null,
      status: "active"
    },
    userId
  };
}

function makeCreateStaffPayload() {
  return {
    dni: "35111222",
    email: "valeria@estudio.com",
    firstName: "Valeria",
    lastName: "Torres",
    password: "Abogado@123",
    phone: "5491155555555",
    practiceAreaIds: [],
    role: "lawyer"
  };
}

function getInMemorySortDirection(orderBy: Array<Record<string, unknown>> | undefined) {
  const firstOrder = orderBy?.[0];
  if (!firstOrder) {
    return "asc";
  }

  const serialized = JSON.stringify(firstOrder);
  return serialized.includes("desc") ? "desc" : "asc";
}
