import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
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
import {
  AddTenantCurrenciesDto,
  AddTenantCurrenciesResponseDto,
  AvailableTenantCurrenciesResponseDto,
  CreateCurrencyDto,
  CurrencyDeleteResponseDto,
  CurrencyDto,
  CurrencyListResponseDto,
  ListAvailableTenantCurrenciesQueryDto,
  ListCurrenciesQueryDto,
  ListTenantCurrenciesQueryDto,
  TenantCurrencyListResponseDto,
  UpdateCurrencyDto
} from "./currencies.schemas";
import { CurrenciesService } from "./currencies.service";

@ApiTags("currencies")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("currencies")
@TenantEndpoint()
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @Permissions("currencies:read")
  @ApiOkResponse({ type: CurrencyListResponseDto })
  list(@Query() query: ListCurrenciesQueryDto) {
    return this.currenciesService.list(query);
  }

  @Get("tenant")
  @Permissions("currencies:read")
  @ApiOkResponse({ type: TenantCurrencyListResponseDto })
  listTenantCurrencies(
    @ActiveTenant() tenantId: string,
    @Query() query: ListTenantCurrenciesQueryDto
  ) {
    return this.currenciesService.listTenantCurrencies(tenantId, query);
  }

  @Post("tenant")
  @Permissions("finance:update")
  @ApiOkResponse({ type: AddTenantCurrenciesResponseDto })
  addTenantCurrencies(@ActiveTenant() tenantId: string, @Body() input: AddTenantCurrenciesDto) {
    return this.currenciesService.addTenantCurrencies(tenantId, input);
  }

  @Get("tenant/available")
  @Permissions("currencies:read")
  @ApiOkResponse({ type: AvailableTenantCurrenciesResponseDto })
  listAvailableTenantCurrencies(
    @ActiveTenant() tenantId: string,
    @Query() query: ListAvailableTenantCurrenciesQueryDto
  ) {
    return this.currenciesService.listAvailableTenantCurrencies(tenantId, query);
  }

  @Delete("tenant/:code")
  @Permissions("finance:update")
  @ApiOkResponse({ type: CurrencyDto })
  disableTenantCurrency(@ActiveTenant() tenantId: string, @Param("code") currencyCode: string) {
    return this.currenciesService.disableTenantCurrency(tenantId, currencyCode);
  }

  @Post()
  @Permissions("currencies:create")
  @ApiCreatedResponse({ type: CurrencyDto })
  create(@Body() input: CreateCurrencyDto) {
    return this.currenciesService.create(input);
  }

  @Patch(":id")
  @Permissions("currencies:update")
  @ApiOkResponse({ type: CurrencyDto })
  update(@Param("id") currencyId: string, @Body() input: UpdateCurrencyDto) {
    return this.currenciesService.update(currencyId, input);
  }

  @Delete(":id")
  @Permissions("currencies:delete")
  @ApiOkResponse({ type: CurrencyDeleteResponseDto })
  delete(@Param("id") currencyId: string) {
    return this.currenciesService.delete(currencyId);
  }
}
