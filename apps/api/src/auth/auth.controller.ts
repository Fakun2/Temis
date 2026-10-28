import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import {
  CreateAccountDto,
  CreateAccountResponseDto,
  GoogleLoginDto,
  LoginDto,
  LoginResponseDto,
  LogoutDto,
  PasswordRecoveryConfirmDto,
  PasswordRecoveryRequestDto,
  PasswordRecoveryResponseDto,
  RefreshTokenDto,
  TokenPairDto
} from "./auth.schemas";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("create-account")
  @ApiCreatedResponse({ type: CreateAccountResponseDto })
  createAccount(@Body() input: CreateAccountDto) {
    return this.authService.createAccount(input);
  }

  @Post("login")
  @HttpCode(200)
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() input: LoginDto) {
    return this.authService.login(input);
  }

  @Post("google")
  @HttpCode(200)
  @ApiOkResponse({ type: LoginResponseDto })
  googleLogin(@Body() input: GoogleLoginDto) {
    return this.authService.googleLogin(input);
  }

  @Post("password-recovery/request")
  @HttpCode(200)
  @ApiOkResponse({ type: PasswordRecoveryResponseDto })
  requestPasswordRecovery(@Body() input: PasswordRecoveryRequestDto, @Req() request: Request) {
    return this.authService.requestPasswordRecovery(input, request.ip ?? "unknown");
  }

  @Post("password-recovery/confirm")
  @HttpCode(200)
  @ApiOkResponse({ type: PasswordRecoveryResponseDto })
  confirmPasswordRecovery(@Body() input: PasswordRecoveryConfirmDto, @Req() request: Request) {
    return this.authService.confirmPasswordRecovery(input, request.ip ?? "unknown");
  }

  @Post("refresh")
  @ApiCreatedResponse({ type: TokenPairDto })
  refresh(@Body() input: RefreshTokenDto) {
    return this.authService.refresh(input.refreshToken);
  }

  @Post("logout")
  @ApiOkResponse({ type: LogoutDto })
  logout() {
    return {
      status: "ok"
    };
  }
}
