import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { randomInt } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { RbacService } from "../rbac/rbac.service";
import {
  CreateAccountDto,
  GoogleLoginDto,
  LoginDto,
  PasswordRecoveryConfirmDto,
  PasswordRecoveryRequestDto
} from "./auth.schemas";
import { TenantJwtPayload } from "./auth.types";
import { GoogleAuthService, type GoogleAuthProfile } from "./google-auth.service";
import { getRequiredJwtConfig } from "./jwt-config";
import { PasswordRecoveryRateLimiterService } from "./password-recovery-rate-limiter.service";

const passwordRecoveryCodeLifetimeMs = 10 * 60_000;
const passwordRecoveryCodeMaxAttempts = 5;

type LoginUser = {
  avatarUrl: string | null;
  email: string;
  fullName: string;
  id: string;
  phone: string | null;
  status: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly emailService: EmailService,
    private readonly passwordRecoveryRateLimiter: PasswordRecoveryRateLimiterService
  ) {}

  async createAccount(input: CreateAccountDto) {
    const email = input.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException("Ya existe una cuenta con ese email.");
    }

    const user = await this.prisma.user.create({
      data: {
        fullName: input.fullName,
        email,
        passwordHash: await hash(input.password, 12),
        phone: input.phone,
        status: "active"
      }
    });

    return {
      user: this.toAuthUser(user)
    };
  }

  async login(input: LoginDto) {
    const email = input.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      include: { platformRoleAssignment: { select: { status: true } } },
      where: { email }
    });

    if (!user || user.platformRoleAssignment?.status === "active") {
      throw new UnauthorizedException("Email o contrasena invalidos.");
    }

    if (user.status !== "active") {
      throw new ForbiddenException("Esta cuenta se encuentra suspendida.");
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException("Esta cuenta usa acceso con Google.");
    }

    const passwordMatches = await compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Email o contrasena invalidos.");
    }

    return this.issueLoginSession(user, input.tenantId);
  }

  async googleLogin(input: GoogleLoginDto) {
    const profile = await this.googleAuthService.verifyIdToken(input.idToken);
    const now = new Date();
    const identity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: "google",
          providerUserId: profile.providerUserId
        }
      },
      include: {
        user: true
      }
    });

    const user = identity?.user
      ? await this.prisma.user.update({
          where: { id: identity.user.id },
          data: {
            avatarUrl: identity.user.avatarUrl ?? profile.avatarUrl,
            emailVerifiedAt: identity.user.emailVerifiedAt ?? now
          }
        })
      : await this.findOrCreateGoogleUser(profile, now);

    if (user.status !== "active") {
      throw new ForbiddenException("Esta cuenta se encuentra suspendida.");
    }

    const platformAssignment = await this.prisma.platformRoleAssignment.findUnique({
      where: { userId: user.id },
      select: { status: true }
    });
    if (platformAssignment?.status === "active") {
      throw new UnauthorizedException("No se pudo iniciar sesion con Google.");
    }

    return this.issueLoginSession(user);
  }

  async requestPasswordRecovery(input: PasswordRecoveryRequestDto, ip: string) {
    const email = input.email.toLowerCase();
    await this.passwordRecoveryRateLimiter.assertCanRequest(email, ip);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, status: true, platformRoleAssignment: true }
    });

    if (
      !user ||
      user.status !== "active" ||
      !user.passwordHash ||
      user.platformRoleAssignment?.status === "active"
    ) {
      return { status: "ok" as const };
    }

    const now = new Date();
    const code = randomInt(100_000, 1_000_000).toString();
    const resetCode = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      await tx.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
          invalidatedAt: null
        },
        data: { invalidatedAt: now }
      });

      return tx.passwordResetCode.create({
        data: {
          codeHash: await hash(code, 12),
          expiresAt: new Date(now.getTime() + passwordRecoveryCodeLifetimeMs),
          userId: user.id
        }
      });
    });

    try {
      await this.emailService.sendPasswordRecoveryCode({
        code,
        email,
        expiresInMinutes: passwordRecoveryCodeLifetimeMs / 60_000
      });
    } catch (error) {
      await this.prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { invalidatedAt: new Date() }
      });
      throw error;
    }

    return { status: "ok" as const };
  }

  async confirmPasswordRecovery(input: PasswordRecoveryConfirmDto, ip: string) {
    await this.passwordRecoveryRateLimiter.assertCanConfirm(ip);

    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true, status: true, platformRoleAssignment: true }
    });
    const invalidCode = () => new BadRequestException("El código es inválido o expiró.");

    if (!user || user.status !== "active" || user.platformRoleAssignment?.status === "active") {
      throw invalidCode();
    }

    const resetCode = await this.prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!resetCode || resetCode.attempts >= passwordRecoveryCodeMaxAttempts) {
      if (resetCode) {
        await this.prisma.passwordResetCode.update({
          where: { id: resetCode.id },
          data: { invalidatedAt: new Date() }
        });
      }
      throw invalidCode();
    }

    if (!(await compare(input.code, resetCode.codeHash))) {
      const attempts = resetCode.attempts + 1;
      await this.prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: {
          attempts,
          ...(attempts >= passwordRecoveryCodeMaxAttempts ? { invalidatedAt: new Date() } : {})
        }
      });
      throw invalidCode();
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetCode.updateMany({
        where: {
          id: resetCode.id,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: now }
        },
        data: { consumedAt: now }
      });

      if (consumed.count !== 1) {
        return false;
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hash(input.newPassword, 12),
          sessionVersion: { increment: 1 }
        }
      });
      await tx.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          id: { not: resetCode.id },
          consumedAt: null,
          invalidatedAt: null
        },
        data: { invalidatedAt: now }
      });

      return true;
    });

    if (!updated) {
      throw invalidCode();
    }

    return { status: "ok" as const };
  }

  async refresh(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<TenantJwtPayload>(refreshToken, {
      secret: getRequiredJwtConfig(this.config, "JWT_REFRESH_SECRET")
    });
    if (
      payload.sessionKind !== "tenant" ||
      !Array.isArray(payload.tenantAccess) ||
      "platformAccess" in payload ||
      "sid" in payload
    ) {
      throw new UnauthorizedException("Sesion invalida.");
    }

    await this.assertSessionIsValid(payload);

    return this.issueTokens(await this.buildJwtPayload(payload.sub));
  }

  async issueTokens(payload: TenantJwtPayload) {
    const tokenPayload = this.toTokenPayload(payload);
    const accessToken = await this.jwtService.signAsync(tokenPayload);
    const refreshToken = await this.jwtService.signAsync(tokenPayload, {
      secret: getRequiredJwtConfig(this.config, "JWT_REFRESH_SECRET"),
      expiresIn: getRequiredJwtConfig(this.config, "JWT_REFRESH_TTL") as JwtSignOptions["expiresIn"]
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer"
    };
  }

  private async issueLoginSession(user: LoginUser, tenantId?: string) {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        userId: user.id,
        ...(tenantId ? { tenantId } : {})
      },
      include: {
        role: true,
        tenant: true
      }
    });

    if (tenantId && memberships.length === 0) {
      throw new ForbiddenException("No tenes acceso activo a ese estudio.");
    }

    const activeTenantMemberships = memberships.filter(
      (membership) => membership.tenant.status === "active" && membership.status === "active"
    );
    const hasSuspendedMembership = memberships.some(
      (membership) => membership.tenant.status === "active" && membership.status === "suspended"
    );

    if (activeTenantMemberships.length === 0 && hasSuspendedMembership) {
      throw new ForbiddenException("Esta cuenta se encuentra suspendida para este estudio.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      user: this.toAuthUser(user),
      tokens: await this.issueTokens(await this.buildJwtPayload(user.id))
    };
  }

  private async findOrCreateGoogleUser(profile: GoogleAuthProfile, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: profile.email }
      });
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              avatarUrl: existingUser.avatarUrl ?? profile.avatarUrl,
              emailVerifiedAt: existingUser.emailVerifiedAt ?? now
            }
          })
        : await tx.user.create({
            data: {
              avatarUrl: profile.avatarUrl,
              email: profile.email,
              emailVerifiedAt: now,
              fullName: profile.fullName,
              passwordHash: null,
              status: "active"
            }
          });

      await tx.userIdentity.upsert({
        where: {
          provider_providerUserId: {
            provider: "google",
            providerUserId: profile.providerUserId
          }
        },
        update: {
          email: profile.email
        },
        create: {
          email: profile.email,
          provider: "google",
          providerUserId: profile.providerUserId,
          userId: user.id
        }
      });

      return user;
    });
  }

  private toTokenPayload(payload: TenantJwtPayload): TenantJwtPayload {
    return {
      sessionKind: "tenant",
      sub: payload.sub,
      email: payload.email,
      sessionVersion: payload.sessionVersion,
      tenantAccess: payload.tenantAccess
    };
  }

  private toAuthUser(user: LoginUser) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status
    };
  }

  private async buildJwtPayload(userId: string): Promise<TenantJwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        id: true,
        memberships: {
          where: {
            status: "active",
            tenant: { status: "active" }
          },
          include: {
            role: true
          }
        },
        platformRoleAssignment: {
          select: { roleCode: true, status: true }
        },
        sessionVersion: true
      }
    });

    if (!user) {
      throw new UnauthorizedException("Sesion invalida.");
    }

    const platformAssignment = user.platformRoleAssignment;
    if (platformAssignment?.status === "active" && platformAssignment.roleCode === "super_admin") {
      throw new UnauthorizedException("Sesion invalida.");
    }

    const tenantAccess = await Promise.all(
          user.memberships.map(async (membership) => ({
            tenantId: membership.tenantId,
            role: membership.role?.code ?? null,
            permissions: membership.role
              ? await this.rbacService.getPermissionsForRole(membership.role.code)
              : []
          }))
        );

    return {
      sessionKind: "tenant",
      sub: user.id,
      email: user.email,
      sessionVersion: user.sessionVersion,
      tenantAccess
    };
  }

  private async assertSessionIsValid(payload: TenantJwtPayload) {
    const user = await this.getUserSessionState(payload.sub);

    if (!user || user.status !== "active" || user.sessionVersion !== payload.sessionVersion) {
      throw new UnauthorizedException("Sesion invalida.");
    }
  }

  private async getUserSessionState(userId: string) {
    const [user] = await this.prisma.$queryRaw<Array<{ sessionVersion: number; status: string }>>`
      SELECT "session_version" AS "sessionVersion", "status"
      FROM "users"
      WHERE "id" = ${userId}::uuid
      LIMIT 1
    `;

    return user ?? null;
  }
}
