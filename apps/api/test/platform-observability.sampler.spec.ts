import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformObservabilitySampler } from "../src/platform/platform-observability.sampler";

describe("PlatformObservabilitySampler", () => {
  it("persists the five probes idempotently and cleans retention once per day", async () => {
    const createCalls: Array<Record<string, unknown>> = [];
    const deleteCalls: Array<Record<string, unknown>> = [];
    const transaction = {
      platformHealthSample: {
        createMany: async (input: Record<string, unknown>) => createCalls.push(input),
        deleteMany: async (input: Record<string, unknown>) => deleteCalls.push(input)
      }
    };
    const prisma = {
      $transaction: async (callback: (value: typeof transaction) => Promise<void>) =>
        callback(transaction)
    };
    const platformService = {
      getServiceChecks: async () => [
        { latencyMs: 0, name: "API", status: "healthy" },
        { latencyMs: 5, name: "PostgreSQL", status: "healthy" },
        { latencyMs: 2, name: "Redis", status: "healthy" },
        { latencyMs: null, name: "RabbitMQ", status: "unavailable" },
        { latencyMs: 1, name: "Worker", status: "degraded" }
      ]
    };
    const sampler = new PlatformObservabilitySampler(prisma as never, platformService as never);
    const first = new Date("2026-10-22T15:42:10.000Z");
    const second = new Date("2026-10-22T15:44:59.000Z");

    await sampler.capture(first);
    await sampler.capture(second);

    assert.equal(createCalls.length, 2);
    assert.equal(deleteCalls.length, 1);
    for (const call of createCalls) {
      assert.equal(call.skipDuplicates, true);
      assert.equal((call.data as unknown[]).length, 5);
      assert.ok(
        (call.data as Array<{ sampledAt: Date }>).every(
          (sample) => sample.sampledAt.toISOString() === "2026-10-22T15:40:00.000Z"
        )
      );
    }
    assert.deepEqual(
      (createCalls[0]!.data as Array<{ component: string }>).map((sample) => sample.component),
      ["api", "postgresql", "redis", "rabbitmq", "worker"]
    );
    assert.equal(
      (deleteCalls[0]!.where as { sampledAt: { lt: Date } }).sampledAt.lt.toISOString(),
      "2026-07-24T15:42:10.000Z"
    );
  });
});
