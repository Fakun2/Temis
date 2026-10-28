import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import type { Request } from "express";
import {
  PlatformAccessGrantedDto,
  PlatformEnrollmentCredentialDto,
  PlatformEnrollmentStartDto,
  PlatformFidoRequiredDto,
  PlatformLoginFinishDto,
  PlatformLoginStartDto,
  RefreshTokenDto,
  TokenPairDto
} from "./auth.schemas";
import { PlatformAuthService } from "./platform-auth.service";
import { getPlatformRequestContext, getPlatformRequestMetadata } from "./platform-device-identity";

@ApiTags("platform-auth")
@ApiExtraModels(PlatformAccessGrantedDto, PlatformFidoRequiredDto)
@Controller("platform-auth")
export class PlatformAuthController {
  constructor(private readonly platformAuth: PlatformAuthService) {}

  @Post("login/start")
  @HttpCode(200)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(PlatformAccessGrantedDto) },
        { $ref: getSchemaPath(PlatformFidoRequiredDto) }
      ]
    }
  })
  loginStart(@Body() input: PlatformLoginStartDto, @Req() request: Request) {
    return this.platformAuth.startLogin(input, getPlatformRequestContext(request));
  }

  @Post("login/finish")
  @HttpCode(200)
  loginFinish(@Body() input: PlatformLoginFinishDto, @Req() request: Request) {
    return this.platformAuth.finishLogin(input, getPlatformRequestMetadata(request));
  }

  @Post("enrollment/start")
  @HttpCode(200)
  enrollmentStart(@Body() input: PlatformEnrollmentStartDto, @Req() request: Request) {
    return this.platformAuth.startEnrollment(input, getPlatformRequestMetadata(request));
  }

  @Post("enrollment/credential")
  @HttpCode(200)
  enrollmentCredential(@Body() input: PlatformEnrollmentCredentialDto, @Req() request: Request) {
    return this.platformAuth.registerEnrollmentCredential(
      input,
      getPlatformRequestMetadata(request)
    );
  }

  @Post("refresh")
  @ApiOkResponse({ type: TokenPairDto })
  refresh(@Body() input: RefreshTokenDto, @Req() request: Request) {
    return this.platformAuth.refresh(input.refreshToken, getPlatformRequestContext(request));
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Body() input: RefreshTokenDto) {
    return this.platformAuth.logout(input.refreshToken);
  }
}
