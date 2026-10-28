import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformGuard } from "./platform.guard";
import type { PlatformPermission } from "./platform.constants";

export const PLATFORM_PERMISSIONS_KEY = "platform_permissions";
export const PLATFORM_STEP_UP_KEY = "platform_step_up";

export const PlatformPermissions = (...permissions: PlatformPermission[]) =>
  SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);

export const PlatformStepUp = () => SetMetadata(PLATFORM_STEP_UP_KEY, true);

export const PlatformEndpoint = () => applyDecorators(UseGuards(JwtAuthGuard, PlatformGuard));
