import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { AnnouncementsService } from "./announcements.service";
@Controller("announcements")
@TenantEndpoint()
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}
  @Get("active") @Permissions("admin:access") active(
    @ActiveTenant() tenantId: string,
    @Req() r: AuthenticatedRequest
  ) {
    return this.service.active(tenantId, r.user!.sub);
  }
  @Post(":id/dismiss") @Permissions("admin:access") dismiss(
    @ActiveTenant() tenantId: string,
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string
  ) {
    return this.service.dismiss(tenantId, r.user!.sub, id);
  }
}
