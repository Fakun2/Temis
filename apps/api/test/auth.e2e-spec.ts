import "reflect-metadata";
import { INestApplication, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ZodValidationPipe } from "nestjs-zod";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { AuthModule } from "../src/auth/auth.module";
import { GoogleAuthService, type GoogleAuthProfile } from "../src/auth/google-auth.service";
import { PrismaService } from "../src/database/prisma.service";

type StoredUser = {
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  id: string;
  email: string;
  fullName: string;
  passwordHash: string | null;
  phone: string | null;
  status: "active" | "inactive";
  lastLoginAt: Date | null;
};

class InMemoryPrismaService {
  private identities = new Map<string, StoredUserIdentity>();
  private users = new Map<string, StoredUser>();
  private userSequence = 1;
  private identitySequence = 1;

  readonly user = {
    findUnique: async ({
      select,
      where
    }: {
      select?: { memberships?: unknown; sessionVersion?: boolean };
      where: { email?: string; id?: string };
    }) => {
      const user = where.email
        ? this.users.get(where.email) ?? null
        : [...this.users.values()].find((candidate) => candidate.id === where.id) ?? null;

      if (!user || !select) {
        return user;
      }

      return {
        email: user.email,
        id: user.id,
        memberships: [],
        sessionVersion: 0
      };
    },
    create: async ({
      data
    }: {
      data: {
        avatarUrl?: string | null;
        emailVerifiedAt?: Date;
        fullName: string;
        email: string;
        passwordHash: string | null;
        phone?: string;
        status: "active" | "inactive";
      };
    }) => {
      const user: StoredUser = {
        id: `00000000-0000-0000-0000-${String(this.userSequence++).padStart(12, "0")}`,
        email: data.email,
        avatarUrl: data.avatarUrl ?? null,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        phone: data.phone ?? null,
        status: data.status,
        lastLoginAt: null
      };

      this.users.set(user.email, user);
      return user;
    },
    update: async ({
      where,
      data
    }: {
      where: { id: string };
      data: {
        avatarUrl?: string | null;
        emailVerifiedAt?: Date;
        lastLoginAt?: Date;
        status?: "active" | "inactive";
      };
    }) => {
      const user = [...this.users.values()].find((candidate) => candidate.id === where.id);
      assert.ok(user, "Expected stored user to exist before update.");

      if ("avatarUrl" in data) {
        user.avatarUrl = data.avatarUrl ?? null;
      }
      if (data.emailVerifiedAt) {
        user.emailVerifiedAt = data.emailVerifiedAt;
      }
      if (data.lastLoginAt) {
        user.lastLoginAt = data.lastLoginAt;
      }
      if (data.status) {
        user.status = data.status;
      }
      return user;
    }
  };

  readonly userIdentity = {
    findUnique: async ({
      where
    }: {
      where: { provider_providerUserId: { provider: string; providerUserId: string } };
      include?: { user?: boolean };
    }) => {
      const identity = this.identities.get(toIdentityKey(where.provider_providerUserId));
      if (!identity) {
        return null;
      }

      return {
        ...identity,
        user: [...this.users.values()].find((user) => user.id === identity.userId) ?? null
      };
    },
    upsert: async ({
      where,
      update,
      create
    }: {
      where: { provider_providerUserId: { provider: string; providerUserId: string } };
      update: { email: string; userId?: string };
      create: { email: string; provider: string; providerUserId: string; userId: string };
    }) => {
      const key = toIdentityKey(where.provider_providerUserId);
      const existing = this.identities.get(key);

      if (existing) {
        existing.email = update.email;
        if (update.userId) {
          existing.userId = update.userId;
        }
        return existing;
      }

      const identity: StoredUserIdentity = {
        id: `identity-${this.identitySequence++}`,
        ...create
      };
      this.identities.set(key, identity);
      return identity;
    }
  };

  readonly tenantMembership = {
    findMany: async () => []
  };

  $transaction<T>(callback: (tx: this) => Promise<T>) {
    return callback(this);
  }

  reset() {
    this.identities.clear();
    this.users.clear();
    this.identitySequence = 1;
    this.userSequence = 1;
  }
}

type StoredUserIdentity = {
  email: string;
  id: string;
  provider: string;
  providerUserId: string;
  userId: string;
};

class FakeGoogleAuthService {
  profile: GoogleAuthProfile = {
    avatarUrl: "https://lh3.googleusercontent.com/a/demo",
    email: "mateo@estudio.com",
    fullName: "Mateo Alvarez",
    providerUserId: "google-user-1"
  };

  async verifyIdToken(idToken: string) {
    if (idToken === "invalid") {
      throw new UnauthorizedException("No se pudo verificar la cuenta de Google.");
    }

    return this.profile;
  }
}

function toIdentityKey(input: { provider: string; providerUserId: string }) {
  return `${input.provider}:${input.providerUserId}`;
}

describe("Auth endpoints (e2e)", () => {
  let app: INestApplication;
  let googleAuth: FakeGoogleAuthService;
  let prisma: InMemoryPrismaService;

  before(async () => {
    prisma = new InMemoryPrismaService();
    googleAuth = new FakeGoogleAuthService();

    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(GoogleAuthService)
      .useValue(googleAuth)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ZodValidationPipe());

    await app.init();
  });

  beforeEach(() => {
    prisma.reset();
    googleAuth.profile = {
      avatarUrl: "https://lh3.googleusercontent.com/a/demo",
      email: "mateo@estudio.com",
      fullName: "Mateo Alvarez",
      providerUserId: "google-user-1"
    };
  });

  after(async () => {
    await app.close();
  });

  it("creates a global user account without exposing the password hash", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/create-account")
      .send({
        fullName: "Mateo Alvarez",
        email: "MATEO@ESTUDIO.COM",
        password: "password123",
        phone: "+54 9 11 5555-5555"
      })
      .expect(201);

    assert.equal(response.body.user.email, "mateo@estudio.com");
    assert.equal(response.body.user.fullName, "Mateo Alvarez");
    assert.equal(response.body.user.status, "active");
    assert.equal(response.body.user.passwordHash, undefined);
  });

  it("rejects invalid create-account email and password with Zod validation", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/create-account")
      .send({
        fullName: "M",
        email: "no-es-email",
        password: "short"
      })
      .expect(400);
  });

  it("logs in a valid account and returns JWT tokens", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/create-account")
      .send({
        fullName: "Mateo Alvarez",
        email: "mateo@estudio.com",
        password: "password123"
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "mateo@estudio.com",
        password: "password123"
      })
      .expect(200);

    assert.equal(response.body.user.email, "mateo@estudio.com");
    assert.equal(response.body.tokens.tokenType, "Bearer");
    assert.equal(typeof response.body.tokens.accessToken, "string");
    assert.equal(typeof response.body.tokens.refreshToken, "string");
  });

  it("rejects invalid login email and password with Zod validation", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "wrong",
        password: "sin-numero"
      })
      .expect(400);
  });

  it("rejects wrong credentials", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/create-account")
      .send({
        fullName: "Mateo Alvarez",
        email: "mateo@estudio.com",
        password: "password123"
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "mateo@estudio.com",
        password: "password999"
      })
      .expect(401);
  });

  it("logs in with Google and creates a passwordless user identity", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/google")
      .send({ idToken: "valid-google-id-token" })
      .expect(200);

    assert.equal(response.body.user.email, "mateo@estudio.com");
    assert.equal(response.body.user.avatarUrl, "https://lh3.googleusercontent.com/a/demo");
    assert.equal(response.body.tokens.tokenType, "Bearer");

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "mateo@estudio.com",
        password: "password123"
      })
      .expect(401);
  });

  it("auto-links a verified Google identity to an existing email account", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/create-account")
      .send({
        fullName: "Mateo Alvarez",
        email: "mateo@estudio.com",
        password: "password123"
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/api/auth/google")
      .send({ idToken: "valid-google-id-token" })
      .expect(200);

    assert.equal(response.body.user.email, "mateo@estudio.com");
    assert.equal(response.body.tokens.tokenType, "Bearer");

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "mateo@estudio.com",
        password: "password123"
      })
      .expect(200);
  });

  it("rejects invalid Google identity tokens", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/google")
      .send({ idToken: "invalid" })
      .expect(401);
  });

  it("rejects Google login for suspended users", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/auth/create-account")
      .send({
        fullName: "Mateo Alvarez",
        email: "mateo@estudio.com",
        password: "password123"
      })
      .expect(201);

    await prisma.user.update({
      where: { id: created.body.user.id },
      data: { status: "inactive" }
    });

    await request(app.getHttpServer())
      .post("/api/auth/google")
      .send({ idToken: "valid-google-id-token" })
      .expect(403);
  });
});
