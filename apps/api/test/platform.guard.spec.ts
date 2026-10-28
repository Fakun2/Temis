import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformGuard } from "../src/platform/platform.guard";

function context(request: unknown) {
  return {
    getClass: () => undefined,
    getHandler: () => undefined,
    switchToHttp: () => ({ getRequest: () => request })
  } as never;
}

const trustedDeviceHeaders = {
  "x-temis-device-certificate-fingerprint": "aa".repeat(20),
  "x-temis-device-id": "CN=device-1",
  "x-temis-mtls-verified": "SUCCESS"
};

const requiredMode = { isDisabled: () => false, mode: "required" } as never;
const disabledMode = { isDisabled: () => true, mode: "disabled" } as never;

function platformAccess(mode: "disabled" | "required", permissions = ["platform:access"]) {
  return { permissions, role: "super_admin", securityMode: mode };
}

function requiredSession() {
  return {
    absoluteExpiresAt: new Date(Date.now() + 60_000),
    device: { certificateFingerprint: "aa".repeat(20), status: "active" },
    deviceId: "device-1",
    lastActivityAt: new Date(),
    securityMode: "required",
    status: "active",
    userId: "user-1"
  };
}

describe("PlatformGuard", () => {
  it("rejects a tenant-only user", async () => {
    const guard = new PlatformGuard(
      { getAllAndOverride: () => ["platform:access"] } as never,
      { platformRoleAssignment: { findUnique: async () => null } } as never,
      requiredMode
    );
    assert.equal(
      await guard.canActivate(context({ user: { sessionKind: "tenant", sub: "user-1", tenantAccess: [] } })),
      false
    );
  });

  it("accepts an active required-mode session with matching mTLS identity", async () => {
    let userId: string | null = null;
    const guard = new PlatformGuard(
      { getAllAndOverride: () => ["platform:observability:read"] } as never,
      {
        platformRoleAssignment: {
          findUnique: async ({ where }: { where: { userId: string } }) => {
            userId = where.userId;
            return { roleCode: "super_admin", status: "active" };
          }
        },
        platformSession: { findUnique: async () => requiredSession() }
      } as never,
      requiredMode
    );

    assert.equal(
      await guard.canActivate(
        context({
          headers: trustedDeviceHeaders,
          ip: "127.0.0.1",
          socket: {},
          user: {
            sessionKind: "platform",
            platformAccess: platformAccess("required", [
              "platform:access",
              "platform:observability:read"
            ]),
            platformDeviceId: "device-1",
            sid: "session-1",
            sub: "user-1",
            tenantAccess: []
          }
        })
      ),
      true
    );
    assert.equal(userId, "user-1");
  });

  it("rejects a token without the required platform permission", async () => {
    const guard = new PlatformGuard(
      { getAllAndOverride: () => ["platform:account:self_manage"] } as never,
      {} as never,
      requiredMode
    );
    assert.equal(
      await guard.canActivate(
        context({
          user: {
            sessionKind: "platform",
            platformAccess: platformAccess("required"),
            sid: "session-1",
            sub: "user-1"
          }
        })
      ),
      false
    );
  });

  it("rejects required mode when mTLS metadata is missing", async () => {
    const guard = new PlatformGuard(
      { getAllAndOverride: () => ["platform:access"] } as never,
      {
        platformRoleAssignment: {
          findUnique: async () => ({ roleCode: "super_admin", status: "active" })
        },
        platformSession: { findUnique: async () => requiredSession() }
      } as never,
      requiredMode
    );
    assert.equal(
      await guard.canActivate(
        context({
          headers: {},
          socket: {},
          user: {
            sessionKind: "platform",
            platformAccess: platformAccess("required"),
            platformDeviceId: "device-1",
            sid: "session-1",
            sub: "user-1"
          }
        })
      ),
      false
    );
  });

  it("accepts a password-only session without device metadata in disabled mode", async () => {
    const guard = new PlatformGuard(
      { getAllAndOverride: () => ["platform:access"] } as never,
      {
        platformRoleAssignment: {
          findUnique: async () => ({ roleCode: "super_admin", status: "active" })
        },
        platformSession: {
          findUnique: async () => ({
            absoluteExpiresAt: new Date(Date.now() + 60_000),
            device: null,
            deviceId: null,
            lastActivityAt: new Date(),
            securityMode: "disabled",
            status: "active",
            userId: "user-1"
          })
        }
      } as never,
      disabledMode
    );
    assert.equal(
      await guard.canActivate(
        context({
          headers: {},
          user: {
            sessionKind: "platform",
            platformAccess: platformAccess("disabled"),
            sid: "session-1",
            sub: "user-1"
          }
        })
      ),
      true
    );
  });

  it("rejects a token issued under a different security mode", async () => {
    const guard = new PlatformGuard(
      { getAllAndOverride: () => ["platform:access"] } as never,
      {} as never,
      disabledMode
    );
    assert.equal(
      await guard.canActivate(
        context({
          user: {
            sessionKind: "platform",
            platformAccess: platformAccess("required"),
            sid: "session-1",
            sub: "user-1"
          }
        })
      ),
      false
    );
  });
});
