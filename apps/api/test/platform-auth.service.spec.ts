import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hash } from "bcryptjs";
import { PlatformAuthService } from "../src/auth/platform-auth.service";

describe("PlatformAuthService security modes", () => {
  it("issues a password-only session without device or posture in disabled mode", async () => {
    const passwordHash = await hash("correct-horse", 4);
    const sessions: Array<Record<string, unknown>> = [];
    const jwtPayloads: Array<Record<string, unknown>> = [];
    const user = {
      avatarUrl: null,
      email: "admin@temis.ar",
      fullName: "Admin Temis",
      id: "00000000-0000-0000-0000-000000000001",
      passwordHash,
      phone: null,
      platformAuthenticators: [],
      platformDevices: [],
      platformRoleAssignment: { roleCode: "super_admin", status: "active" },
      sessionVersion: 1,
      status: "active",
      _count: { memberships: 0 }
    };
    const prisma = {
      asyncOutboxEvent: { create: async () => ({}) },
      platformSecurityEvent: { create: async () => ({ id: "event-1" }) },
      platformSession: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          sessions.push(data);
          return data;
        }
      },
      user: {
        findUnique: async () => user,
        findUniqueOrThrow: async () => user
      },
      $transaction: async (callback: (transaction: unknown) => Promise<unknown>) => callback(prisma)
    };
    const service = new PlatformAuthService(
      prisma as never,
      {
        signAsync: async (payload: Record<string, unknown>) => {
          jwtPayloads.push(payload);
          return "access-token";
        }
      } as never,
      { get: () => undefined } as never,
      { isDisabled: () => true, mode: "disabled" } as never,
      { assess: async () => assert.fail("Posture must not run in disabled mode") } as never,
      { assertRateLimit: async () => undefined } as never,
      { record: async () => undefined } as never
    );

    const result = await service.startLogin(
      { email: user.email, password: "correct-horse" },
      { ipAddress: "127.0.0.1", userAgent: "test" }
    );

    assert.equal(result.status, "access_granted");
    assert.equal(result.securityMode, "disabled");
    const sessionData = sessions[0]!;
    const jwtPayload = jwtPayloads[0]!;
    assert.deepEqual(sessionData.authMethods, ["pwd"]);
    assert.equal(sessionData.deviceId, null);
    assert.equal(sessionData.postureCheckedAt, null);
    assert.deepEqual(jwtPayload.amr, ["pwd"]);
    assert.equal(jwtPayload.sessionKind, "platform");
    assert.equal("tenantAccess" in jwtPayload, false);
    assert.deepEqual(jwtPayload.platformAccess, {
      permissions: [
        "platform:access",
        "platform:account:self_manage",
        "platform:observability:read",
        "platform:users:read",
        "platform:announcements:manage"
      ],
      role: "super_admin",
      securityMode: "disabled"
    });
  });
});
