import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Sse,
  UseGuards,
  type MessageEvent
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { Observable } from "rxjs";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import {
  ListNotificationsQueryDto,
  NotificationReadResponseDto,
  NotificationsListResponseDto
} from "./notifications.schemas";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("notifications")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOkResponse({ type: NotificationsListResponseDto })
  list(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: ListNotificationsQueryDto
  ) {
    return this.notificationsService.listForUser(tenantId, getAuthenticatedUserId(request), query);
  }

  @Sse("stream")
  stream(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest
  ): Observable<MessageEvent> {
    return this.notificationsService.streamForUser(tenantId, getAuthenticatedUserId(request));
  }

  @Patch(":id/read")
  @ApiOkResponse({ type: NotificationReadResponseDto })
  markRead(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Param("id") notificationId: string
  ) {
    return this.notificationsService.markRead(
      tenantId,
      getAuthenticatedUserId(request),
      notificationId
    );
  }
}

function getAuthenticatedUserId(request: AuthenticatedRequest) {
  if (!request.user?.sub) {
    throw new Error("No se pudo identificar al usuario autenticado.");
  }

  return request.user.sub;
}
