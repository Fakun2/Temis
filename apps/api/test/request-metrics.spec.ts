import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeRequestMetrics } from "../src/platform/request-metrics";

describe("request metrics", () => {
  it("calculates served rate, server error rate and p95 latency", () => {
    const summary = summarizeRequestMetrics([
      "200:20:one",
      "201:30:two",
      "404:40:three",
      "500:80:four",
      "503:100:five"
    ]);

    assert.equal(summary.total, 5);
    assert.equal(summary.servedRate, 60);
    assert.equal(summary.errorRate, 40);
    assert.equal(summary.clientErrorRate, 20);
    assert.equal(summary.averageLatencyMs, 54);
    assert.equal(summary.p95LatencyMs, 100);
  });

  it("reports no rates until a request has been observed", () => {
    const summary = summarizeRequestMetrics([]);
    assert.equal(summary.total, 0);
    assert.equal(summary.errorRate, null);
    assert.equal(summary.averageLatencyMs, null);
  });
});
