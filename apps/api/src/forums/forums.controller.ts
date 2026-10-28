import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { ForumsListResponseDto, ListForumsQueryDto } from "./forums.schemas";
import { ForumsService } from "./forums.service";

@ApiTags("forums")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("forums")
@TenantEndpoint()
export class ForumsController {
  constructor(private readonly forumsService: ForumsService) {}

  @Get()
  @Permissions("forums:read")
  @ApiOkResponse({ type: ForumsListResponseDto })
  list(@ActiveTenant() tenantId: string, @Query() query: ListForumsQueryDto) {
    return this.forumsService.list(tenantId, query);
  }
}
