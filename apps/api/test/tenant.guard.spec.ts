import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TenantGuard } from "../src/tenancy/tenant.guard";

describe("TenantGuard session isolation", () => {
  it("rejects a platform token presented to a tenant route before querying membership", async () => {
    let queried = false;
    const guard = new TenantGuard({
      tenantMembership: { findFirst: async () => { queried = true; return { id: "membership-1" }; } }
    } as never);
    const request = {
      headers: { "x-tenant-id": "tenant-1" },
      user: {
        amr: ["pwd"],
        email: "admin@temis.ar",
        platformAccess: { permissions: ["platform:access"], role: "super_admin", securityMode: "disabled" },
        sessionKind: "platform",
        sessionVersion: 1,
        sid: "platform-session-1",
        sub: "user-1"
      }
    };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;
    assert.equal(await guard.canActivate(context), false);
    assert.equal(queried, false);
  });
});
