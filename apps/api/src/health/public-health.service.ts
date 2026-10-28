import { Inject, Injectable, Logger } from "@nestjs/common";
import type Redis from "ioredis";
import { PrismaService } from "../database/prisma.service";
import {
  platformWorkerHeartbeatKey,
  platformWorkerHeartbeatTtlSeconds
} from "../platform/platform.constants";
import { RabbitMqService } from "../queue/rabbitmq.service";
import { REDIS_CLIENT } from "../redis/redis.constants";
import { ObjectStorageService } from "../storage/object-storage.service";
import type { PublicHealthComponent, PublicHealthResponseDto } from "./health.schemas";

const healthCheckTimeoutMs = 4_000;

@Injectable()
export class PublicHealthService {
  private readonly logger = new Logger(PublicHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly rabbitMq: RabbitMqService,
    private readonly storage: ObjectStorageService
  ) {}

  authentication() {
    return this.check("authentication", async () => {
      await Promise.all([this.prisma.$queryRaw`SELECT 1`, this.redis.ping()]);
    });
  }

  documents() {
    return this.check("documents", () => this.storage.checkHealth());
  }

  asyncProcessing() {
    return this.check("async-processing", async () => {
      await Promise.all([this.rabbitMq.checkHealth(), this.assertFreshWorkerHeartbeat()]);
    });
  }

  private async check(
    component: PublicHealthComponent,
    action: () => Promise<unknown>
  ): Promise<PublicHealthResponseDto> {
    try {
      await withTimeout(action(), healthCheckTimeoutMs);
      return { checkedAt: new Date().toISOString(), component, status: "operational" };
    } catch {
      this.logger.warn(`Public health check unavailable: ${component}.`);
      return { checkedAt: new Date().toISOString(), component, status: "unavailable" };
    }
  }

  private async assertFreshWorkerHeartbeat() {
    const heartbeat = await this.redis.get(platformWorkerHeartbeatKey);
    const heartbeatAt = heartbeat ? Date.parse(heartbeat) : Number.NaN;
    if (!Number.isFinite(heartbeatAt)) throw new Error("Worker heartbeat unavailable.");
    if (Date.now() - heartbeatAt > platformWorkerHeartbeatTtlSeconds * 1_000) {
      throw new Error("Worker heartbeat expired.");
    }
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Health check timed out.")), timeoutMs);
        timer.unref?.();
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
