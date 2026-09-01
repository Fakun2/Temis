import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/auth.types";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
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
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: StartOnboardingResponseDto })
  start(@Req() request: AuthenticatedRequest, @Body() input: StartOnboardingDto) {
    return this.onboardingService.start(request.user!.sub, input);
  }

  @Get("status")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("admin:access")
  @ApiOkResponse({ type: OnboardingStatusDto })
  status(@ActiveTenant() tenantId: string) {
    return this.onboardingService.status(tenantId);
  }

  @Get("checklist")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("admin:access")
  @ApiOkResponse({ type: OnboardingChecklistResponseDto })
  checklist(@ActiveTenant() tenantId: string, @Req() request: AuthenticatedRequest) {
    return this.onboardingService.checklist(tenantId, request.user!);
  }

  @Patch("checklist/:step")
  @ApiBearerAuth()
  @ApiSecurity("tenant")
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions("admin:access")
  @ApiOkResponse({ type: OnboardingChecklistResponseDto })
  updateChecklistStep(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
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
