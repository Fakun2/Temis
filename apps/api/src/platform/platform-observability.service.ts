import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { PrismaService } from "../database/prisma.service";
import { RabbitMqService } from "../queue/rabbitmq.service";
import { REDIS_CLIENT } from "../redis/redis.constants";
import {
  platformWorkerHeartbeatKey,
  platformWorkerHeartbeatTtlSeconds
} from "./platform.constants";
import {
  buildPlatformObservabilityHistory,
  createPlatformObservabilityHistoryRange,
  platformObservabilityTimeZone,
  type AggregatedPlatformHealthSample
} from "./platform-observability-history";
import { getRequestMetrics } from "./request-metrics";

export type CheckStatus = "healthy" | "degraded" | "unavailable";
export type ServiceCheck = { latencyMs: number | null; name: string; status: CheckStatus };

@Injectable()
export class PlatformObservabilityService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly rabbitMq: RabbitMqService
  ) {}

  async getSummary() {
    const [checks, outbox, requests] = await Promise.all([
      this.getServiceChecks(),
      this.getOutboxSummary(),
      this.getRequestSummary()
    ]);
    const status = checks.some((check) => check.status === "unavailable")
      ? "unavailable"
      : checks.some((check) => check.status === "degraded")
        ? "degraded"
        : "healthy";

    return { checks, generatedAt: new Date().toISOString(), outbox, requests, status };
  }

  async getServiceChecks(): Promise<ServiceCheck[]> {
    const [database, redis, rabbitmq, worker] = await Promise.all([
      this.check("PostgreSQL", () => this.prisma.$queryRaw`SELECT 1`),
      this.check("Redis", () => this.redis.ping()),
      this.check("RabbitMQ", () => this.rabbitMq.checkHealth()),
      this.getWorkerCheck()
    ]);

    return [{ latencyMs: 0, name: "API", status: "healthy" }, database, redis, rabbitmq, worker];
  }

  async getHistory(now = new Date()) {
    const range = createPlatformObservabilityHistoryRange(now);
    const [checks, rows] = await Promise.all([
      this.getServiceChecks(),
      this.prisma.$queryRaw<AggregatedPlatformHealthSample[]>`
        SELECT
          "component"::text AS "component",
          to_char(
            "sampled_at" AT TIME ZONE ${platformObservabilityTimeZone},
            'YYYY-MM-DD'
          ) AS "day",
          "status"::text AS "status",
          COUNT(*)::integer AS "samples"
        FROM "platform_health_samples"
        WHERE "sampled_at" >= ${range.fromInstant}
          AND "sampled_at" < ${range.untilInstant}
        GROUP BY 1, 2, 3
        ORDER BY 1, 2, 3
      `
    ]);

    return buildPlatformObservabilityHistory(rows, checks, now);
  }

  private async check(name: string, action: () => Promise<unknown>): Promise<ServiceCheck> {
    const startedAt = performance.now();
    try {
      await action();
      return { latencyMs: Math.round(performance.now() - startedAt), name, status: "healthy" };
    } catch {
      return { latencyMs: null, name, status: "unavailable" };
    }
  }

  private async getWorkerCheck(): Promise<ServiceCheck> {
    const startedAt = performance.now();
    try {
      const value = await this.redis.get(platformWorkerHeartbeatKey);
      if (!value) return { latencyMs: null, name: "Worker", status: "degraded" };
      const ageMs = Date.now() - new Date(value).getTime();
      return {
        latencyMs: Math.round(performance.now() - startedAt),
        name: "Worker",
        status: ageMs > platformWorkerHeartbeatTtlSeconds * 1000 ? "degraded" : "healthy"
      };
    } catch {
      return { latencyMs: null, name: "Worker", status: "unavailable" };
    }
  }

  private async getOutboxSummary() {
    try {
      const [pending, failed, oldest] = await this.prisma.$transaction([
        this.prisma.asyncOutboxEvent.count({ where: { status: "pending" } }),
        this.prisma.asyncOutboxEvent.count({ where: { status: "failed" } }),
        this.prisma.asyncOutboxEvent.findFirst({
          where: { status: "pending" },
          orderBy: { availableAt: "asc" },
          select: { availableAt: true }
        })
      ]);
      return { failed, oldestPendingAt: oldest?.availableAt.toISOString() ?? null, pending };
    } catch {
      return { failed: null, oldestPendingAt: null, pending: null };
    }
  }

  private async getRequestSummary() {
    try {
      return await getRequestMetrics(this.redis);
    } catch {
      return null;
    }
  }
}
