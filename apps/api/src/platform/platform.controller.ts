import {
  Body,
  Controller,
  Delete,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { PlatformAuthenticatedRequest } from "../auth/auth.types";
import { PlatformAuthService } from "../auth/platform-auth.service";
import { PlatformPasswordStepUpDto, PlatformStepUpFinishDto } from "../auth/auth.schemas";
import {
  getPlatformRequestContext,
  getPlatformRequestMetadata
} from "../auth/platform-device-identity";
import { PlatformEndpoint, PlatformPermissions, PlatformStepUp } from "./platform.decorator";
import {
  PlatformAccountDto,
  PlatformDashboardSummaryDto,
  PlatformMeDto,
  PlatformObservabilityHistoryDto,
  PlatformObservabilitySummaryDto,
  PlatformUsersListDto,
  ListPlatformUsersQueryDto,
  UpdatePlatformAccountPasswordDto,
  UpdatePlatformAccountProfileDto
} from "./platform.schemas";
import { PlatformService } from "./platform.service";
import { PlatformObservabilityService } from "./platform-observability.service";

@ApiTags("platform")
@ApiBearerAuth()
@Controller("platform")
@PlatformEndpoint()
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly observabilityService: PlatformObservabilityService,
    private readonly platformAuth: PlatformAuthService
  ) {}

  @Get("me")
  @PlatformPermissions("platform:access")
  @ApiOkResponse({ type: PlatformMeDto })
  me(@Req() request: PlatformAuthenticatedRequest) {
    return request.user?.platformAccess;
  }

  @Get("account")
  @PlatformPermissions("platform:account:self_manage")
  @ApiOkResponse({ type: PlatformAccountDto })
  account(@Req() request: PlatformAuthenticatedRequest) {
    return this.platformService.getAccount(getAuthenticatedUserId(request));
  }

  @Patch("account/profile")
  @PlatformPermissions("platform:account:self_manage")
  @ApiOkResponse({ type: PlatformAccountDto })
  updateAccountProfile(
    @Req() request: PlatformAuthenticatedRequest,
    @Body() input: UpdatePlatformAccountProfileDto
  ) {
    return this.platformService.updateAccountProfile(getAuthenticatedUserId(request), input);
  }

  @Patch("account/password")
  @PlatformPermissions("platform:account:self_manage")
  @PlatformStepUp()
  updateAccountPassword(
    @Req() request: PlatformAuthenticatedRequest,
    @Body() input: UpdatePlatformAccountPasswordDto
  ) {
    return this.platformService.updateAccountPassword(getAuthenticatedUserId(request), input);
  }

  @Get("security")
  @PlatformPermissions("platform:account:self_manage")
  security(@Req() request: PlatformAuthenticatedRequest) {
    return this.platformService.getSecurity(getAuthenticatedUserId(request), request.user?.sid);
  }

  @Post("security/step-up/start")
  @PlatformPermissions("platform:account:self_manage")
  startStepUp(@Req() request: Request & PlatformAuthenticatedRequest) {
    return this.platformAuth.startStepUp(request.user!, getPlatformRequestMetadata(request));
  }

  @Post("security/step-up/finish")
  @PlatformPermissions("platform:account:self_manage")
  finishStepUp(
    @Req() request: Request & PlatformAuthenticatedRequest,
    @Body() input: PlatformStepUpFinishDto
  ) {
    return this.platformAuth.finishStepUp(
      request.user!,
      input,
      getPlatformRequestMetadata(request)
    );
  }

  @Post("security/step-up/password")
  @PlatformPermissions("platform:account:self_manage")
  passwordStepUp(
    @Req() request: Request & PlatformAuthenticatedRequest,
    @Body() input: PlatformPasswordStepUpDto
  ) {
    return this.platformAuth.passwordStepUp(
      request.user!,
      input,
      getPlatformRequestContext(request)
    );
  }

  @Delete("security/sessions/:id")
  @PlatformPermissions("platform:account:self_manage")
  @PlatformStepUp()
  revokeSession(
    @Req() request: PlatformAuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string
  ) {
    return this.platformService.revokeSession(getAuthenticatedUserId(request), id);
  }

  @Delete("security/authenticators/:id")
  @PlatformPermissions("platform:account:self_manage")
  @PlatformStepUp()
  revokeAuthenticator(
    @Req() request: PlatformAuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string
  ) {
    return this.platformService.revokeAuthenticator(getAuthenticatedUserId(request), id);
  }

  @Delete("security/devices/:id")
  @PlatformPermissions("platform:account:self_manage")
  @PlatformStepUp()
  revokeDevice(
    @Req() request: PlatformAuthenticatedRequest,
    @Param("id", new ParseUUIDPipe()) id: string
  ) {
    return this.platformService.revokeDevice(getAuthenticatedUserId(request), id);
  }

  @Get("observability/summary")
  @PlatformPermissions("platform:observability:read")
  @ApiOkResponse({ type: PlatformObservabilitySummaryDto })
  observability() {
    return this.observabilityService.getSummary();
  }

  @Get("observability/history")
  @PlatformPermissions("platform:observability:read")
  @ApiOkResponse({ type: PlatformObservabilityHistoryDto })
  observabilityHistory() {
    return this.observabilityService.getHistory();
  }

  @Get("dashboard/summary")
  @PlatformPermissions("platform:users:read")
  @ApiOkResponse({ type: PlatformDashboardSummaryDto })
  dashboardSummary() {
    return this.platformService.getDashboardSummary();
  }

  @Get("users")
  @PlatformPermissions("platform:users:read")
  @ApiOkResponse({ type: PlatformUsersListDto })
  users(@Query() query: ListPlatformUsersQueryDto) {
    return this.platformService.listUsers(query);
  }
}

function getAuthenticatedUserId(request: PlatformAuthenticatedRequest) {
  if (!request.user?.sub) {
    throw new Error("No se pudo identificar al usuario autenticado.");
  }

  return request.user.sub;
}
