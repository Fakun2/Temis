import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { ZodValidationPipe } from "nestjs-zod";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PrismaService } from "../src/database/prisma.service";
import { ForumsModule } from "../src/forums/forums.module";
import { ProvincesModule } from "../src/provinces/provinces.module";

const jujuyProvinceId = "11111111-1111-4111-8111-111111111111";
const cordobaProvinceId = "22222222-2222-4222-8222-222222222222";

type ProvinceRecord = {
  active: boolean;
  code: string;
  country: string;
  displayOrder: number;
  id: string;
  name: string;
  province: string | null;
};

type ForumTemplateRecord = {
  active: boolean;
  code: string;
  createdAt: Date;
  description: string | null;
  displayOrder: number;
  id: string;
  name: string;
  province: ProvinceRecord;
  provinceId: string;
  updatedAt: Date;
};

class InMemoryLegalCatalogPrismaService {
  private forumTemplates: ForumTemplateRecord[] = [];
  private provinces: ProvinceRecord[] = [];

  readonly tenantMembership = {
    findFirst: async () => ({ id: "active-membership" })
  };

  readonly forumTemplate = {
    findMany: async ({
      orderBy,
      skip = 0,
      take,
      where
    }: {
      orderBy?: unknown;
      skip?: number;
      take?: number;
      where: CatalogWhere;
    }) =>
      paginate(
        this.forumTemplates
          .filter((forum) => matchesForumTemplate(forum, where))
          .sort((left, right) => sortForums(left, right, orderBy)),
        skip,
        take
      ),
    count: async ({ where }: { where: CatalogWhere }) =>
      this.forumTemplates.filter((forum) => matchesForumTemplate(forum, where)).length
  };

  readonly province = {
    findMany: async ({
      orderBy,
      skip = 0,
      take
    }: {
      orderBy?: unknown;
      skip?: number;
      take?: number;
    }) =>
      paginate(
        this.provinces
          .filter((province) => province.active)
          .sort((left, right) => sortProvinces(left, right, orderBy)),
        skip,
        take
      ),
    count: async () => this.provinces.filter((province) => province.active).length
  };

  async $transaction<T>(operations: Promise<T>[]): Promise<T[]> {
    return Promise.all(operations);
  }

  async $queryRaw() {
    return [{ sessionVersion: 0, status: "active" }];
  }

  reset() {
    const jujuy = makeProvince(jujuyProvinceId, "ar-jujuy", "Jujuy", 100);
    const cordoba = makeProvince(cordobaProvinceId, "ar-cordoba", "Cordoba", 60);

    this.provinces = [jujuy, cordoba];
    this.forumTemplates = [
      makeForumTemplate("forum-template-a", "ar-jujuy-ambiental", "Ambiental", jujuy, 10),
      makeForumTemplate("forum-template-b", "ar-cordoba-penal", "Penal", cordoba, 20)
    ];
  }
}

describe("Legal catalog endpoints (e2e)", () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: InMemoryLegalCatalogPrismaService;

  before(async () => {
    prisma = new InMemoryLegalCatalogPrismaService();
    const moduleRef = await Test.createTestingModule({
      imports: [ForumsModule, ProvincesModule]
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

  it("requires permissions for legal catalogs", async () => {
    await request(app.getHttpServer())
      .get("/api/forums")
      .set("Authorization", `Bearer ${makeToken(jwt, ["admin:access"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(403);
  });

  it("lists global forum templates for any active tenant", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/forums")
      .query({ limit: 8, offset: 0 })
      .set("Authorization", `Bearer ${makeToken(jwt, ["forums:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(
      response.body.items.map((forum: { name: string }) => forum.name),
      ["Ambiental", "Penal"]
    );
    assert.equal(response.body.items[0].province.code, "ar-jujuy");
    assert.equal(response.body.items[0].templateId, "forum-template-a");
    assert.equal(response.body.items[0].isSystem, true);
    assert.deepEqual(response.body.pageInfo, {
      hasNextPage: false,
      hasPreviousPage: false,
      limit: 8,
      offset: 0,
      total: 2
    });
  });

  it("filters global forum templates by province", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/forums")
      .query({ provinceId: cordobaProvinceId })
      .set("Authorization", `Bearer ${makeToken(jwt, ["forums:read"], "tenant-a")}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(
      response.body.items.map((forum: { name: string }) => forum.name),
      ["Penal"]
    );
    assert.equal(response.body.pageInfo.total, 1);
  });

  it("lists active global provinces", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/provinces")
      .set("Authorization", `Bearer ${makeToken(jwt, ["provinces:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(200);

    assert.deepEqual(
      response.body.items.map((province: { code: string }) => province.code),
      ["ar-cordoba", "ar-jujuy"]
    );
    assert.equal(response.body.pageInfo.total, 2);
  });

  it("does not expose legal catalog CRUD routes", async () => {
    await request(app.getHttpServer())
      .post("/api/forums")
      .set("Authorization", `Bearer ${makeToken(jwt, ["forums:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .send({ name: "Custom" })
      .expect(404);

    await request(app.getHttpServer())
      .get("/api/jurisdictions")
      .set("Authorization", `Bearer ${makeToken(jwt, ["provinces:read"])}`)
      .set("x-tenant-id", "tenant-a")
      .expect(404);
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
        role: "owner",
        permissions
      }
    ]
  });
}

function makeProvince(
  id: string,
  code: string,
  name: string,
  displayOrder: number
): ProvinceRecord {
  return {
    active: true,
    code,
    country: "Argentina",
    displayOrder,
    id,
    name,
    province: name
  };
}

function makeForumTemplate(
  id: string,
  code: string,
  name: string,
  province: ProvinceRecord,
  displayOrder: number
): ForumTemplateRecord {
  return {
    active: true,
    code,
    createdAt: new Date(),
    description: null,
    displayOrder,
    id,
    name,
    province,
    provinceId: province.id,
    updatedAt: new Date()
  };
}

type CatalogWhere = {
  active?: boolean;
  name?: { contains: string };
  provinceId?: string;
};

function matchesForumTemplate(record: ForumTemplateRecord, where: CatalogWhere) {
  if (where.active !== undefined && record.active !== where.active) {
    return false;
  }

  if (where.provinceId !== undefined && record.provinceId !== where.provinceId) {
    return false;
  }

  if (
    where.name?.contains &&
    !record.name.toLowerCase().includes(where.name.contains.toLowerCase())
  ) {
    return false;
  }

  return true;
}

function paginate<T>(items: T[], skip: number, take: number | undefined) {
  return items.slice(skip, take === undefined ? undefined : skip + take);
}

function sortForums(left: ForumTemplateRecord, right: ForumTemplateRecord, orderBy: unknown) {
  const nameDirection = getNameSortDirection(orderBy);

  if (left.active !== right.active) {
    return left.active ? -1 : 1;
  }

  return (
    compareByDirection(left.name, right.name, nameDirection) ||
    left.province.name.localeCompare(right.province.name, "es")
  );
}

function sortProvinces(left: ProvinceRecord, right: ProvinceRecord, orderBy: unknown) {
  const nameDirection = getNameSortDirection(orderBy);
  return (
    compareByDirection(left.name, right.name, nameDirection) ||
    left.displayOrder - right.displayOrder
  );
}

function compareByDirection(left: string, right: string, direction: "asc" | "desc") {
  const comparison = left.localeCompare(right, "es");
  return direction === "asc" ? comparison : -comparison;
}

function getNameSortDirection(orderBy: unknown): "asc" | "desc" {
  return JSON.stringify(orderBy).includes('"name":"desc"') ? "desc" : "asc";
}
