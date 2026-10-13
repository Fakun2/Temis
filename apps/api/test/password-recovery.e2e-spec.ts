import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compare, hash } from "bcryptjs";
import { AuthService } from "../src/auth/auth.service";
import { PasswordRecoveryRateLimiterService } from "../src/auth/password-recovery-rate-limiter.service";

type ResetCode = {
  attempts: number;
  codeHash: string;
  consumedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  invalidatedAt: Date | null;
  userId: string;
};

type PasswordRecoveryPrisma = {
  $executeRaw: (...args: unknown[]) => Promise<number>;
  $transaction: <T>(callback: (transaction: PasswordRecoveryPrisma) => Promise<T>) => Promise<T>;
  passwordResetCode: {
    create: (input: {
      data: Omit<ResetCode, "attempts" | "consumedAt" | "createdAt" | "id" | "invalidatedAt">;
    }) => Promise<ResetCode>;
    findFirst: (input: { where: { userId: string } }) => Promise<ResetCode | null>;
    update: (input: { data: Partial<ResetCode>; where: { id: string } }) => Promise<ResetCode>;
    updateMany: (input: {
      data: Partial<ResetCode>;
      where: { id?: string };
    }) => Promise<{ count: number }>;
  };
  user: {
    findUnique: (input: { where: { email?: string } }) => Promise<{
      email: string;
      id: string;
      passwordHash: string;
      sessionVersion: number;
      status: string;
    } | null>;
    update: (input: {
      data: { passwordHash: string; sessionVersion: { increment: number } };
    }) => Promise<unknown>;
  };
};

function createPasswordRecoveryFixture() {
  const user = {
    email: "mateo@estudio.com",
    id: "00000000-0000-0000-0000-000000000001",
    passwordHash: "",
    sessionVersion: 0,
    status: "active"
  };
  const otherUser = {
    email: "otro@estudio.com",
    id: "00000000-0000-0000-0000-000000000002",
    passwordHash: "",
    sessionVersion: 0,
    status: "active"
  };
  const resetCodes: ResetCode[] = [];
  const sentCodes: string[] = [];

  const prisma: PasswordRecoveryPrisma = {
    $executeRaw: async () => 0,
    user: {
      findUnique: async ({ where }: { where: { email?: string } }) =>
        where.email === user.email ? user : where.email === otherUser.email ? otherUser : null,
      update: async ({
        data
      }: {
        data: { passwordHash: string; sessionVersion: { increment: number } };
      }) => {
        user.passwordHash = data.passwordHash;
        user.sessionVersion += data.sessionVersion.increment;
        return user;
      }
    },
    passwordResetCode: {
      create: async ({
        data
      }: {
        data: Omit<ResetCode, "attempts" | "consumedAt" | "createdAt" | "id" | "invalidatedAt">;
      }) => {
        const resetCode: ResetCode = {
          attempts: 0,
          consumedAt: null,
          createdAt: new Date(),
          id: `reset-${resetCodes.length + 1}`,
          invalidatedAt: null,
          ...data
        };
        resetCodes.push(resetCode);
        return resetCode;
      },
      findFirst: async ({ where }) =>
        resetCodes.find(
          (resetCode) =>
            resetCode.userId === where.userId &&
            !resetCode.consumedAt &&
            !resetCode.invalidatedAt &&
            resetCode.expiresAt > new Date()
        ) ?? null,
      update: async ({ data, where }: { data: Partial<ResetCode>; where: { id: string } }) => {
        const resetCode = resetCodes.find((candidate) => candidate.id === where.id);
        assert.ok(resetCode);
        Object.assign(resetCode, data);
        return resetCode;
      },
      updateMany: async ({ data, where }: { data: Partial<ResetCode>; where: { id?: string } }) => {
        const candidates = resetCodes.filter((resetCode) => !where.id || resetCode.id === where.id);
        for (const resetCode of candidates) {
          Object.assign(resetCode, data);
        }
        return { count: candidates.length };
      }
    },
    $transaction: async <T>(callback: (transaction: PasswordRecoveryPrisma) => Promise<T>) =>
      callback(prisma)
  };

  const service = new AuthService(
    {} as never,
    {} as never,
    prisma as never,
    {} as never,
    {} as never,
    {
      sendPasswordRecoveryCode: async ({ code }: { code: string }) => {
        sentCodes.push(code);
      }
    } as never,
    new PasswordRecoveryRateLimiterService({
      eval: async () => 1,
      set: async () => "OK"
    } as never)
  );

  return { otherUser, resetCodes, sentCodes, service, user };
}

describe("Password recovery", () => {
  it("stores only a hash, consumes the code, and invalidates existing sessions", async () => {
    const fixture = createPasswordRecoveryFixture();
    fixture.user.passwordHash = await hash("password123", 12);

    const unknownResponse = await fixture.service.requestPasswordRecovery(
      { email: "unknown@estudio.com" },
      "127.0.0.2"
    );
    const requestResponse = await fixture.service.requestPasswordRecovery(
      { email: fixture.user.email },
      "127.0.0.1"
    );

    assert.deepEqual(unknownResponse, requestResponse);
    assert.equal(fixture.sentCodes.length, 1);
    assert.notEqual(fixture.resetCodes[0]?.codeHash, fixture.sentCodes[0]);
    assert.equal(await compare(fixture.sentCodes[0]!, fixture.resetCodes[0]!.codeHash), true);

    await fixture.service.confirmPasswordRecovery(
      {
        code: fixture.sentCodes[0]!,
        email: fixture.user.email,
        newPassword: "password456"
      },
      "127.0.0.1"
    );

    assert.equal(await compare("password456", fixture.user.passwordHash), true);
    assert.equal(fixture.user.sessionVersion, 1);
    assert.ok(fixture.resetCodes[0]?.consumedAt);
    await assert.rejects(() =>
      fixture.service.confirmPasswordRecovery(
        { code: fixture.sentCodes[0]!, email: fixture.user.email, newPassword: "password789" },
        "127.0.0.1"
      )
    );
  });

  it("does not accept a code generated for a different email address", async () => {
    const fixture = createPasswordRecoveryFixture();
    fixture.user.passwordHash = await hash("password123", 12);
    fixture.otherUser.passwordHash = await hash("password123", 12);

    await fixture.service.requestPasswordRecovery({ email: fixture.user.email }, "127.0.0.1");

    await assert.rejects(() =>
      fixture.service.confirmPasswordRecovery(
        {
          code: fixture.sentCodes[0]!,
          email: fixture.otherUser.email,
          newPassword: "password456"
        },
        "127.0.0.1"
      )
    );

    assert.equal(await compare("password123", fixture.user.passwordHash), true);
    assert.equal(await compare("password123", fixture.otherUser.passwordHash), true);
    assert.equal(fixture.otherUser.sessionVersion, 0);
  });
});
