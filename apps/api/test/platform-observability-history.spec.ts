import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPlatformObservabilityHistory,
  createPlatformObservabilityHistoryRange,
  toPlatformObservabilitySampleBucket
} from "../src/platform/platform-observability-history";

describe("platform observability history", () => {
  const now = new Date("2026-10-22T15:42:00.000Z");

  it("builds a fixed 30-day range in Buenos Aires", () => {
    const range = createPlatformObservabilityHistoryRange(now);

    assert.equal(range.days.length, 30);
    assert.equal(range.from, "2026-09-23");
    assert.equal(range.to, "2026-10-22");
    assert.equal(range.fromInstant.toISOString(), "2026-09-23T03:00:00.000Z");
    assert.equal(range.untilInstant.toISOString(), "2026-10-23T03:00:00.000Z");
  });

  it("uses the worst daily state and excludes missing intervals from uptime", () => {
    const history = buildPlatformObservabilityHistory(
      [
        { component: "api", day: "2026-10-20", samples: 2, status: "healthy" },
        { component: "api", day: "2026-10-20", samples: 1, status: "degraded" },
        { component: "api", day: "2026-10-22", samples: 1, status: "unavailable" }
      ],
      [{ latencyMs: 4, name: "API", status: "healthy" }],
      now
    );
    const api = history.components.find((component) => component.key === "api")!;

    assert.equal(api.days.length, 30);
    assert.deepEqual(
      api.days.find((day) => day.date === "2026-10-20"),
      {
        date: "2026-10-20",
        samples: 3,
        status: "degraded",
        uptimePercent: 100
      }
    );
    assert.deepEqual(
      api.days.find((day) => day.date === "2026-10-21"),
      {
        date: "2026-10-21",
        samples: 0,
        status: "no_data",
        uptimePercent: null
      }
    );
    assert.equal(api.days.find((day) => day.date === "2026-10-22")?.status, "unavailable");
    assert.equal(api.uptimePercent, 75);
    assert.equal(api.currentStatus, "healthy");
    assert.equal(api.currentLatencyMs, 4);
  });

  it("floors samples to a shared five-minute interval", () => {
    assert.equal(
      toPlatformObservabilitySampleBucket(now).toISOString(),
      "2026-10-22T15:40:00.000Z"
    );
  });
});
