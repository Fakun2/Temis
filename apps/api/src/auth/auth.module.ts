import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleAuthService } from "./google-auth.service";
import { getRequiredJwtConfig } from "./jwt-config";
import { JwtStrategy } from "./jwt.strategy";
import { DatabaseModule } from "../database/database.module";
import { EmailModule } from "../email/email.module";
import { RbacModule } from "../rbac/rbac.module";
import { PermissionsGuard } from "./permissions.guard";
import { RolesGuard } from "./roles.guard";
import { PasswordRecoveryRateLimiterService } from "./password-recovery-rate-limiter.service";
import { RedisModule } from "../redis/redis.module";
import { DEVICE_POSTURE_PROVIDER } from "./device-posture.provider";
import { OpswatDevicePostureProvider } from "./opswat-device-posture.provider";
import { PlatformAuthService } from "./platform-auth.service";
import { PlatformSecurityModeService } from "./platform-security-mode.service";
import { PlatformAuthController } from "./platform-auth.controller";
import { TenantAuthGuard } from "./tenant-auth.guard";
import { PlatformAuthTransactionService } from "./platform-auth-transaction.service";
import { PlatformSecurityAuditService } from "./platform-security-audit.service";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    EmailModule,
    RedisModule,
    RbacModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: getRequiredJwtConfig(config, "JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: getRequiredJwtConfig(config, "JWT_ACCESS_TTL") as JwtSignOptions["expiresIn"]
        }
      })
    })
  ],
  controllers: [AuthController, PlatformAuthController],
  providers: [
    AuthService,
    GoogleAuthService,
    JwtStrategy,
    TenantAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PasswordRecoveryRateLimiterService,
    PlatformSecurityModeService,
    PlatformAuthTransactionService,
    PlatformSecurityAuditService,
    PlatformAuthService,
    OpswatDevicePostureProvider,
    { provide: DEVICE_POSTURE_PROVIDER, useExisting: OpswatDevicePostureProvider }
  ],
  exports: [
    AuthService,
    TenantAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PlatformAuthService,
    PlatformSecurityModeService
  ]
})
export class AuthModule {}
