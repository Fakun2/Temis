import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import { NotionIntegrationService } from "./notion-integration.service";
import {
  CreateNotionMappingDto,
  ListNotionDataSourcesQueryDto,
  NotionConflictsResponseDto,
  NotionDataSourcesResponseDto,
  NotionIntegrationStatusDto,
  NotionMappingDto,
  NotionOAuthStartDto,
  NotionSyncResultDto,
  ResolveNotionConflictDto,
  UpdateNotionMappingDto
} from "./notion.schemas";

@ApiTags("account")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("account/integrations/notion")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class NotionIntegrationController {
  constructor(private readonly notionIntegration: NotionIntegrationService) {}

  @Get()
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: NotionIntegrationStatusDto })
  getStatus(@ActiveTenant() tenantId: string) {
    return this.notionIntegration.getStatus(tenantId);
  }

  @Get("oauth/start")
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: NotionOAuthStartDto })
  startOAuth(@ActiveTenant() tenantId: string, @Req() request: AuthenticatedRequest) {
    return this.notionIntegration.getAuthorizationUrl(tenantId, getUserId(request));
  }

  @Get("oauth/callback")
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: NotionIntegrationStatusDto })
  completeOAuth(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Query("code") code: string,
    @Query("state") state: string
  ) {
    return this.notionIntegration.completeOAuth(tenantId, getUserId(request), { code, state });
  }

  @Delete()
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: Object })
  disconnect(@ActiveTenant() tenantId: string) {
    return this.notionIntegration.disconnect(tenantId);
  }

  @Get("data-sources")
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: NotionDataSourcesResponseDto })
  listDataSources(@ActiveTenant() tenantId: string, @Query() query: ListNotionDataSourcesQueryDto) {
    return this.notionIntegration.listDataSources(tenantId, query);
  }

  @Post("mappings")
  @Permissions("integrations:notion_manage")
  @ApiCreatedResponse({ type: NotionMappingDto })
  createMapping(@ActiveTenant() tenantId: string, @Body() input: CreateNotionMappingDto) {
    return this.notionIntegration.createMapping(tenantId, input);
  }

  @Patch("mappings/:mappingId")
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: NotionMappingDto })
  updateMapping(
    @ActiveTenant() tenantId: string,
    @Param("mappingId") mappingId: string,
    @Body() input: UpdateNotionMappingDto
  ) {
    return this.notionIntegration.updateMapping(tenantId, mappingId, input);
  }

  @Post("mappings/:mappingId/sync")
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: NotionSyncResultDto })
  syncMapping(@ActiveTenant() tenantId: string, @Param("mappingId") mappingId: string) {
    return this.notionIntegration.syncMapping(tenantId, mappingId);
  }

  @Get("conflicts")
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: NotionConflictsResponseDto })
  listConflicts(@ActiveTenant() tenantId: string) {
    return this.notionIntegration.listConflicts(tenantId);
  }

  @Post("conflicts/:conflictId/resolve")
  @Permissions("integrations:notion_manage")
  @ApiOkResponse({ type: Object })
  resolveConflict(
    @ActiveTenant() tenantId: string,
    @Param("conflictId") conflictId: string,
    @Body() input: ResolveNotionConflictDto
  ) {
    return this.notionIntegration.resolveConflict(tenantId, conflictId, input);
  }
}

function getUserId(request: AuthenticatedRequest) {
  if (!request.user?.sub) {
    throw new Error("No se pudo identificar al usuario autenticado.");
  }

  return request.user.sub;
}
