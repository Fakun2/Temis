import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import {
  AccountAiUsageResponseDto,
  AccountAvatarUploadResponseDto,
  AccountResponseDto,
  UpdateAccountMembershipDto,
  UpdateAccountNotificationsDto,
  UpdateAccountPasswordDto,
  UpdateAccountPasswordResponseDto,
  UpdateAccountProfileDto,
  UpdateAccountStudioDto
} from "./account.schemas";
import { AccountService, maxAccountAvatarSizeBytes } from "./account.service";

@ApiTags("account")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("account")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @ApiOkResponse({ type: AccountResponseDto })
  getAccount(@ActiveTenant() tenantId: string, @Req() request: AuthenticatedRequest) {
    return this.accountService.getAccount(tenantId, getAuthenticatedUser(request));
  }

  @Get("ai-usage")
  @ApiOkResponse({ type: AccountAiUsageResponseDto })
  getAiUsage(@ActiveTenant() tenantId: string, @Req() request: AuthenticatedRequest) {
    return this.accountService.getAiUsage(tenantId, getAuthenticatedUser(request));
  }

  @Get("avatar")
  async getAvatar(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true })
    response: { setHeader: (name: string, value: string | number) => void }
  ) {
    const object = await this.accountService.getAvatar(tenantId, getAuthenticatedUser(request));

    response.setHeader("Content-Type", object.contentType ?? "image/png");
    if (object.contentLength !== undefined) {
      response.setHeader("Content-Length", object.contentLength);
    }
    response.setHeader("Cache-Control", "private, no-store");

    return new StreamableFile(object.body);
  }

  @Post("avatar")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxAccountAvatarSizeBytes } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary"
        }
      },
      required: ["file"]
    }
  })
  @ApiOkResponse({ type: AccountAvatarUploadResponseDto })
  uploadAvatar(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile()
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined
  ) {
    return this.accountService.uploadAvatar(tenantId, getAuthenticatedUser(request), file);
  }

  @Patch("profile")
  @ApiOkResponse({ type: AccountResponseDto })
  updateProfile(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateAccountProfileDto
  ) {
    return this.accountService.updateProfile(tenantId, getAuthenticatedUser(request), input);
  }

  @Patch("studio")
  @ApiOkResponse({ type: AccountResponseDto })
  updateStudio(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateAccountStudioDto
  ) {
    return this.accountService.updateStudio(tenantId, getAuthenticatedUser(request), input);
  }

  @Patch("notifications")
  @ApiOkResponse({ type: AccountResponseDto })
  updateNotifications(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateAccountNotificationsDto
  ) {
    return this.accountService.updateNotifications(tenantId, getAuthenticatedUser(request), input);
  }

  @Patch("membership")
  @ApiOkResponse({ type: AccountResponseDto })
  updateMembership(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateAccountMembershipDto
  ) {
    return this.accountService.updateMembership(tenantId, getAuthenticatedUser(request), input);
  }

  @Patch("password/validate")
  @ApiOkResponse({ type: UpdateAccountPasswordResponseDto })
  validatePasswordChange(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateAccountPasswordDto
  ) {
    return this.accountService.validatePasswordChange(
      tenantId,
      getAuthenticatedUser(request),
      input
    );
  }

  @Patch("password")
  @ApiOkResponse({ type: UpdateAccountPasswordResponseDto })
  updatePassword(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateAccountPasswordDto
  ) {
    return this.accountService.updatePassword(tenantId, getAuthenticatedUser(request), input);
  }
}

function getAuthenticatedUser(request: AuthenticatedRequest) {
  if (!request.user?.sub) {
    throw new Error("No se pudo identificar al usuario autenticado.");
  }

  return request.user;
}
