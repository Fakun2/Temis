import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";

export type PlatformSecurityMode = "disabled" | "required";

@Injectable()
export class PlatformSecurityModeService implements OnModuleInit {
  private readonly logger = new Logger(PlatformSecurityModeService.name);
  private readonly currentMode: PlatformSecurityMode;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const configured = this.config.get<string>("PLATFORM_SECURITY_MODE")?.trim().toLowerCase();
    if (!configured && this.config.get<string>("NODE_ENV") !== "production") {
      this.currentMode = "disabled";
      return;
    }
    if (configured !== "disabled" && configured !== "required") {
      throw new Error("PLATFORM_SECURITY_MODE must be configured as disabled or required.");
    }
    this.currentMode = configured;
  }

  get mode() {
    return this.currentMode;
  }

  isDisabled() {
    return this.currentMode === "disabled";
  }

  isRequired() {
    return this.currentMode === "required";
  }

  async onModuleInit() {
    if (this.isDisabled()) {
      this.logger.warn("Platform security is DISABLED: Super Admin access requires password only.");
    }

    const platformSession = (
      this.prisma as unknown as {
        platformSession?: PrismaService["platformSession"];
      }
    ).platformSession;
    if (!platformSession) {
      if (this.config.get<string>("NODE_ENV") === "production") {
        throw new Error("Platform session persistence is unavailable.");
      }
      this.logger.debug("Skipping platform session mode reconciliation for a partial test double.");
      return;
    }

    let result: { count: number };
    try {
      result = await platformSession.updateMany({
        where: { securityMode: { not: this.currentMode }, status: "active" },
        data: { revokedAt: new Date(), status: "revoked" }
      });
    } catch (error) {
      if (this.isMissingTableError(error)) {
        const message =
          "Platform security database tables are missing. Run `npm run db:deploy` before starting the API.";
        this.logger.error(message);
        throw new Error(message, { cause: error });
      }
      throw error;
    }
    if (result.count === 0) return;

    await this.prisma.platformSecurityEvent.create({
      data: {
        eventType: "security_mode_changed",
        outcome: "success",
        reason: `${this.currentMode}:${result.count}`
      }
    });
    this.logger.warn(`Revoked ${result.count} platform sessions created under another mode.`);
  }

  private isMissingTableError(error: unknown): error is { code: "P2021" } {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2021";
  }
}
