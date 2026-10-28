import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "../src/auth/jwt.strategy";
import type { TenantJwtPayload } from "../src/auth/auth.types";

function strategy() {
  const prisma = {
    $queryRaw: async () => [{ sessionVersion: 1, status: "active" }]
  };
  return new JwtStrategy({ get: () => "test-access-secret" } as never, prisma as never);
}

const base = { email: "admin@temis.ar", sessionVersion: 1, sub: "00000000-0000-0000-0000-000000000001" };

describe("JwtStrategy sessionKind", () => {
  it("accepts a tenant payload with no platform fields", async () => {
    const payload: TenantJwtPayload = { ...base, sessionKind: "tenant", tenantAccess: [] };
    assert.deepEqual(await strategy().validate(payload), payload);
  });

  it("accepts a platform payload with no tenant fields", async () => {
    const payload = {
      ...base,
      amr: ["pwd"],
      authTime: new Date().toISOString(),
      platformAccess: { permissions: ["platform:access"], role: "super_admin", securityMode: "disabled" },
      sessionKind: "platform",
      sid: "session-1"
    } as const;
    assert.deepEqual(await strategy().validate(payload as never), payload);
  });

  it("rejects a token without a discriminator", async () => {
    await assert.rejects(() => strategy().validate({ ...base, tenantAccess: [] } as never), UnauthorizedException);
  });

  it("rejects a hybrid tenant/platform payload", async () => {
    await assert.rejects(
      () => strategy().validate({
        ...base,
        platformAccess: { permissions: [], role: "super_admin", securityMode: "disabled" },
        sessionKind: "tenant",
        tenantAccess: []
      } as never),
      UnauthorizedException
    );
  });
});
