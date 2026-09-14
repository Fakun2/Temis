import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";
import { PERMISSIONS_KEY } from "../src/auth/permissions.decorator";
import { PermissionsGuard } from "../src/auth/permissions.guard";
import { GoogleCalendarController } from "../src/integrations/google-calendar.controller";
import { TenantGuard } from "../src/tenancy/tenant.guard";

describe("GoogleCalendarController security metadata", () => {
  it("protects preference updates with JWT, active tenant and RBAC guards", () => {
    const handler = GoogleCalendarController.prototype.updatePreferences;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[];

    assert.deepEqual(guards, [JwtAuthGuard, TenantGuard, PermissionsGuard]);
    assert.deepEqual(permissions, ["integrations:google_calendar_manage"]);
  });
});
