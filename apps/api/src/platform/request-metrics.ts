import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type Redis from "ioredis";

export const requestMetricsKey = "temis:platform:request-metrics";
export const requestMetricsWindowMinutes = 15;
const windowMs = requestMetricsWindowMinutes * 60_000;

export type RequestMetricsSummary = {
  averageLatencyMs: number | null;
  clientErrorRate: number | null;
  errorRate: number | null;
  p95LatencyMs: number | null;
  servedRate: number | null;
  total: number;
  windowMinutes: number;
};

export function createRequestMetricsMiddleware(redis: Redis) {
  return (request: Request, response: Response, next: NextFunction) => {
    const startedAt = performance.now();
    response.once("finish", () => {
      const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
      void recordRequestMetric(redis, response.statusCode, durationMs);
    });
    next();
  };
}

export async function getRequestMetrics(redis: Redis): Promise<RequestMetricsSummary> {
  const cutoff = Date.now() - windowMs;
  await redis.zremrangebyscore(requestMetricsKey, 0, cutoff);
  const values = await redis.zrangebyscore(requestMetricsKey, cutoff, "+inf");
  return summarizeRequestMetrics(values);
}

export function summarizeRequestMetrics(values: string[]): RequestMetricsSummary {
  const samples = values.flatMap(parseMetric);
  const total = samples.length;
  if (total === 0) {
    return {
      averageLatencyMs: null,
      clientErrorRate: null,
      errorRate: null,
      p95LatencyMs: null,
      servedRate: null,
      total,
      windowMinutes: requestMetricsWindowMinutes
    };
  }

  const durations = samples.map((sample) => sample.durationMs).sort((left, right) => left - right);
  const served = samples.filter((sample) => sample.statusCode < 500).length;
  const serverErrors = samples.filter((sample) => sample.statusCode >= 500).length;
  const clientErrors = samples.filter(
    (sample) => sample.statusCode >= 400 && sample.statusCode < 500
  ).length;
  const p95Index = Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1);

  return {
    averageLatencyMs: Math.round(durations.reduce((sum, value) => sum + value, 0) / total),
    clientErrorRate: toRate(clientErrors, total),
    errorRate: toRate(serverErrors, total),
    p95LatencyMs: durations[p95Index] ?? null,
    servedRate: toRate(served, total),
    total,
    windowMinutes: requestMetricsWindowMinutes
  };
}

async function recordRequestMetric(redis: Redis, statusCode: number, durationMs: number) {
  const now = Date.now();
  const member = `${statusCode}:${durationMs}:${randomUUID()}`;
  try {
    await redis
      .multi()
      .zadd(requestMetricsKey, now, member)
      .zremrangebyscore(requestMetricsKey, 0, now - windowMs)
      .expire(requestMetricsKey, Math.ceil(windowMs / 1000))
      .exec();
  } catch {
    // Las metricas nunca deben afectar el request principal.
  }
}

function parseMetric(value: string): Array<{ durationMs: number; statusCode: number }> {
  const [rawStatusCode, rawDurationMs] = value.split(":");
  const statusCode = Number(rawStatusCode);
  const durationMs = Number(rawDurationMs);
  return Number.isInteger(statusCode) && Number.isFinite(durationMs) && durationMs >= 0
    ? [{ durationMs, statusCode }]
    : [];
}

function toRate(part: number, total: number) {
  return Math.round((part / total) * 10_000) / 100;
}
