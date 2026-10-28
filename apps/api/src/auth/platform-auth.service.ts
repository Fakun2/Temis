import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON
} from "@simplewebauthn/server";
import { compare } from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import {
  DEVICE_POSTURE_PROVIDER,
  DevicePostureProvider,
  DevicePostureUnavailableError
} from "./device-posture.provider";
import type { PlatformJwtPayload } from "./auth.types";
import type {
  PlatformEnrollmentCredentialDto,
  PlatformEnrollmentStartDto,
  PlatformLoginFinishDto,
  PlatformLoginStartDto,
  PlatformPasswordStepUpDto,
  PlatformStepUpFinishDto
} from "./auth.schemas";
import type { PlatformRequestContext, PlatformRequestMetadata } from "./platform-device-identity";
import {
  PlatformSecurityModeService,
  type PlatformSecurityMode
} from "./platform-security-mode.service";
import { PlatformAuthTransactionService } from "./platform-auth-transaction.service";
import { PlatformSecurityAuditService } from "./platform-security-audit.service";
import { digestPlatformValue } from "./platform-auth.crypto";
import { PLATFORM_PERMISSIONS } from "../platform/platform.constants";

const idleTtlMs = 15 * 60_000;
const absoluteTtlMs = 8 * 60 * 60_000;
const postureFreshMs = 5 * 60_000;
const postureOutageGraceMs = 15 * 60_000;
const stepUpFreshMs = 5 * 60_000;
@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly securityMode: PlatformSecurityModeService,
    @Inject(DEVICE_POSTURE_PROVIDER) private readonly postureProvider: DevicePostureProvider,
    private readonly transactions: PlatformAuthTransactionService,
    private readonly audit: PlatformSecurityAuditService
  ) {}

  async startLogin(input: PlatformLoginStartDto, metadata: PlatformRequestContext) {
    await this.transactions.assertRateLimit(input.email, metadata);
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        platformAuthenticators: { where: { status: "active" } },
        platformDevices: { where: { status: "active" } },
        platformRoleAssignment: true,
        _count: { select: { memberships: true } }
      }
    });

    if (
      !user ||
      user.status !== "active" ||
      !user.passwordHash ||
      user.platformRoleAssignment?.status !== "active" ||
      user._count.memberships > 0 ||
      !(await compare(input.password, user.passwordHash))
    ) {
      await this.audit.record("login_password", "denied", metadata, {
        reason: "invalid_credentials"
      });
      throw new UnauthorizedException("Email o contrasena invalidos.");
    }

    if (this.securityMode.isDisabled()) {
      await this.audit.record("login_password", "success", metadata, {
        reason: "security_disabled",
        userId: user.id
      });
      const session = await this.createSession(user.id, null, metadata, "disabled");
      return { ...session, securityMode: "disabled" as const, status: "access_granted" as const };
    }

    const requiredMetadata = this.requireDevice(metadata);

    if (user.platformAuthenticators.length < 2) {
      throw new ForbiddenException({
        code: "security_enrollment_required",
        message: "La cuenta requiere completar el enrolamiento de seguridad desde el VPS."
      });
    }

    const device = user.platformDevices.find(
      (candidate) =>
        candidate.certificateFingerprint === requiredMetadata.device.certificateFingerprint
    );
    if (
      !device ||
      device.status !== "active" ||
      device.externalDeviceId !== requiredMetadata.device.externalDeviceId
    ) {
      await this.audit.record("login_device", "denied", metadata, {
        reason: "device_not_enrolled",
        userId: user.id
      });
      throw new ForbiddenException({
        code: "device_not_enrolled",
        message: "Este dispositivo no esta enrolado para la cuenta de plataforma."
      });
    }

    await this.assertPosture(device.id, device.externalDeviceId, requiredMetadata, false);
    const options = await generateAuthenticationOptions({
      allowCredentials: user.platformAuthenticators.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as AuthenticatorTransportFuture[]
      })),
      rpID: this.rpId(),
      timeout: 60_000,
      userVerification: "required"
    });
    const transactionId = randomUUID();
    await this.transactions.write(transactionId, {
      challenge: options.challenge,
      deviceId: device.id,
      fingerprint: requiredMetadata.device.certificateFingerprint,
      kind: "login",
      userId: user.id
    });

    return {
      options,
      securityMode: "required" as const,
      status: "fido_required" as const,
      transactionId
    };
  }

  async finishLogin(input: PlatformLoginFinishDto, metadata: PlatformRequestMetadata) {
    this.assertSecurityMode("required");
    const transaction = await this.transactions.consume(input.transactionId, "login");
    this.assertFingerprint(transaction, metadata);
    const response = input.response as unknown as AuthenticationResponseJSON;
    const authenticator = await this.prisma.platformAuthenticator.findUnique({
      where: { credentialId: response.id }
    });
    if (
      !authenticator ||
      authenticator.userId !== transaction.userId ||
      authenticator.status !== "active"
    ) {
      throw new UnauthorizedException("La llave de seguridad no esta autorizada.");
    }

    const verification = await verifyAuthenticationResponse({
      credential: {
        counter: Number(authenticator.counter),
        id: authenticator.credentialId,
        publicKey: new Uint8Array(authenticator.publicKey),
        transports: authenticator.transports as AuthenticatorTransportFuture[]
      },
      expectedChallenge: transaction.challenge,
      expectedOrigin: this.origins(),
      expectedRPID: this.rpId(),
      requireUserVerification: true,
      response
    });
    if (
      !verification.verified ||
      verification.authenticationInfo.credentialBackedUp ||
      verification.authenticationInfo.credentialDeviceType !== "singleDevice"
    ) {
      throw new UnauthorizedException("La llave de seguridad no cumple la politica requerida.");
    }

    await this.prisma.platformAuthenticator.update({
      where: { id: authenticator.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date()
      }
    });
    return this.createSession(transaction.userId, transaction.deviceId, metadata, "required");
  }

  async startEnrollment(input: PlatformEnrollmentStartDto, metadata: PlatformRequestMetadata) {
    await this.transactions.assertRateLimit(input.email, metadata);
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { platformAuthenticators: true, platformRoleAssignment: true }
    });
    const tokenHash = digestPlatformValue(input.bootstrapToken);
    const bootstrapToken = await this.prisma.platformBootstrapToken.findUnique({
      where: { tokenHash }
    });
    if (
      !user ||
      user.status !== "active" ||
      !user.passwordHash ||
      !(await compare(input.password, user.passwordHash)) ||
      user.platformRoleAssignment?.status !== "active" ||
      !bootstrapToken ||
      bootstrapToken.userId !== user.id ||
      bootstrapToken.consumedAt ||
      bootstrapToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("No se pudo iniciar el enrolamiento.");
    }

    const posture = await this.assessPosture(metadata.device.externalDeviceId);
    if (!posture.compliant) this.throwNonCompliant(posture.failures);
    const options = await this.registrationOptions(user, user.platformAuthenticators);
    const transactionId = randomUUID();
    await this.transactions.write(transactionId, {
      bootstrapTokenId: bootstrapToken.id,
      challenge: options.challenge,
      deviceName: input.deviceName,
      externalDeviceId: metadata.device.externalDeviceId,
      fingerprint: metadata.device.certificateFingerprint,
      kind: "enrollment",
      registeredAuthenticatorIds: [],
      userId: user.id
    });
    return { options, remainingKeys: 2, status: "fido_required" as const, transactionId };
  }

  async registerEnrollmentCredential(
    input: PlatformEnrollmentCredentialDto,
    metadata: PlatformRequestMetadata
  ) {
    const transaction = await this.transactions.read(input.transactionId, "enrollment");
    this.assertFingerprint(transaction, metadata);
    const verification = await verifyRegistrationResponse({
      expectedChallenge: transaction.challenge,
      expectedOrigin: this.origins(),
      expectedRPID: this.rpId(),
      requireUserVerification: true,
      response: input.response as unknown as RegistrationResponseJSON
    });
    if (
      !verification.verified ||
      verification.registrationInfo.credentialBackedUp ||
      verification.registrationInfo.credentialDeviceType !== "singleDevice"
    ) {
      throw new ForbiddenException("Se requiere una llave FIDO2 fisica no sincronizable.");
    }
    this.assertAllowedAaguid(verification.registrationInfo.aaguid);

    const credential = verification.registrationInfo.credential;
    const created = await this.prisma.platformAuthenticator.create({
      data: {
        aaguid: verification.registrationInfo.aaguid,
        counter: BigInt(credential.counter),
        credentialId: credential.id,
        name: input.authenticatorName,
        publicKey: Buffer.from(credential.publicKey),
        status: "pending",
        transports: credential.transports ?? [],
        userId: transaction.userId
      }
    });
    transaction.registeredAuthenticatorIds.push(created.id);

    if (transaction.registeredAuthenticatorIds.length < 2) {
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: transaction.userId } });
      const authenticators = await this.prisma.platformAuthenticator.findMany({
        where: { userId: transaction.userId }
      });
      const options = await this.registrationOptions(user, authenticators);
      transaction.challenge = options.challenge;
      await this.transactions.write(input.transactionId, transaction);
      return {
        options,
        remainingKeys: 2 - transaction.registeredAuthenticatorIds.length,
        status: "fido_required" as const,
        transactionId: input.transactionId
      };
    }

    const posture = await this.assessPosture(transaction.externalDeviceId);
    if (!posture.compliant) this.throwNonCompliant(posture.failures);
    const now = new Date();
    const device = await this.prisma.$transaction(async (tx) => {
      await tx.platformAuthenticator.updateMany({
        where: { id: { in: transaction.registeredAuthenticatorIds }, userId: transaction.userId },
        data: { status: "active" }
      });
      const enrolled = await tx.platformDevice.upsert({
        where: { certificateFingerprint: transaction.fingerprint },
        update: {
          externalDeviceId: transaction.externalDeviceId,
          lastCompliantAt: now,
          lastSeenAt: now,
          name: transaction.deviceName,
          platform: "windows",
          revokedAt: null,
          status: "active",
          userId: transaction.userId
        },
        create: {
          certificateFingerprint: transaction.fingerprint,
          externalDeviceId: transaction.externalDeviceId,
          lastCompliantAt: now,
          lastSeenAt: now,
          name: transaction.deviceName,
          platform: "windows",
          provider: "opswat",
          status: "active",
          userId: transaction.userId
        }
      });
      await tx.platformBootstrapToken.update({
        where: { id: transaction.bootstrapTokenId },
        data: { consumedAt: now }
      });
      return enrolled;
    });
    await this.transactions.delete(input.transactionId);
    return this.createSession(transaction.userId, device.id, metadata, "required");
  }

  async refresh(refreshToken: string, metadata: PlatformRequestContext) {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) throw new UnauthorizedException("Sesion invalida.");
    const session = await this.prisma.platformSession.findUnique({
      where: { id: parsed.sessionId },
      include: { device: true, user: true }
    });
    if (!session || session.refreshFamilyId !== parsed.familyId) {
      throw new UnauthorizedException("Sesion invalida.");
    }
    if (session.securityMode !== this.securityMode.mode) {
      await this.audit.revokeSessionFamily(session.refreshFamilyId, "security_mode_changed");
      throw new UnauthorizedException("La sesion pertenece a otro modo de seguridad.");
    }
    const tokenHash = digestPlatformValue(refreshToken);
    if (session.previousTokenHash === tokenHash) {
      await this.audit.revokeSessionFamily(session.refreshFamilyId, "refresh_replay");
      throw new UnauthorizedException("Sesion revocada por reutilizacion de credenciales.");
    }
    if (session.refreshTokenHash !== tokenHash) throw new UnauthorizedException("Sesion invalida.");
    this.assertActiveSession(session, metadata);

    let postureCheckedAt = session.postureCheckedAt;
    if (session.securityMode === "required") {
      const requiredMetadata = this.requireDevice(metadata);
      if (!session.device) throw new UnauthorizedException("Sesion de plataforma invalida.");
      postureCheckedAt = await this.assertPosture(
        session.device.id,
        session.device.externalDeviceId,
        requiredMetadata,
        true,
        session.postureCheckedAt ?? undefined
      );
    }
    const nextRefreshToken = makeRefreshToken(session.id, session.refreshFamilyId);
    const now = new Date();
    await this.prisma.platformSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: now,
        postureCheckedAt,
        previousTokenHash: session.refreshTokenHash,
        refreshTokenHash: digestPlatformValue(nextRefreshToken)
      }
    });
    return {
      accessToken: await this.issueAccessToken(
        session.user,
        session.id,
        session.device?.id ?? null,
        postureCheckedAt,
        session.securityMode
      ),
      refreshToken: nextRefreshToken,
      tokenType: "Bearer" as const
    };
  }

  async startStepUp(payload: PlatformJwtPayload, metadata: PlatformRequestMetadata) {
    this.assertSecurityMode("required");
    const session = await this.getSessionForPayload(payload, metadata);
    const credentials = await this.prisma.platformAuthenticator.findMany({
      where: { status: "active", userId: payload.sub }
    });
    const options = await generateAuthenticationOptions({
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as AuthenticatorTransportFuture[]
      })),
      rpID: this.rpId(),
      userVerification: "required"
    });
    const transactionId = randomUUID();
    await this.transactions.write(transactionId, {
      challenge: options.challenge,
      fingerprint: metadata.device.certificateFingerprint,
      kind: "step_up",
      sessionId: session.id,
      userId: payload.sub
    });
    return { options, transactionId };
  }

  async finishStepUp(
    payload: PlatformJwtPayload,
    input: PlatformStepUpFinishDto,
    metadata: PlatformRequestMetadata
  ) {
    this.assertSecurityMode("required");
    const transaction = await this.transactions.consume(input.transactionId, "step_up");
    this.assertFingerprint(transaction, metadata);
    if (transaction.userId !== payload.sub || transaction.sessionId !== payload.sid) {
      throw new UnauthorizedException("La verificacion no corresponde a esta sesion.");
    }
    const response = input.response as unknown as AuthenticationResponseJSON;
    const credential = await this.prisma.platformAuthenticator.findUnique({
      where: { credentialId: response.id }
    });
    if (!credential || credential.userId !== payload.sub || credential.status !== "active") {
      throw new UnauthorizedException("Llave no autorizada.");
    }
    const verification = await verifyAuthenticationResponse({
      credential: {
        counter: Number(credential.counter),
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        transports: credential.transports as AuthenticatorTransportFuture[]
      },
      expectedChallenge: transaction.challenge,
      expectedOrigin: this.origins(),
      expectedRPID: this.rpId(),
      requireUserVerification: true,
      response
    });
    if (
      !verification.verified ||
      verification.authenticationInfo.credentialBackedUp ||
      verification.authenticationInfo.credentialDeviceType !== "singleDevice"
    ) {
      throw new UnauthorizedException("No se pudo verificar la llave.");
    }
    await this.prisma.$transaction([
      this.prisma.platformAuthenticator.update({
        where: { id: credential.id },
        data: {
          counter: BigInt(verification.authenticationInfo.newCounter),
          lastUsedAt: new Date()
        }
      }),
      this.prisma.platformSession.update({
        where: { id: transaction.sessionId },
        data: { stepUpAt: new Date() }
      })
    ]);
    return { status: "ok" as const };
  }

  async passwordStepUp(
    payload: PlatformJwtPayload,
    input: PlatformPasswordStepUpDto,
    metadata: PlatformRequestContext
  ) {
    this.assertSecurityMode("disabled");
    await this.transactions.assertRateLimit(payload.email, metadata);
    const session = await this.getSessionForPayload(payload, metadata);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { passwordHash: true, status: true }
    });
    if (
      !user?.passwordHash ||
      user.status !== "active" ||
      !(await compare(input.password, user.passwordHash))
    ) {
      await this.audit.record("password_step_up", "denied", metadata, {
        reason: "invalid_credentials",
        sessionId: session.id,
        userId: payload.sub
      });
      throw new UnauthorizedException("La contrasena no es valida.");
    }
    await this.prisma.platformSession.update({
      where: { id: session.id },
      data: { stepUpAt: new Date() }
    });
    await this.audit.record("password_step_up", "success", metadata, {
      sessionId: session.id,
      userId: payload.sub
    });
    return { status: "ok" as const };
  }

  isPlatformRefreshToken(value: string) {
    return value.startsWith("plat_");
  }

  async logout(refreshToken: string) {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) throw new UnauthorizedException("Sesion invalida.");
    const session = await this.prisma.platformSession.findUnique({
      where: { id: parsed.sessionId },
      select: { refreshFamilyId: true }
    });
    if (session?.refreshFamilyId === parsed.familyId) {
      await this.audit.revokeSessionFamily(parsed.familyId, "logout");
    }
    return { status: "ok" as const };
  }

  private async createSession(
    userId: string,
    deviceId: string | null,
    metadata: PlatformRequestContext,
    securityMode: PlatformSecurityMode
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const now = new Date();
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const refreshToken = makeRefreshToken(sessionId, familyId);
    const session = await this.prisma.platformSession.create({
      data: {
        absoluteExpiresAt: new Date(now.getTime() + absoluteTtlMs),
        authMethods: securityMode === "required" ? ["pwd", "webauthn", "device_posture"] : ["pwd"],
        authenticatedAt: now,
        deviceId,
        id: sessionId,
        lastActivityAt: now,
        postureCheckedAt: securityMode === "required" ? now : null,
        refreshFamilyId: familyId,
        refreshTokenExpiresAt: new Date(now.getTime() + absoluteTtlMs),
        refreshTokenHash: digestPlatformValue(refreshToken),
        securityMode,
        userId
      }
    });
    await this.audit.record("login_complete", "success", metadata, { deviceId, sessionId, userId });
    return {
      user: toAuthUser(user),
      tokens: {
        accessToken: await this.issueAccessToken(
          user,
          session.id,
          deviceId,
          securityMode === "required" ? now : null,
          securityMode
        ),
        refreshToken,
        tokenType: "Bearer" as const
      }
    };
  }

  private issueAccessToken(
    user: { email: string; id: string; sessionVersion: number },
    sessionId: string,
    deviceId: string | null,
    postureCheckedAt: Date | null,
    securityMode: PlatformSecurityMode
  ) {
    const payload: PlatformJwtPayload = {
      sessionKind: "platform",
      amr: securityMode === "required" ? ["pwd", "webauthn", "device_posture"] : ["pwd"],
      authTime: new Date().toISOString(),
      email: user.email,
      platformAccess: { permissions: [...PLATFORM_PERMISSIONS], role: "super_admin", securityMode },
      platformDeviceId: deviceId ?? undefined,
      postureCheckedAt: postureCheckedAt?.toISOString(),
      sessionVersion: user.sessionVersion,
      sid: sessionId,
      sub: user.id
    };
    return this.jwt.signAsync(payload, { expiresIn: "5m" });
  }

  private async assertPosture(
    deviceId: string,
    externalDeviceId: string,
    metadata: PlatformRequestMetadata,
    allowOutageGrace: boolean,
    lastGood?: Date
  ) {
    if (lastGood && Date.now() - lastGood.getTime() <= postureFreshMs) return lastGood;
    try {
      const posture = await this.assessPosture(externalDeviceId);
      if (!posture.compliant) {
        await this.prisma.platformSession.updateMany({
          where: { deviceId, status: "active" },
          data: { revokedAt: new Date(), status: "revoked" }
        });
        await this.audit.record("posture_check", "denied", metadata, {
          deviceId,
          reason: posture.failures.join(",")
        });
        this.throwNonCompliant(posture.failures);
      }
      await this.prisma.platformDevice.update({
        where: { id: deviceId },
        data: { lastCompliantAt: posture.checkedAt, lastSeenAt: new Date() }
      });
      return posture.checkedAt;
    } catch (error) {
      if (
        error instanceof DevicePostureUnavailableError &&
        allowOutageGrace &&
        lastGood &&
        Date.now() - lastGood.getTime() <= postureOutageGraceMs
      ) {
        return lastGood;
      }
      if (error instanceof ForbiddenException) throw error;
      throw new ForbiddenException({
        code: "provider_unavailable",
        message: "No se pudo verificar la seguridad del dispositivo."
      });
    }
  }

  private assessPosture(externalDeviceId: string) {
    return this.postureProvider.assess(externalDeviceId);
  }

  private throwNonCompliant(failures: string[]): never {
    throw new ForbiddenException({
      code: "device_non_compliant",
      failures,
      message: "El dispositivo no cumple la politica de seguridad."
    });
  }

  private async registrationOptions(
    user: { email: string; fullName: string; id: string },
    authenticators: Array<{ credentialId: string; transports: string[] }>
  ) {
    return generateRegistrationOptions({
      attestationType: "direct",
      authenticatorSelection: {
        authenticatorAttachment: "cross-platform",
        residentKey: "discouraged",
        userVerification: "required"
      },
      excludeCredentials: authenticators.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as AuthenticatorTransportFuture[]
      })),
      preferredAuthenticatorType: "securityKey",
      rpID: this.rpId(),
      rpName: this.config.get<string>("PLATFORM_WEBAUTHN_RP_NAME") ?? "Temis Platform",
      userDisplayName: user.fullName,
      userID: Buffer.from(user.id),
      userName: user.email
    });
  }

  private assertAllowedAaguid(aaguid: string) {
    const allowed = (this.config.get<string>("PLATFORM_WEBAUTHN_AAGUID_ALLOWLIST") ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(aaguid.toLowerCase())) {
      throw new ForbiddenException("El modelo de llave FIDO2 no esta autorizado.");
    }
  }

  private assertActiveSession(
    session: {
      absoluteExpiresAt: Date;
      device: { certificateFingerprint: string; status: string } | null;
      lastActivityAt: Date;
      refreshTokenExpiresAt: Date;
      securityMode: PlatformSecurityMode;
      status: string;
    },
    metadata: PlatformRequestContext
  ) {
    const now = Date.now();
    if (
      session.status !== "active" ||
      session.securityMode !== this.securityMode.mode ||
      session.absoluteExpiresAt.getTime() <= now ||
      session.refreshTokenExpiresAt.getTime() <= now ||
      now - session.lastActivityAt.getTime() > idleTtlMs
    ) {
      throw new UnauthorizedException("Sesion de plataforma expirada o revocada.");
    }
    if (session.securityMode === "required") {
      const requiredMetadata = this.requireDevice(metadata);
      if (
        !session.device ||
        session.device.status !== "active" ||
        session.device.certificateFingerprint !== requiredMetadata.device.certificateFingerprint
      ) {
        throw new UnauthorizedException("Sesion de plataforma expirada o revocada.");
      }
    }
  }

  private async getSessionForPayload(
    payload: PlatformJwtPayload,
    metadata: PlatformRequestContext
  ) {
    if (!payload.sid) throw new UnauthorizedException();
    const session = await this.prisma.platformSession.findUnique({
      where: { id: payload.sid },
      include: { device: true }
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.securityMode !== payload.platformAccess?.securityMode ||
      (session.securityMode === "required" && session.deviceId !== payload.platformDeviceId)
    ) {
      throw new UnauthorizedException();
    }
    this.assertActiveSession(session, metadata);
    return session;
  }

  private assertFingerprint(
    transaction: { fingerprint: string },
    metadata: PlatformRequestMetadata
  ) {
    if (transaction.fingerprint !== metadata.device.certificateFingerprint) {
      throw new ForbiddenException("La verificacion debe completarse desde el mismo dispositivo.");
    }
  }

  private requireDevice(metadata: PlatformRequestContext): PlatformRequestMetadata {
    if (!metadata.device) {
      throw new ForbiddenException({
        code: "device_not_enrolled",
        message: "Se requiere un dispositivo administrado y autenticado."
      });
    }
    return { ...metadata, device: metadata.device };
  }

  private assertSecurityMode(expected: PlatformSecurityMode) {
    if (this.securityMode.mode !== expected) {
      throw new ConflictException({
        code: "security_mode_mismatch",
        message: "El metodo de verificacion no corresponde al modo de seguridad activo."
      });
    }
  }

  private rpId() {
    const value = this.config.get<string>("PLATFORM_WEBAUTHN_RP_ID");
    if (!value) throw new Error("PLATFORM_WEBAUTHN_RP_ID must be configured.");
    return value;
  }

  private origins() {
    const values = (this.config.get<string>("PLATFORM_WEBAUTHN_ORIGINS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!values.length) throw new Error("PLATFORM_WEBAUTHN_ORIGINS must be configured.");
    return values;
  }
}

function makeRefreshToken(sessionId: string, familyId: string) {
  return `plat_${sessionId}.${familyId}.${randomBytes(32).toString("base64url")}`;
}

function parseRefreshToken(value: string) {
  const match = /^plat_([0-9a-f-]{36})\.([0-9a-f-]{36})\.[A-Za-z0-9_-]{40,}$/.exec(value);
  return match ? { familyId: match[2]!, sessionId: match[1]! } : null;
}

function toAuthUser(user: {
  avatarUrl: string | null;
  email: string;
  fullName: string;
  id: string;
  phone: string | null;
  status: string;
}) {
  return {
    avatarUrl: user.avatarUrl,
    email: user.email,
    fullName: user.fullName,
    id: user.id,
    phone: user.phone,
    status: user.status
  };
}

export { stepUpFreshMs };
