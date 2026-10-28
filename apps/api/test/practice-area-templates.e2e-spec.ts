import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { AuthModule } from "../src/auth/auth.module";
import { PrismaService } from "../src/database/prisma.service";
import { DEFAULT_PRACTICE_AREA_TEMPLATES } from "../src/practice-area-templates/practice-area-template.constants";
import { PracticeAreaTemplatesModule } from "../src/practice-area-templates/practice-area-templates.module";

class InMemoryPracticeAreaTemplatesPrismaService {
  async $queryRaw() {
    return [{ sessionVersion: 0, status: "active" }];
  }

  readonly practiceAreaTemplate = {
    findMany: async ({
      where,
      orderBy
    }: {
      where: { active: boolean };
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }];
    }) => {
      assert.equal(where.active, true);
      assert.deepEqual(orderBy, [{ displayOrder: "asc" }, { name: "asc" }]);

      return DEFAULT_PRACTICE_AREA_TEMPLATES.map((template, index) => ({
        id: `10000000-0000-0000-0000-${String(index + 101).padStart(12, "0")}`,
        ...template,
        description: null,
        active: true
      }));
    }
  };
}

describe("Practice area template endpoints (e2e)", () => {
  let app: INestApplication;
  let jwt: JwtService;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, PracticeAreaTemplatesModule]
    })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPracticeAreaTemplatesPrismaService())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    jwt = moduleRef.get(JwtService);

    await app.init();
  });

  after(async () => {
    await app.close();
  });

  it("requires an authenticated user", async () => {
    await request(app.getHttpServer()).get("/api/practice-area-templates").expect(401);
  });

  it("lists active reusable practice area templates", async () => {
    const accessToken = jwt.sign({
      sub: "00000000-0000-0000-0000-000000000999",
      email: "mateo@estudio.com",
      sessionVersion: 0,
      sessionKind: "tenant",
      tenantAccess: []
    });

    const response = await request(app.getHttpServer())
      .get("/api/practice-area-templates")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    assert.deepEqual(
      response.body.map((template: { code: string }) => template.code),
      DEFAULT_PRACTICE_AREA_TEMPLATES.map((template) => template.code)
    );
  });
});
