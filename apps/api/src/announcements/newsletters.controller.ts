import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { NewslettersService } from "./newsletters.service";
import {
  NewsletterActionDto,
  NewsletterReaderDetailDto,
  NewsletterReaderPageDto,
  NewsletterSummaryDto
} from "../platform/platform-newsletters.schemas";

@ApiTags("newsletters")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("announcements/newsletters")
@TenantEndpoint()
@Permissions("admin:access")
export class NewslettersController {
  constructor(private readonly service: NewslettersService) {}
  @Get("summary") @ApiOkResponse({ type: NewsletterSummaryDto }) summary(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest
  ) {
    return this.service.summary(tenantId, request.user!.sub);
  }
  @Get()
  @ApiQuery({ name: "cursor", required: false })
  @ApiOkResponse({ type: NewsletterReaderPageDto })
  list(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Query("cursor") cursor?: string
  ) {
    return this.service.list(tenantId, request.user!.sub, cursor);
  }
  @Get("assets/:assetId") async asset(
    @ActiveTenant() tenantId: string,
    @Param("assetId", ParseUUIDPipe) assetId: string,
    @Query("variant") variant: string | undefined,
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }
  ) {
    const { object, mimeType } = await this.service.asset(tenantId, assetId, variant === "poster");
    response.setHeader("Content-Type", mimeType);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(object.body);
  }
  @Get(":id") @ApiOkResponse({ type: NewsletterReaderDetailDto }) detail(
    @ActiveTenant() tenantId: string,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.service.detail(tenantId, id);
  }
  @Post(":id/read") @ApiCreatedResponse({ type: NewsletterActionDto }) read(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.service.read(tenantId, request.user!.sub, id);
  }
}
