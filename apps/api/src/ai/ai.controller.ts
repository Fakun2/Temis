import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { Permissions } from "../auth/permissions.decorator";
import { TenantEndpoint } from "../auth/tenant-endpoint.decorator";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { AiChatDto, AiChatResponseDto, AiToolsResponseDto } from "./ai.schemas";
import { AiService } from "./ai.service";

@ApiTags("ai")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("ai")
@TenantEndpoint()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("tools")
  @Permissions("ai:case_chat")
  @ApiOkResponse({ type: AiToolsResponseDto })
  listTools(@ActiveTenant() tenantId: string, @Req() request: AuthenticatedRequest) {
    return this.aiService.listTools(tenantId, getAuthenticatedUserId(request));
  }

  @Post("chat")
  @Permissions("ai:case_chat")
  @ApiOkResponse({ type: AiChatResponseDto })
  startChat(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: AiChatDto
  ) {
    return this.aiService.startChat(tenantId, getAuthenticatedUserId(request), input);
  }
}

function getAuthenticatedUserId(request: AuthenticatedRequest) {
  if (!request.user?.sub) {
    throw new Error("Authenticated user missing after TenantAuthGuard.");
  }

  return request.user.sub;
}
