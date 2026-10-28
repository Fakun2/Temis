import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.activeTenantId;

    if (!request.user || request.user.sessionKind !== "tenant" || !tenantId) {
      return false;
    }

    const membership = request.user.tenantAccess.find((access) => access.tenantId === tenantId);
    return requiredPermissions.every((permission) => membership?.permissions.includes(permission));
  }
}
