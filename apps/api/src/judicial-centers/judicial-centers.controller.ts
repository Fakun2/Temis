import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import {
  JudicialCentersListResponseDto,
  ListJudicialCentersQueryDto
} from "./judicial-centers.schemas";
import { JudicialCentersService } from "./judicial-centers.service";

@ApiTags("judicial-centers")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("judicial-centers")
@TenantEndpoint()
export class JudicialCentersController {
  constructor(private readonly judicialCentersService: JudicialCentersService) {}

  @Get()
  @Permissions("forums:read")
  @ApiOkResponse({ type: JudicialCentersListResponseDto })
  list(@Query() query: ListJudicialCentersQueryDto) {
    return this.judicialCentersService.listActive(query);
  }
}
