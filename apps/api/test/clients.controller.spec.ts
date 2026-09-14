import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";
import { PERMISSIONS_KEY } from "../src/auth/permissions.decorator";
import { PermissionsGuard } from "../src/auth/permissions.guard";
import { ClientsController } from "../src/clients/clients.controller";
import { TenantGuard } from "../src/tenancy/tenant.guard";

describe("ClientsController security metadata", () => {
  it("protects every endpoint with JWT, tenant and permission guards", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ClientsController) as unknown[];

    assert.deepEqual(guards, [JwtAuthGuard, TenantGuard, PermissionsGuard]);
  });

  for (const [method, permission] of [
    ["create", "clients:create"],
    ["list", "clients:read"],
    ["getDetail", "clients:read"],
    ["update", "clients:update"],
    ["archive", "clients:update"],
    ["delete", "clients:delete"]
  ] as const) {
    it(`requires ${permission} on ${method}`, () => {
      const handler = ClientsController.prototype[method];
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[];

      assert.deepEqual(permissions, [permission]);
    });
  }
});
