import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { PlatformNewslettersController } from "../src/platform/platform-newsletters.controller";
import { NewslettersController } from "../src/announcements/newsletters.controller";
import { PLATFORM_PERMISSIONS_KEY } from "../src/platform/platform.decorator";
import { PERMISSIONS_KEY } from "../src/auth/permissions.decorator";
import { PlatformGuard } from "../src/platform/platform.guard";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";
import { TenantAuthGuard } from "../src/auth/tenant-auth.guard";
import { TenantGuard } from "../src/tenancy/tenant.guard";
import { PermissionsGuard } from "../src/auth/permissions.guard";
import { PLATFORM_PERMISSIONS } from "../src/platform/platform.constants";
import { Reflector } from "@nestjs/core";

describe("newsletter endpoint authorization", () => {
  it("requires platform authentication and the management permission for every administrative operation", () => {
    const controller = PlatformNewslettersController;
    assert.deepEqual(Reflect.getMetadata(PLATFORM_PERMISSIONS_KEY, controller), [
      "platform:announcements:manage"
    ]);
    assert.ok(PLATFORM_PERMISSIONS.includes("platform:announcements:manage"));
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[];
    assert.ok(guards.includes(JwtAuthGuard));
    assert.ok(guards.includes(PlatformGuard));
    for (const method of [
      "list",
      "create",
      "asset",
      "detail",
      "update",
      "publish",
      "schedule",
      "cancel",
      "remove",
      "upload"
    ] as const) {
      assert.equal(
        Reflect.getMetadata(PLATFORM_PERMISSIONS_KEY, controller.prototype[method]),
        undefined
      );
    }
  });
  it("requires tenant authentication, membership, and admin access for the reader", () => {
    const controller = NewslettersController;
    assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, controller), ["admin:access"]);
    const guards = Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[];
    for (const guard of [TenantAuthGuard, TenantGuard, PermissionsGuard])
      assert.ok(guards.includes(guard));
    for (const method of ["summary", "list", "asset", "detail", "read"] as const) {
      assert.equal(Reflect.getMetadata(PERMISSIONS_KEY, controller.prototype[method]), undefined);
    }
  });
  it("enforces the management permission before allowing a newsletter deletion", async () => {
    const prisma = {
      platformRoleAssignment: {
        findUnique: async () => ({ roleCode: "super_admin", status: "active" })
      },
      platformSession: {
        findUnique: async () => ({
          status: "active",
          securityMode: "disabled",
          userId: "user-1",
          deviceId: null,
          absoluteExpiresAt: new Date(Date.now() + 60_000),
          lastActivityAt: new Date()
        })
      }
    };
    const guard = new PlatformGuard(
      new Reflector(),
      prisma as never,
      { mode: "disabled", isDisabled: () => true } as never
    );
    const request = {
      user: {
        sessionKind: "platform",
        sid: "session-1",
        sub: "user-1",
        platformAccess: {
          role: "super_admin",
          securityMode: "disabled",
          permissions: ["platform:access"]
        }
      }
    };
    const context = {
      getClass: () => PlatformNewslettersController,
      getHandler: () => PlatformNewslettersController.prototype.remove,
      switchToHttp: () => ({ getRequest: () => request })
    } as never;
    assert.equal(await guard.canActivate(context), false);
    request.user.platformAccess.permissions.push("platform:announcements:manage");
    assert.equal(await guard.canActivate(context), true);
  });
});
