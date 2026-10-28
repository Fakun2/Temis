import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { DocumentCategoriesListResponseDto, ListDocumentCategoriesQueryDto } from "./cases.schemas";
import { CasesService } from "./cases.service";

@ApiTags("document-categories")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("document-categories")
@TenantEndpoint()
export class DocumentCategoriesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @Permissions("documents:read")
  @ApiOkResponse({ type: DocumentCategoriesListResponseDto })
  list(@ActiveTenant() tenantId: string, @Query() query: ListDocumentCategoriesQueryDto) {
    return this.casesService.listDocumentCategories(tenantId, query);
  }
}
