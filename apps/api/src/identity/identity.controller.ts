import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";

@ApiTags("identity")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("identity")
@TenantEndpoint()
export class IdentityController {
  @Get("me")
  @Permissions("admin:access")
  me(@ActiveTenant() tenantId: string) {
    return {
      tenantId,
      status: "authenticated"
    };
  }

  @Get("roles")
  @Permissions("admin:access")
  roles() {
    return {
      roles: ["owner", "admin", "lawyer", "paralegal", "accounting", "viewer"]
    };
  }
}
