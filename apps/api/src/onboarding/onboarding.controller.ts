import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import { TenantAuthenticatedRequest } from "../auth/auth.types";
import { Permissions } from "../auth/permissions.decorator";
import { TenantAuthenticated, TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import {
  OnboardingStatusDto,
  OnboardingChecklistResponseDto,
  StartOnboardingDto,
  StartOnboardingResponseDto,
  UpdateOnboardingChecklistStepDto,
  parseOnboardingChecklistStepId
} from "./onboarding.schemas";
import { OnboardingService } from "./onboarding.service";

@ApiTags("onboarding")
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post("start")
  @ApiBearerAuth()
  @TenantAuthenticated()
  @ApiCreatedResponse({ type: StartOnboardingResponseDto })
  start(@Req() request: TenantAuthenticatedRequest, @Body() input: StartOnboardingDto) {
    return this.onboardingService.start(request.user!.sub, input);
  }

  @Get("status")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @TenantEndpoint()
  @Permissions("admin:access")
  @ApiOkResponse({ type: OnboardingStatusDto })
  status(@ActiveTenant() tenantId: string) {
    return this.onboardingService.status(tenantId);
  }

  @Get("checklist")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @TenantEndpoint()
  @Permissions("admin:access")
  @ApiOkResponse({ type: OnboardingChecklistResponseDto })
  checklist(@ActiveTenant() tenantId: string, @Req() request: TenantAuthenticatedRequest) {
    return this.onboardingService.checklist(tenantId, request.user!);
  }

  @Patch("checklist/:step")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @TenantEndpoint()
  @Permissions("admin:access")
  @ApiOkResponse({ type: OnboardingChecklistResponseDto })
  updateChecklistStep(
    @ActiveTenant() tenantId: string,
    @Req() request: TenantAuthenticatedRequest,
    @Param("step") step: string,
    @Body() input: UpdateOnboardingChecklistStepDto
  ) {
    const parsedStep = parseChecklistStepOrThrow(step);

    return this.onboardingService.updateChecklistStep(tenantId, request.user!, parsedStep, input);
  }
}

function parseChecklistStepOrThrow(step: string) {
  try {
    return parseOnboardingChecklistStepId(step);
  } catch {
    throw new BadRequestException("El paso de onboarding no es valido.");
  }
}
