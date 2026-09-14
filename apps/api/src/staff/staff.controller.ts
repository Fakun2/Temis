import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import {
  CreateStaffDto,
  ListParticipantOptionsQueryDto,
  ListStaffQueryDto,
  ParticipantOptionsResponseDto,
  StaffCreateResponseDto,
  StaffDeleteResponseDto,
  StaffListResponseDto,
  StaffUpdateResponseDto,
  UpdateStaffDto
} from "./staff.schemas";
import { StaffService } from "./staff.service";

@ApiTags("staff")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("staff")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Permissions("staff:read")
  @ApiOkResponse({ type: StaffListResponseDto })
  list(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: ListStaffQueryDto
  ) {
    return this.staffService.list(tenantId, request.user?.sub ?? "", query);
  }

  @Get("participant-options")
  @Permissions("staff:read")
  @ApiOkResponse({ type: ParticipantOptionsResponseDto })
  participantOptions(
    @ActiveTenant() tenantId: string,
    @Query() query: ListParticipantOptionsQueryDto
  ) {
    return this.staffService.listParticipantOptions(tenantId, query);
  }

  @Post()
  @Permissions("staff:create")
  @ApiCreatedResponse({ type: StaffCreateResponseDto })
  create(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateStaffDto
  ) {
    return this.staffService.create(tenantId, request.user?.sub ?? "", input);
  }

  @Patch(":id")
  @Permissions("staff:update")
  @ApiOkResponse({ type: StaffUpdateResponseDto })
  update(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Param("id") membershipId: string,
    @Body() input: UpdateStaffDto
  ) {
    return this.staffService.update(tenantId, request.user?.sub ?? "", membershipId, input);
  }

  @Delete(":id")
  @Permissions("staff:delete")
  @ApiOkResponse({ type: StaffDeleteResponseDto })
  delete(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Param("id") membershipId: string
  ) {
    return this.staffService.delete(tenantId, request.user?.sub ?? "", membershipId);
  }
}
