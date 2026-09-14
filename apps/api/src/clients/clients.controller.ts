import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiSecurity,
  ApiTags,
  getSchemaPath
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import {
  ClientArchiveResponseDto,
  ClientDeleteResponseDto,
  ClientDetailDto,
  ClientsListResponseDto,
  CreateHumanClientInputDto,
  CreateLegalEntityClientInputDto,
  CreateClientDto,
  ListClientsQueryDto,
  UpdateCommonClientInputDto,
  UpdateHumanClientInputDto,
  UpdateLegalEntityClientInputDto,
  UpdateClientDto
} from "./clients.schemas";
import { ClientsService } from "./clients.service";

@ApiTags("clients")
@ApiExtraModels(
  CreateHumanClientInputDto,
  CreateLegalEntityClientInputDto,
  UpdateCommonClientInputDto,
  UpdateHumanClientInputDto,
  UpdateLegalEntityClientInputDto
)
@ApiSecurity({ bearer: [], tenant: [] })
@Controller("clients")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Permissions("clients:create")
  @ApiBody({
    schema: {
      discriminator: {
        mapping: {
          human: getSchemaPath(CreateHumanClientInputDto),
          legal_entity: getSchemaPath(CreateLegalEntityClientInputDto)
        },
        propertyName: "type"
      },
      oneOf: [
        { $ref: getSchemaPath(CreateHumanClientInputDto) },
        { $ref: getSchemaPath(CreateLegalEntityClientInputDto) }
      ]
    }
  })
  @ApiCreatedResponse({ type: ClientDetailDto })
  @ApiBadRequestResponse({ description: "El contrato del cliente es invalido." })
  @ApiConflictResponse({ description: "DNI, CUIL o CUIT duplicado en el estudio." })
  create(@ActiveTenant() tenantId: string, @Body() input: CreateClientDto) {
    return this.clientsService.create(tenantId, input);
  }

  @Get()
  @Permissions("clients:read")
  @ApiOkResponse({ type: ClientsListResponseDto })
  @ApiBadRequestResponse({ description: "Filtros o cursor invalidos." })
  list(@ActiveTenant() tenantId: string, @Query() query: ListClientsQueryDto) {
    return this.clientsService.list(tenantId, query);
  }

  @Get(":id")
  @Permissions("clients:read")
  @ApiParam({ format: "uuid", name: "id", type: String })
  @ApiOkResponse({ type: ClientDetailDto })
  @ApiBadRequestResponse({ description: "El identificador no es un UUID valido." })
  @ApiNotFoundResponse({ description: "El cliente no existe en el estudio activo." })
  getDetail(@ActiveTenant() tenantId: string, @Param("id", new ParseUUIDPipe()) clientId: string) {
    return this.clientsService.getDetail(tenantId, clientId);
  }

  @Patch(":id")
  @Permissions("clients:update")
  @ApiParam({ format: "uuid", name: "id", type: String })
  @ApiBody({
    schema: {
      anyOf: [
        { $ref: getSchemaPath(CreateHumanClientInputDto) },
        { $ref: getSchemaPath(CreateLegalEntityClientInputDto) },
        { $ref: getSchemaPath(UpdateCommonClientInputDto) },
        { $ref: getSchemaPath(UpdateHumanClientInputDto) },
        { $ref: getSchemaPath(UpdateLegalEntityClientInputDto) }
      ],
      minProperties: 1
    }
  })
  @ApiOkResponse({ type: ClientDetailDto })
  @ApiBadRequestResponse({
    description: "El identificador o contrato de actualizacion es invalido."
  })
  @ApiConflictResponse({ description: "DNI, CUIL o CUIT duplicado en el estudio." })
  @ApiNotFoundResponse({ description: "El cliente no existe en el estudio activo." })
  update(
    @ActiveTenant() tenantId: string,
    @Param("id", new ParseUUIDPipe()) clientId: string,
    @Body() input: UpdateClientDto
  ) {
    return this.clientsService.update(tenantId, clientId, input);
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @Permissions("clients:update")
  @ApiParam({ format: "uuid", name: "id", type: String })
  @ApiOkResponse({ type: ClientArchiveResponseDto })
  @ApiBadRequestResponse({ description: "El identificador no es un UUID valido." })
  @ApiNotFoundResponse({ description: "El cliente no existe en el estudio activo." })
  archive(@ActiveTenant() tenantId: string, @Param("id", new ParseUUIDPipe()) clientId: string) {
    return this.clientsService.archive(tenantId, clientId);
  }

  @Delete(":id")
  @Permissions("clients:delete")
  @ApiParam({ format: "uuid", name: "id", type: String })
  @ApiOkResponse({ type: ClientDeleteResponseDto })
  @ApiBadRequestResponse({ description: "El identificador no es un UUID valido." })
  @ApiNotFoundResponse({ description: "El cliente no existe en el estudio activo." })
  delete(@ActiveTenant() tenantId: string, @Param("id", new ParseUUIDPipe()) clientId: string) {
    return this.clientsService.delete(tenantId, clientId);
  }
}
