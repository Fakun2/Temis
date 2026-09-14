import {
  Controller,
  Body,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
  Patch
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import { GoogleCalendarService } from "./google-calendar.service";
import {
  GoogleCalendarOAuthStartDto,
  GoogleCalendarStatusDto,
  GoogleCalendarSyncPreferencesDto
} from "./google-calendar.schemas";

@ApiTags("integrations")
@Controller("integrations/google-calendar")
export class GoogleCalendarController {
  constructor(private readonly calendar: GoogleCalendarService) {}

  @Get("callback")
  @Redirect()
  async callback(
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("error") error?: string
  ) {
    const frontend =
      process.env.GOOGLE_CALENDAR_FRONTEND_CALLBACK_URL?.trim() ||
      "/admin/account?view=google-calendar";
    const suffix = `${frontend.includes("?") ? "&" : "?"}googleCalendar=`;
    if (error || !code || !state) return { url: `${frontend}${suffix}error` };
    try {
      await this.calendar.completeOAuth({ code, state });
      return { url: `${frontend}${suffix}connected` };
    } catch {
      return { url: `${frontend}${suffix}error` };
    }
  }

  @Get("status")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("integrations:google_calendar_read")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @ApiOkResponse({ type: GoogleCalendarStatusDto })
  status(@ActiveTenant() tenantId: string, @Req() request: AuthenticatedRequest) {
    return this.calendar.getStatus(tenantId, getUserId(request));
  }

  @Post("connect")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("integrations:google_calendar_manage")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @ApiOkResponse({ type: GoogleCalendarOAuthStartDto })
  connect(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: GoogleCalendarSyncPreferencesDto
  ) {
    return this.calendar.getAuthorizationUrl(tenantId, getUserId(request), input);
  }

  @Patch("preferences")
  @HttpCode(202)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("integrations:google_calendar_manage")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @ApiAcceptedResponse({ type: Object })
  updatePreferences(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: GoogleCalendarSyncPreferencesDto
  ) {
    return this.calendar.updatePreferences(tenantId, getUserId(request), input);
  }

  @Post("sync")
  @HttpCode(202)
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("integrations:google_calendar_manage")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @ApiAcceptedResponse({ type: Object })
  sync(@ActiveTenant() tenantId: string, @Req() request: AuthenticatedRequest) {
    return this.calendar.requestSync(tenantId, getUserId(request));
  }

  @Delete("disconnect")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("integrations:google_calendar_manage")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @ApiOkResponse({ type: Object })
  disconnect(@ActiveTenant() tenantId: string, @Req() request: AuthenticatedRequest) {
    return this.calendar.disconnect(tenantId, getUserId(request));
  }
}

function getUserId(request: AuthenticatedRequest) {
  if (!request.user?.sub) throw new Error("No se pudo identificar al usuario autenticado.");
  return request.user.sub;
}
