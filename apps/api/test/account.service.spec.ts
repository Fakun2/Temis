import "reflect-metadata";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { AccountService } from "../src/account/account.service";
import type { JwtPayload } from "../src/auth/auth.types";
import type { PrismaService } from "../src/database/prisma.service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const membershipId = "33333333-3333-4333-8333-333333333333";

describe("AccountService", () => {
  it("updates the current user profile without accepting tenant input", async () => {
    const prisma = makePrisma();
    const service = new AccountService(prisma);

    const account = await service.updateProfile(tenantId, makeUser(), {
      avatarUrl: "https://cdn.temis.local/avatar.png",
      firstName: "Mateo",
      lastName: "Alvarez",
      phone: "5491155555555"
    });

    assert.equal(prisma.__userUpdates[0]?.where.id, userId);
    assert.equal(prisma.__userUpdates[0]?.data.fullName, "Mateo Alvarez");
    assert.equal(account.profile.firstName, "Mateo");
  });

  it("rejects studio updates without tenant management permission", async () => {
    const prisma = makePrisma();
    const service = new AccountService(prisma);

    await assert.rejects(
      () =>
        service.updateStudio(tenantId, makeUser({ permissions: ["admin:access"] }), {
          address: "Calle 1",
          city: "La Plata",
          country: "Argentina",
          legalName: "Estudio Demo",
          logoUrl: undefined,
          name: "Estudio Demo",
          province: "Buenos Aires",
          taxId: "30-12345678-9",
          website: undefined
        }),
      ForbiddenException
    );

    assert.equal(prisma.__tenantUpdates.length, 0);
  });

  it("uses the active tenant when updating studio data", async () => {
    const prisma = makePrisma();
    const service = new AccountService(prisma);

    await service.updateStudio(tenantId, makeUser({ permissions: ["tenants:manage"] }), {
      address: "Calle 1",
      city: "La Plata",
      country: "Argentina",
      legalName: "Estudio Demo",
      logoUrl: undefined,
      name: "Estudio Demo",
      province: "Buenos Aires",
      taxId: "30-12345678-9",
      tenantId: "99999999-9999-4999-8999-999999999999",
      website: "https://estudio.demo"
    } as Parameters<AccountService["updateStudio"]>[2] & { tenantId: string });

    assert.equal(prisma.__tenantUpdates[0]?.where.id, tenantId);
    assert.equal(prisma.__profileUpserts[0]?.where.tenantId, tenantId);
  });

  it("rejects studio updates when another tenant already uses the requested name", async () => {
    const prisma = makePrisma({ studioNameConflict: true });
    const service = new AccountService(prisma);

    await assert.rejects(
      () =>
        service.updateStudio(tenantId, makeUser({ permissions: ["tenants:manage"] }), {
          address: "Calle 1",
          city: "La Plata",
          country: "Argentina",
          legalName: "Estudio Demo",
          logoUrl: undefined,
          name: "Estudio Demo",
          province: "Buenos Aires",
          taxId: "30-12345678-9",
          website: "https://estudio.demo"
        }),
      ConflictException
    );

    assert.equal(prisma.__tenantUpdates.length, 0);
    assert.equal(prisma.__profileUpserts.length, 0);
  });

  it("rejects studio updates when the requested CUIT/CUIL belongs to another owner", async () => {
    const prisma = makePrisma({ ownerTaxIdConflict: "30123456789" });
    const service = new AccountService(prisma);

    await assert.rejects(
      () =>
        service.updateStudio(tenantId, makeUser({ permissions: ["tenants:manage"] }), {
          address: "Calle 1",
          city: "La Plata",
          country: "Argentina",
          legalName: "Estudio Demo",
          logoUrl: undefined,
          name: "Estudio Sin Conflicto",
          province: "Buenos Aires",
          taxId: "30-12345678-9",
          website: "https://estudio.demo"
        }),
      ConflictException
    );

    assert.equal(prisma.__tenantUpdates.length, 0);
    assert.equal(prisma.__profileUpserts.length, 0);
  });

  it("upserts notification preferences for the active membership", async () => {
    const prisma = makePrisma();
    const service = new AccountService(prisma);

    await service.updateNotifications(tenantId, makeUser(), {
      browserNotifications: false,
      dailyDigest: true,
      emailReminders: true,
      inAppReminders: false,
      reminderLeadTime: 48
    });

    assert.equal(prisma.__settingsUpserts[0]?.where.tenantMembershipId, membershipId);
    assert.equal(prisma.__settingsUpserts[0]?.update.reminderLeadTime, 48);
  });

  it("aggregates current-month token usage in the account response", async () => {
    const prisma = makePrisma({ inputTokens: 1500, outputTokens: 700 });
    const service = new AccountService(prisma);

    const account = await service.getAccount(tenantId, makeUser());

    assert.equal(account.tokenUsage.usedTokens, 2200);
    assert.equal(account.tokenUsage.remainingTokens, 97800);
  });

  it("returns tenant-scoped real ai usage with daily zero-fill and summed tokens", async () => {
    const today = new Date();
    const yesterday = addUtcDays(today, -1);
    const todayKey = toDateKey(today);
    const yesterdayKey = toDateKey(yesterday);
    const prisma = makePrisma({
      aiRuns: [
        { createdAt: atUtcNoon(yesterday), inputTokens: 1000, outputTokens: 500 },
        { createdAt: atUtcNoon(today), inputTokens: 200, outputTokens: 300 }
      ]
    });
    const service = new AccountService(prisma);

    const usage = await service.getAiUsage(tenantId, makeUser());

    assert.equal(prisma.__aiChatRunFindMany[0]?.where.tenantId, tenantId);
    assert.equal(usage.dailyUsage.find((day) => day.date === yesterdayKey)?.totalTokens, 1500);
    assert.equal(usage.dailyUsage.find((day) => day.date === todayKey)?.totalTokens, 500);
    assert.ok(usage.dailyUsage.some((day) => day.totalTokens === 0));
    assert.equal(usage.metrics.totalTokens, 2000);
    assert.equal(usage.metrics.maxDailyTokens, 1500);
    assert.equal(usage.metrics.currentStreak, 2);
    assert.equal(usage.metrics.longestStreak, 2);
  });

  it("uploads the current user's avatar under the active tenant prefix", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const service = new AccountService(prisma, storage);

    const response = await service.uploadAvatar(tenantId, makeUser(), {
      buffer: Buffer.from("avatar"),
      mimetype: "image/png",
      originalname: "avatar.png",
      size: 6
    });

    assert.match(response.avatarUrl, /^\/api\/account\/avatar\?v=/);
    assert.equal(storage.__puts[0]?.key, `avatars/${tenantId}/${userId}/avatar`);
    assert.equal(storage.__puts[0]?.contentType, "image/png");
    assert.equal(storage.__puts[0]?.contentLength, 6);
    assert.equal(prisma.__userUpdates[0]?.where.id, userId);
    assert.match(String(prisma.__userUpdates[0]?.data.avatarUrl), /^\/api\/account\/avatar\?v=/);
  });

  it("accepts svg avatars with the allowed image mime type", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const service = new AccountService(prisma, storage);

    await service.uploadAvatar(tenantId, makeUser(), {
      buffer: Buffer.from("<svg />"),
      mimetype: "image/svg+xml",
      originalname: "avatar.svg",
      size: 7
    });

    assert.equal(storage.__puts[0]?.contentType, "image/svg+xml");
  });

  it("rejects invalid avatar uploads before writing to storage", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const service = new AccountService(prisma, storage);

    await assert.rejects(
      () =>
        service.uploadAvatar(tenantId, makeUser(), {
          buffer: Buffer.alloc(0),
          mimetype: "image/png",
          originalname: "avatar.png",
          size: 0
        }),
      BadRequestException
    );
    await assert.rejects(
      () =>
        service.uploadAvatar(tenantId, makeUser(), {
          buffer: Buffer.from("avatar"),
          mimetype: "image/gif",
          originalname: "avatar.gif",
          size: 6
        }),
      BadRequestException
    );
    await assert.rejects(
      () =>
        service.uploadAvatar(tenantId, makeUser(), {
          buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
          mimetype: "image/png",
          originalname: "avatar.png",
          size: 5 * 1024 * 1024 + 1
        }),
      BadRequestException
    );

    assert.equal(storage.__puts.length, 0);
    assert.equal(prisma.__userUpdates.length, 0);
  });

  it("serves only the authenticated user's stored avatar", async () => {
    const prisma = makePrisma({ avatarUrl: "/api/account/avatar?v=123" });
    const storage = makeStorage();
    const service = new AccountService(prisma, storage);

    const object = await service.getAvatar(tenantId, makeUser());

    assert.equal(storage.__gets[0], `avatars/${tenantId}/${userId}/avatar`);
    assert.equal(object.contentType, "image/png");
    assert.equal(object.contentLength, 6);
  });

  it("returns not found when the current user has no private avatar", async () => {
    const prisma = makePrisma({ avatarUrl: null });
    const storage = makeStorage();
    const service = new AccountService(prisma, storage);

    await assert.rejects(() => service.getAvatar(tenantId, makeUser()), NotFoundException);
    assert.equal(storage.__gets.length, 0);
  });
});

function makeUser({ permissions = ["admin:access"] }: { permissions?: string[] } = {}): JwtPayload {
  return {
    email: "mateo@estudio.com",
    sessionVersion: 1,
    sub: userId,
    tenantAccess: [
      {
        permissions,
        role: "owner",
        tenantId
      }
    ]
  };
}

function makePrisma({
  aiRuns = [],
  avatarUrl = null,
  inputTokens = 0,
  outputTokens = 0,
  ownerTaxIdConflict = null,
  studioNameConflict = false
}: {
  aiRuns?: Array<{ createdAt: Date; inputTokens: number | null; outputTokens: number | null }>;
  avatarUrl?: string | null;
  inputTokens?: number;
  ownerTaxIdConflict?: string | null;
  outputTokens?: number;
  studioNameConflict?: boolean;
} = {}) {
  const userUpdates: Array<{ data: Record<string, unknown>; where: { id: string } }> = [];
  const tenantUpdates: Array<{ data: Record<string, unknown>; where: { id: string } }> = [];
  const profileUpserts: Array<{
    create: Record<string, unknown>;
    update: Record<string, unknown>;
    where: { tenantId: string };
  }> = [];
  const settingsUpserts: Array<{
    create: Record<string, unknown>;
    update: Record<string, unknown>;
    where: { tenantMembershipId: string };
  }> = [];
  const aiChatRunFindMany: Array<{ where: { tenantId?: string } }> = [];

  const prisma = {
    __aiChatRunFindMany: aiChatRunFindMany,
    __profileUpserts: profileUpserts,
    __settingsUpserts: settingsUpserts,
    __tenantUpdates: tenantUpdates,
    __userUpdates: userUpdates,
    aiChatRun: {
      aggregate: async () => ({
        _sum: {
          inputTokens,
          outputTokens
        }
      }),
      findMany: async (input: { where: { tenantId?: string } }) => {
        aiChatRunFindMany.push(input);
        return aiRuns;
      }
    },
    runWithTenant: async (_tenantId: string, callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
    tenant: {
      findFirst: async () => (studioNameConflict ? { id: "tenant-with-same-name" } : null),
      findMany: async () =>
        ownerTaxIdConflict
          ? [
              {
                memberships: [{ id: "owner-membership" }],
                taxId: ownerTaxIdConflict
              }
            ]
          : [],
      findUnique: async () => ({
        id: tenantId,
        legalName: "Estudio Demo SRL",
        name: "Estudio Demo",
        profile: {
          address: "Calle 1",
          city: "La Plata",
          country: "Argentina",
          logoUrl: null,
          province: "Buenos Aires",
          website: "https://estudio.demo"
        },
        settings: {
          accountPlan: "trial",
          accountPlanStatus: "active",
          monthlyTokenLimit: 100000
        },
        taxId: "30-12345678-9"
      }),
      update: async (input: { data: Record<string, unknown>; where: { id: string } }) => {
        tenantUpdates.push(input);
        return input.data;
      }
    },
    tenantMembership: {
      findFirst: async () => ({
        id: membershipId,
        role: {
          code: "owner",
          name: "Owner"
        },
        settings: null,
        status: "active",
        user: {
          avatarUrl: null,
          email: "mateo@estudio.com",
          fullName: "Mateo Alvarez",
          id: userId,
          passwordHash: null,
          phone: "5491155555555"
        }
      })
    },
    tenantMembershipSettings: {
      upsert: async (input: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: { tenantMembershipId: string };
      }) => {
        settingsUpserts.push(input);
        return input.update;
      }
    },
    tenantProfile: {
      upsert: async (input: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: { tenantId: string };
      }) => {
        profileUpserts.push(input);
        return input.update;
      }
    },
    tenantSettings: {
      update: async () => ({ id: "settings-1" })
    },
    user: {
      findUnique: async () => ({
        avatarUrl,
        passwordHash: null
      }),
      update: async (input: { data: Record<string, unknown>; where: { id: string } }) => {
        userUpdates.push(input);
        return input.data;
      }
    }
  };

  return prisma as unknown as PrismaService & {
    __aiChatRunFindMany: typeof aiChatRunFindMany;
    __profileUpserts: typeof profileUpserts;
    __settingsUpserts: typeof settingsUpserts;
    __tenantUpdates: typeof tenantUpdates;
    __userUpdates: typeof userUpdates;
  };
}

function makeStorage() {
  const puts: Array<{
    body: Buffer;
    contentLength: number;
    contentType: string;
    key: string;
  }> = [];
  const gets: string[] = [];

  return {
    __gets: gets,
    __puts: puts,
    getObject: async (key: string) => {
      gets.push(key);
      return {
        body: Readable.from(Buffer.from("avatar")),
        contentLength: 6,
        contentType: "image/png"
      };
    },
    putObject: async (input: {
      body: Buffer;
      contentLength: number;
      contentType: string;
      key: string;
    }) => {
      puts.push(input);
    }
  } as unknown as ConstructorParameters<typeof AccountService>[1] & {
    __gets: typeof gets;
    __puts: typeof puts;
  };
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function atUtcNoon(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
