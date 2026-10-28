import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  platformHealthComponents,
  platformObservabilityRetentionDays,
  platformObservabilitySampleIntervalMs,
  toPlatformObservabilitySampleBucket,
  type PlatformHealthComponentKey
} from "./platform-observability-history";
import { PlatformObservabilityService } from "./platform-observability.service";

const componentByServiceName = new Map<string, PlatformHealthComponentKey>(
  platformHealthComponents.map((component) => [component.name, component.key])
);
const cleanupIntervalMs = 24 * 60 * 60_000;

@Injectable()
export class PlatformObservabilitySampler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlatformObservabilitySampler.name);
  private timer?: NodeJS.Timeout;
  private nextCleanupAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly observabilityService: PlatformObservabilityService
  ) {}

  onModuleInit() {
    if (!isSamplerEnabled()) return;
    void this.captureSafely();
    this.timer = setInterval(
      () => void this.captureSafely(),
      platformObservabilitySampleIntervalMs
    );
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async capture(now = new Date()) {
    const checks = await this.observabilityService.getServiceChecks();
    const sampledAt = toPlatformObservabilitySampleBucket(now);
    const samples = checks.flatMap((check) => {
      const component = componentByServiceName.get(check.name);
      return component
        ? [
            {
              component,
              latencyMs: check.latencyMs,
              sampledAt,
              status: check.status
            }
          ]
        : [];
    });
    const cleanupDue = now.getTime() >= this.nextCleanupAt;
    const retentionCutoff = new Date(
      now.getTime() - platformObservabilityRetentionDays * 24 * 60 * 60_000
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.platformHealthSample.createMany({ data: samples, skipDuplicates: true });
      if (cleanupDue) {
        await transaction.platformHealthSample.deleteMany({
          where: { sampledAt: { lt: retentionCutoff } }
        });
      }
    });

    if (cleanupDue) this.nextCleanupAt = now.getTime() + cleanupIntervalMs;
  }

  private async captureSafely() {
    try {
      await this.capture();
    } catch {
      this.logger.warn("No se pudo persistir la muestra de observabilidad de plataforma.");
    }
  }
}

function isSamplerEnabled() {
  const configured = process.env.PLATFORM_OBSERVABILITY_SAMPLER_ENABLED;
  if (configured !== undefined) return configured.trim().toLowerCase() === "true";
  return process.env.NODE_ENV !== "test";
}
