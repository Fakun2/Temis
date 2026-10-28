import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformSecurityModeService } from "../src/auth/platform-security-mode.service";

function config(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as never;
}

describe("PlatformSecurityModeService", () => {
  it("defaults to disabled outside production", () => {
    const service = new PlatformSecurityModeService(config({ NODE_ENV: "test" }), {} as never);
    assert.equal(service.mode, "disabled");
  });

  it("rejects a missing or obsolete mode in production", () => {
    assert.throws(
      () => new PlatformSecurityModeService(config({ NODE_ENV: "production" }), {} as never),
      /disabled or required/
    );
    assert.throws(
      () =>
        new PlatformSecurityModeService(
          config({ NODE_ENV: "production", PLATFORM_SECURITY_MODE: "observe" }),
          {} as never
        ),
      /disabled or required/
    );
  });

  it("revokes sessions from the previous mode idempotently", async () => {
    let eventCount = 0;
    const service = new PlatformSecurityModeService(
      config({ NODE_ENV: "production", PLATFORM_SECURITY_MODE: "required" }),
      {
        platformSecurityEvent: { create: async () => void eventCount++ },
        platformSession: {
          updateMany: async ({ where }: { where: { securityMode: { not: string } } }) => {
            assert.equal(where.securityMode.not, "required");
            return { count: 2 };
          }
        }
      } as never
    );

    await service.onModuleInit();
    assert.equal(eventCount, 1);
  });

  it("explains how to recover when the platform security tables are missing", async () => {
    const service = new PlatformSecurityModeService(
      config({ NODE_ENV: "development", PLATFORM_SECURITY_MODE: "disabled" }),
      {
        platformSession: {
          updateMany: async () => {
            throw Object.assign(new Error("relation does not exist"), { code: "P2021" });
          }
        }
      } as never
    );

    await assert.rejects(() => service.onModuleInit(), /npm run db:deploy/);
  });
});
