import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PrismaService } from "../database/prisma.service";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { getPlatformRequestMetadata } from "../auth/platform-device-identity";
import { PLATFORM_PERMISSIONS_KEY, PLATFORM_STEP_UP_KEY } from "./platform.decorator";
import type { PlatformPermission } from "./platform.constants";
import { PlatformSecurityModeService } from "../auth/platform-security-mode.service";

@Injectable()
export class PlatformGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly securityMode: PlatformSecurityModeService
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PlatformPermission[]>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );
    const stepUpRequired = this.reflector.getAllAndOverride<boolean>(PLATFORM_STEP_UP_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const request = context.switchToHttp().getRequest<Request & AuthenticatedRequest>();
    const access = request.user?.sessionKind === "platform" ? request.user.platformAccess : null;

    if (
      !request.user ||
      request.user.sessionKind !== "platform" ||
      !request.user.sid ||
      !access ||
      access.role !== "super_admin" ||
      access.securityMode !== this.securityMode.mode
    )
      return false;
    if (required?.some((permission) => !access.permissions.includes(permission))) return false;

    const [assignment, session] = await Promise.all([
      this.prisma.platformRoleAssignment.findUnique({
        where: { userId: request.user.sub },
        select: { roleCode: true, status: true }
      }),
      this.prisma.platformSession.findUnique({
        where: { id: request.user.sid },
        include: { device: true }
      })
    ]);

    const now = Date.now();
    const commonChecks = Boolean(
      assignment?.status === "active" &&
      assignment.roleCode === "super_admin" &&
      session?.status === "active" &&
      session.securityMode === this.securityMode.mode &&
      session.userId === request.user.sub &&
      session.absoluteExpiresAt.getTime() > now &&
      now - session.lastActivityAt.getTime() <= 15 * 60_000 &&
      (stepUpRequired !== true ||
        Boolean(session.stepUpAt && now - session.stepUpAt.getTime() <= 5 * 60_000))
    );
    if (!commonChecks) return false;
    if (this.securityMode.isDisabled()) return session?.deviceId === null;

    if (!request.user.platformDeviceId || !session?.device) return false;
    try {
      const metadata = getPlatformRequestMetadata(request);
      return Boolean(
        session.deviceId === request.user.platformDeviceId &&
        session.device.status === "active" &&
        session.device.certificateFingerprint === metadata.device.certificateFingerprint
      );
    } catch {
      return false;
    }
  }
}
