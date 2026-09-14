import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TenantGuard } from "../src/tenancy/tenant.guard";

function createContext(request: { headers: Record<string, string | string[]>; user?: { sub: string } }) {
  return {
    switchToHttp: () => ({ getRequest: () => request })
  } as never;
}

describe("TenantGuard", () => {
  it("rejects a tenant when the authenticated user has no active membership", async () => {
    const findFirst = async () => null;
    const guard = new TenantGuard({ tenantMembership: { findFirst } } as never);
    const request = { headers: { "x-tenant-id": "tenant-a" }, user: { sub: "user-a" } };

    assert.equal(await guard.canActivate(createContext(request)), false);
    assert.equal((request as { activeTenantId?: string }).activeTenantId, undefined);
  });

  it("accepts only an active membership in an active tenant", async () => {
    let receivedWhere: unknown;
    const findFirst = async ({ where }: { where: unknown }) => {
      receivedWhere = where;
      return { id: "membership-a" };
    };
    const guard = new TenantGuard({ tenantMembership: { findFirst } } as never);
    const request = { headers: { "x-tenant-id": " tenant-a " }, user: { sub: "user-a" } };

    assert.equal(await guard.canActivate(createContext(request)), true);
    assert.equal((request as { activeTenantId?: string }).activeTenantId, "tenant-a");
    assert.deepEqual(receivedWhere, {
      status: "active",
      tenant: { status: "active" },
      tenantId: "tenant-a",
      userId: "user-a"
    });
  });
});
