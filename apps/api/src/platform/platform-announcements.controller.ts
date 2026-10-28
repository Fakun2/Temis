import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { PlatformAuthenticatedRequest } from "../auth/auth.types";
import { PlatformEndpoint, PlatformPermissions } from "./platform.decorator";
import { PlatformAnnouncementsService } from "./platform-announcements.service";
import {
  CreatePlatformAnnouncementDto,
  ListPlatformAnnouncementsQueryDto,
  ListPlatformAnnouncementTenantOptionsQueryDto,
  PlatformAnnouncementsListDto,
  PlatformAnnouncementsSummaryDto,
  PlatformAnnouncementDetailDto,
  PlatformAnnouncementListItemDto,
  PlatformAnnouncementTenantOptionsListDto,
  UpdatePlatformAnnouncementDto
} from "./platform-announcements.schemas";

@ApiTags("platform-announcements")
@ApiBearerAuth()
@Controller("platform/announcements")
@PlatformEndpoint()
@PlatformPermissions("platform:announcements:manage")
export class PlatformAnnouncementsController {
  constructor(private readonly service: PlatformAnnouncementsService) {}

  @Get()
  @ApiOkResponse({ type: PlatformAnnouncementsListDto })
  list(@Query() query: ListPlatformAnnouncementsQueryDto) {
    return this.service.list(query);
  }

  @Get("summary")
  @ApiOkResponse({ type: PlatformAnnouncementsSummaryDto })
  summary() {
    return this.service.summary();
  }

  @Get("tenant-options")
  @ApiOkResponse({ type: PlatformAnnouncementTenantOptionsListDto })
  tenantOptions(@Query() query: ListPlatformAnnouncementTenantOptionsQueryDto) {
    return this.service.listTenantOptions(query);
  }

  @Get(":id")
  @ApiOkResponse({ type: PlatformAnnouncementDetailDto })
  detail(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.detail(id);
  }

  @Post()
  @ApiCreatedResponse({ type: PlatformAnnouncementListItemDto })
  create(
    @Req() request: PlatformAuthenticatedRequest,
    @Body() input: CreatePlatformAnnouncementDto
  ) {
    return this.service.create(this.user(request), input);
  }

  @Patch(":id")
  @ApiOkResponse({ type: PlatformAnnouncementListItemDto })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() input: UpdatePlatformAnnouncementDto
  ) {
    return this.service.update(id, this.user(request), input);
  }

  @Post(":id/publish")
  @ApiCreatedResponse({ type: PlatformAnnouncementListItemDto })
  publish(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: PlatformAuthenticatedRequest
  ) {
    return this.service.publish(id, this.user(request), false);
  }

  @Post(":id/schedule")
  @ApiCreatedResponse({ type: PlatformAnnouncementListItemDto })
  schedule(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: PlatformAuthenticatedRequest
  ) {
    return this.service.publish(id, this.user(request), true);
  }

  @Post(":id/cancel")
  @ApiCreatedResponse({ type: PlatformAnnouncementListItemDto })
  cancel(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: PlatformAuthenticatedRequest
  ) {
    return this.service.cancel(id, this.user(request));
  }

  private user(request: PlatformAuthenticatedRequest) {
    return request.user!.sub;
  }
}
