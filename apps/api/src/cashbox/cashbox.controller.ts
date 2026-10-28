import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import {
  CashboxMovementsListResponseDto,
  CashboxSummaryDto,
  CashboxSummaryQueryDto,
  CreateCashboxConversionDto,
  CreateCashboxConversionResponseDto,
  CreateCashboxMovementDto,
  CashboxMovementDto,
  ListCashboxMovementsQueryDto,
  UpdateCashboxMovementDto
} from "./cashbox.schemas";
import { CashboxService } from "./cashbox.service";

@ApiTags("cashbox")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("cashbox")
@TenantEndpoint()
export class CashboxController {
  constructor(private readonly cashboxService: CashboxService) {}

  @Get("summary")
  @Permissions("finance:read")
  @ApiOkResponse({ type: CashboxSummaryDto })
  summary(@ActiveTenant() tenantId: string, @Query() query: CashboxSummaryQueryDto) {
    return this.cashboxService.summary(tenantId, query);
  }

  @Get("movements")
  @Permissions("finance:read")
  @ApiOkResponse({ type: CashboxMovementsListResponseDto })
  listMovements(@ActiveTenant() tenantId: string, @Query() query: ListCashboxMovementsQueryDto) {
    return this.cashboxService.listMovements(tenantId, query);
  }

  @Post("movements")
  @Permissions("finance:create")
  @ApiCreatedResponse({ type: CashboxMovementDto })
  createMovement(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateCashboxMovementDto
  ) {
    return this.cashboxService.createMovement(tenantId, getAuthenticatedUserId(request), input);
  }

  @Patch("movements/:id")
  @Permissions("finance:update")
  @ApiOkResponse({ type: CashboxMovementDto })
  updateMovement(
    @ActiveTenant() tenantId: string,
    @Param("id", new ParseUUIDPipe()) movementId: string,
    @Body() input: UpdateCashboxMovementDto
  ) {
    return this.cashboxService.updateMovement(tenantId, movementId, input);
  }

  @Delete("movements/:id")
  @Permissions("finance:delete")
  @ApiOkResponse()
  deleteMovement(
    @ActiveTenant() tenantId: string,
    @Param("id", new ParseUUIDPipe()) movementId: string
  ) {
    return this.cashboxService.deleteMovement(tenantId, movementId);
  }

  @Post("conversions")
  @Permissions("finance:create")
  @ApiCreatedResponse({ type: CreateCashboxConversionResponseDto })
  createConversion(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateCashboxConversionDto
  ) {
    return this.cashboxService.createConversion(tenantId, getAuthenticatedUserId(request), input);
  }
}

function getAuthenticatedUserId(request: AuthenticatedRequest) {
  if (!request.user?.sub) {
    throw new UnauthorizedException("No authenticated user found in request.");
  }

  return request.user.sub;
}
