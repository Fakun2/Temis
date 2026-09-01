import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import {
  SaeImportDto,
  SaeImportResponseDto,
  SaePreviewDto,
  SaePreviewResponseDto
} from "./sae.schemas";
import { SaeImportService } from "./sae-import.service";

@ApiTags("integrations")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("integrations")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(private readonly saeImportService: SaeImportService) {}

  @Post("sae/preview")
  @Permissions("integrations:sae_import")
  @ApiOkResponse({ type: SaePreviewResponseDto })
  previewSaeImport(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: SaePreviewDto
  ) {
    return this.saeImportService.preview(tenantId, getUserId(request), input);
  }

  @Post("sae/import")
  @Permissions("integrations:sae_import")
  @ApiOkResponse({ type: SaeImportResponseDto })
  importSaeCases(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: SaeImportDto
  ) {
    return this.saeImportService.commitImport(tenantId, getUserId(request), input);
  }
}

function getUserId(request: AuthenticatedRequest) {
  if (!request.user?.sub) {
    throw new Error("No se pudo identificar al usuario autenticado.");
  }

  return request.user.sub;
}
