import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { platformSessionCookieName, sessionCookieName } from "../lib/auth/cookies";

const tenantSession = "10000000-0000-4000-8000-000000000001";
const platformSession = "20000000-0000-4000-8000-000000000002";

describe("proxy admin/superadmin URL isolation", () => {
  it("serves the landing page without a session", () => {
    const response = proxy(new NextRequest("http://localhost:3000/"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  });

  it("uses only the tenant cookie for /admin even when both cookies exist", () => {
    assert.equal(proxy(request("http://localhost:3000/admin", "both")).status, 200);
    assert.equal(
      proxy(request("http://localhost:3000/admin", "platform")).headers.get("location"),
      "http://localhost:3000/login?next=%2Fadmin"
    );
  });

  it("uses only the platform cookie for /superadmin on the same host", () => {
    assert.equal(proxy(request("http://localhost:3000/superadmin", "both")).status, 200);
    assert.equal(
      proxy(request("http://localhost:3000/superadmin", "tenant")).headers.get("location"),
      "http://localhost:3000/superadmin/login?next=%2Fsuperadmin"
    );
  });

  it("serves the public superadmin login without a subdomain", () => {
    assert.equal(proxy(request("http://localhost:3000/superadmin/login", "tenant")).status, 200);
  });

  it("redirects legacy platform routes on the same host", () => {
    const response = proxy(request("http://localhost:3000/admin/platform/observability", "tenant"));
    assert.equal(response.status, 308);
    assert.equal(
      response.headers.get("location"),
      "http://localhost:3000/superadmin/observability"
    );
  });
});

function request(url: string, cookies: "both" | "platform" | "tenant") {
  const values: string[] = [];
  if (cookies !== "platform") values.push(`${sessionCookieName}=${tenantSession}`);
  if (cookies !== "tenant") values.push(`${platformSessionCookieName}=${platformSession}`);
  return new NextRequest(url, { headers: { cookie: values.join("; ") } });
}
