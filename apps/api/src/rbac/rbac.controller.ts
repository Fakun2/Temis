import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { CreateRoleDto, PermissionDto, RoleDto, UpdateRoleDto } from "./rbac.schemas";
import { RbacService } from "./rbac.service";

@ApiTags("rbac")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("rbac")
@TenantEndpoint()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get("permissions")
  @Permissions("roles:read")
  @ApiOkResponse({ type: [PermissionDto] })
  permissions() {
    return this.rbacService.listPermissions();
  }

  @Get("roles")
  @Permissions("roles:read")
  @ApiOkResponse({ type: [RoleDto] })
  roles(@ActiveTenant() tenantId: string) {
    return this.rbacService.listRoles(tenantId);
  }

  @Post("roles")
  @Permissions("roles:create")
  @ApiCreatedResponse({ type: RoleDto })
  createRole(@ActiveTenant() tenantId: string, @Body() input: CreateRoleDto) {
    return this.rbacService.createRole(tenantId, input);
  }

  @Patch("roles/:id")
  @Permissions("roles:update")
  @ApiOkResponse({ type: RoleDto })
  updateRole(
    @ActiveTenant() tenantId: string,
    @Param("id") roleId: string,
    @Body() input: UpdateRoleDto
  ) {
    return this.rbacService.updateRole(tenantId, roleId, input);
  }

  @Delete("roles/:id")
  @Permissions("roles:delete")
  deleteRole(@ActiveTenant() tenantId: string, @Param("id") roleId: string) {
    return this.rbacService.deleteRole(tenantId, roleId);
  }
}
