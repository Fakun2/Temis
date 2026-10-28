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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import type { PlatformAuthenticatedRequest } from "../auth/auth.types";
import { PlatformEndpoint, PlatformPermissions } from "./platform.decorator";
import {
  NewsletterActionDto,
  NewsletterAssetDto,
  NewsletterDto,
  NewsletterPageDto,
  UpdateNewsletterDto
} from "./platform-newsletters.schemas";
import {
  maxNewsletterImageBytes,
  PlatformNewslettersService
} from "./platform-newsletters.service";

@ApiTags("platform-newsletters")
@ApiBearerAuth()
@Controller("platform/newsletters")
@PlatformEndpoint()
@PlatformPermissions("platform:announcements:manage")
export class PlatformNewslettersController {
  constructor(private readonly service: PlatformNewslettersService) {}
  @Get()
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "filter", required: false, enum: ["all", "active", "inactive", "scheduled"] })
  @ApiOkResponse({ type: NewsletterPageDto })
  list(@Query("cursor") cursor?: string, @Query("filter") filter?: string) {
    return this.service.list(cursor, filter);
  }
  @Post() @ApiCreatedResponse({ type: NewsletterDto }) create(
    @Req() request: PlatformAuthenticatedRequest
  ) {
    return this.service.create(request.user!.sub);
  }
  @Get("assets/:assetId") async asset(
    @Param("assetId", ParseUUIDPipe) id: string,
    @Query("variant") variant: string | undefined,
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }
  ) {
    const { object, mimeType } = await this.service.asset(id, variant === "poster");
    response.setHeader("Content-Type", mimeType);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(object.body);
  }
  @Get(":id") @ApiOkResponse({ type: NewsletterDto }) detail(
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.service.detail(id);
  }
  @Patch(":id")
  @ApiBody({ type: UpdateNewsletterDto })
  @ApiOkResponse({ type: NewsletterDto })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: PlatformAuthenticatedRequest,
    @Body() body: UpdateNewsletterDto
  ) {
    return this.service.update(id, request.user!.sub, body);
  }
  @Post(":id/publish") @ApiCreatedResponse({ type: NewsletterDto }) publish(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: PlatformAuthenticatedRequest
  ) {
    return this.service.publish(id, request.user!.sub, false);
  }
  @Post(":id/schedule") @ApiCreatedResponse({ type: NewsletterDto }) schedule(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: PlatformAuthenticatedRequest
  ) {
    return this.service.publish(id, request.user!.sub, true);
  }
  @Post(":id/cancel") @ApiCreatedResponse({ type: NewsletterActionDto }) cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: PlatformAuthenticatedRequest
  ) {
    return this.service.cancel(id, request.user!.sub);
  }
  @Delete(":id") @ApiOkResponse({ type: NewsletterActionDto }) remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: PlatformAuthenticatedRequest
  ) {
    return this.service.remove(id, request.user!.sub);
  }
  @Post(":id/assets")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxNewsletterImageBytes } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: { file: { type: "string", format: "binary" } }
    }
  })
  @ApiCreatedResponse({ type: NewsletterAssetDto })
  upload(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: PlatformAuthenticatedRequest,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }
  ) {
    return this.service.upload(id, request.user!.sub, file);
  }
}
