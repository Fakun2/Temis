import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.activeTenantId;

    if (!request.user || request.user.sessionKind !== "tenant" || !tenantId) {
      return false;
    }

    return request.user.tenantAccess.some(
      (membership) =>
        membership.tenantId === tenantId &&
        membership.role !== null &&
        requiredRoles.includes(membership.role)
    );
  }
}
