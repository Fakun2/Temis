import { applyDecorators, UseGuards } from "@nestjs/common";
import { TenantGuard } from "../tenancy/tenant.guard";
import { PermissionsGuard } from "./permissions.guard";
import { TenantAuthGuard } from "./tenant-auth.guard";

export const TenantAuthenticated = () => applyDecorators(UseGuards(TenantAuthGuard));

export const TenantEndpoint = () =>
  applyDecorators(UseGuards(TenantAuthGuard, TenantGuard, PermissionsGuard));
