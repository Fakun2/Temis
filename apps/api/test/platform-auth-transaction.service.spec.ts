import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformAuthTransactionService } from "../src/auth/platform-auth-transaction.service";

describe("PlatformAuthTransactionService", () => {
  it("stores and consumes a transaction once", async () => {
    const values = new Map<string, string>();
    const service = new PlatformAuthTransactionService({
      del: async (key: string) => values.delete(key),
      get: async (key: string) => values.get(key) ?? null,
      set: async (key: string, value: string) => {
        values.set(key, value);
        return "OK";
      }
    } as never);

    await service.write("transaction-1", {
      challenge: "challenge",
      deviceId: "device-1",
      fingerprint: "fingerprint",
      kind: "login",
      userId: "user-1"
    });

    const transaction = await service.consume("transaction-1", "login");
    assert.equal(transaction.userId, "user-1");
    await assert.rejects(service.read("transaction-1", "login"), /expiro/i);
  });

  it("blocks a rate-limit bucket after five attempts", async () => {
    const counters = new Map<string, number>();
    const service = new PlatformAuthTransactionService({
      expire: async () => 1,
      incr: async (key: string) => {
        const count = (counters.get(key) ?? 0) + 1;
        counters.set(key, count);
        return count;
      }
    } as never);
    const metadata = { ipAddress: "127.0.0.1", userAgent: "test" };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await service.assertRateLimit("admin@temis.ar", metadata);
    }

    await assert.rejects(
      service.assertRateLimit("admin@temis.ar", metadata),
      /temporalmente bloqueado/i
    );
  });
});
