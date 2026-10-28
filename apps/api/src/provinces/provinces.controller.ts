import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ListProvincesQueryDto, ProvincesListResponseDto } from "./provinces.schemas";
import { ProvincesService } from "./provinces.service";

@ApiTags("provinces")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("provinces")
@TenantEndpoint()
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  @Permissions("provinces:read")
  @ApiOkResponse({ type: ProvincesListResponseDto })
  list(@Query() query: ListProvincesQueryDto) {
    return this.provincesService.listActive(query);
  }
}
