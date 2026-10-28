import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { TenantAuthenticatedRequest } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";

type RequestWithHeaders = TenantAuthenticatedRequest & {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const rawTenantId = request.headers["x-tenant-id"];
    const tenantId = (Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId)?.trim();
    const userId = request.user?.sub;

    if (!tenantId || !userId || request.user?.sessionKind !== "tenant") {
      return false;
    }

    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        status: "active",
        tenant: { status: "active" },
        tenantId,
        userId
      },
      select: { id: true }
    });

    if (!membership) {
      return false;
    }

    request.activeTenantId = tenantId;
    return true;
  }
}
