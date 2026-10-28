import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { PlatformRequestContext } from "./platform-device-identity";
import { digestPlatformValue } from "./platform-auth.crypto";

type SecurityEventContext = {
  deviceId?: string | null;
  reason?: string;
  sessionId?: string;
  userId?: string;
};

@Injectable()
export class PlatformSecurityAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    eventType: string,
    outcome: "denied" | "error" | "success",
    metadata: PlatformRequestContext,
    context: SecurityEventContext = {}
  ) {
    await this.prisma.$transaction(async (tx) => {
      const event = await tx.platformSecurityEvent.create({
        data: {
          ...context,
          eventType,
          ipAddress: metadata.ipAddress,
          outcome,
          userAgentHash: digestPlatformValue(metadata.userAgent)
        }
      });

      if (outcome !== "success") {
        await tx.asyncOutboxEvent.create({
          data: {
            payload: {
              eventId: event.id,
              eventType,
              occurredAt: event.createdAt.toISOString(),
              outcome,
              reason: context.reason ?? null
            },
            routingKey: "platform.security.alert",
            topic: "platform.security.alert.requested"
          }
        });
      }
    });
  }

  async revokeSessionFamily(familyId: string, reason: string) {
    await this.prisma.platformSession.updateMany({
      where: { refreshFamilyId: familyId },
      data: { revokedAt: new Date(), status: "revoked" }
    });
    await this.prisma.platformSecurityEvent.create({
      data: { eventType: "session_revoked", outcome: "denied", reason }
    });
  }
}
