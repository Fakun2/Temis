import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPlatformHost,
  toInvalidMutationOriginBody,
  validateMutationOrigin
} from "../lib/auth/platform-device-headers";

describe("platform device origin validation", () => {
  it("does not classify the tenant host as platform when no platform URL is configured", () => {
    const previousPlatformUrl = process.env.PLATFORM_PUBLIC_URL;
    delete process.env.PLATFORM_PUBLIC_URL;
    try {
      assert.equal(isPlatformHost(new Request("http://localhost:3000/api/auth/login")), false);
    } finally {
      restoreEnvironment("PLATFORM_PUBLIC_URL", previousPlatformUrl);
    }
  });

  it("accepts a same-origin LAN request even when Next uses an internal URL", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: {
        host: "192.168.100.9:3000",
        origin: "http://192.168.100.9:3000"
      }
    });

    const validation = validateMutationOrigin(request);

    assert.equal(validation.valid, true);
    assert.equal(validation.effectiveRequestOrigin, "http://192.168.100.9:3000");
  });

  it("uses proxy host and protocol for the platform origin", () => {
    const previousPlatformUrl = process.env.PLATFORM_PUBLIC_URL;
    process.env.PLATFORM_PUBLIC_URL = "https://platform.temis.ar";

    try {
      const request = new Request("http://web:3000/api/auth/platform/login/finish", {
        headers: {
          host: "web:3000",
          origin: "https://platform.temis.ar",
          "x-forwarded-host": "platform.temis.ar",
          "x-forwarded-proto": "https"
        }
      });

      assert.equal(isPlatformHost(request), true);
      assert.equal(validateMutationOrigin(request, "platform").valid, true);
    } finally {
      restoreEnvironment("PLATFORM_PUBLIC_URL", previousPlatformUrl);
    }
  });

  it("returns actionable details for a rejected origin", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: {
        host: "192.168.100.9:3000",
        origin: "http://localhost:3000"
      }
    });

    const validation = validateMutationOrigin(request);
    const body = toInvalidMutationOriginBody(validation);

    assert.equal(validation.valid, false);
    assert.equal(body.code, "invalid_request_origin");
    assert.equal(body.details.reason, "origin_mismatch");
    assert.equal(body.details.receivedOrigin, "http://localhost:3000");
    assert.ok(body.details.expectedOrigins.includes("http://192.168.100.9:3000"));
  });
});

function restoreEnvironment(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
