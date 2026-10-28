import assert from "node:assert/strict";
import test from "node:test";
import { PublicHealthService, withTimeout } from "../src/health/public-health.service";

function createService(
  overrides: {
    database?: () => Promise<unknown>;
    heartbeat?: string | null;
    queue?: () => Promise<unknown>;
    storage?: () => Promise<unknown>;
  } = {}
) {
  const prisma = { $queryRaw: overrides.database ?? (async () => [{ value: 1 }]) };
  const redis = {
    get: async () =>
      overrides.heartbeat === undefined ? new Date().toISOString() : overrides.heartbeat,
    ping: async () => "PONG"
  };
  const queue = { checkHealth: overrides.queue ?? (async () => undefined) };
  const storage = { checkHealth: overrides.storage ?? (async () => undefined) };
  return new PublicHealthService(prisma as never, redis as never, queue as never, storage as never);
}

test("returns operational for healthy public components", async () => {
  const service = createService();
  assert.equal((await service.authentication()).status, "operational");
  assert.equal((await service.documents()).status, "operational");
  assert.equal((await service.asyncProcessing()).status, "operational");
});

test("returns a generic unavailable contract without leaking dependency errors", async () => {
  const service = createService({
    storage: async () => {
      throw new Error("bucket-secret-name credentials rejected");
    }
  });
  const result = await service.documents();
  assert.deepEqual(Object.keys(result).sort(), ["checkedAt", "component", "status"]);
  assert.equal(result.component, "documents");
  assert.equal(result.status, "unavailable");
  assert.doesNotMatch(JSON.stringify(result), /bucket-secret-name|credentials/i);
});

test("marks async processing unavailable when its heartbeat is missing or expired", async () => {
  assert.equal((await createService({ heartbeat: null }).asyncProcessing()).status, "unavailable");
  assert.equal(
    (await createService({ heartbeat: "2026-01-01T00:00:00Z" }).asyncProcessing()).status,
    "unavailable"
  );
});

test("bounded checks reject after their timeout", async () => {
  await assert.rejects(withTimeout(new Promise(() => undefined), 5), /timed out/);
});
