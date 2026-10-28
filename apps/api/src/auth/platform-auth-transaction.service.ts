import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.constants";
import type { PlatformRequestContext } from "./platform-device-identity";
import { digestPlatformValue } from "./platform-auth.crypto";

const transactionTtlSeconds = 5 * 60;

export type PlatformLoginTransaction = {
  challenge: string;
  deviceId: string;
  fingerprint: string;
  kind: "login";
  userId: string;
};

export type PlatformEnrollmentTransaction = {
  bootstrapTokenId: string;
  challenge: string;
  deviceName: string;
  externalDeviceId: string;
  fingerprint: string;
  kind: "enrollment";
  registeredAuthenticatorIds: string[];
  userId: string;
};

export type PlatformStepUpTransaction = {
  challenge: string;
  fingerprint: string;
  kind: "step_up";
  sessionId: string;
  userId: string;
};

export type PlatformSecurityTransaction =
  | PlatformEnrollmentTransaction
  | PlatformLoginTransaction
  | PlatformStepUpTransaction;

@Injectable()
export class PlatformAuthTransactionService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertRateLimit(email: string, metadata: PlatformRequestContext) {
    const bucket = Math.floor(Date.now() / (15 * 60_000));
    const identifiers = [
      `email:${digestPlatformValue(email.toLowerCase())}`,
      `ip:${digestPlatformValue(metadata.ipAddress)}`,
      ...(metadata.device
        ? [`device:${digestPlatformValue(metadata.device.certificateFingerprint)}`]
        : [])
    ];

    for (const identifier of identifiers) {
      const key = `temis:platform-auth-limit:${bucket}:${identifier}`;
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 30 * 60);
      if (count > 5) {
        throw new ForbiddenException("Acceso temporalmente bloqueado por seguridad.");
      }
    }
  }

  async write(id: string, transaction: PlatformSecurityTransaction) {
    await this.redis.set(this.key(id), JSON.stringify(transaction), "EX", transactionTtlSeconds);
  }

  async read<TKind extends PlatformSecurityTransaction["kind"]>(id: string, kind: TKind) {
    const value = await this.redis.get(this.key(id));
    if (!value) throw new UnauthorizedException("La verificacion expiro.");

    const transaction = JSON.parse(value) as PlatformSecurityTransaction;
    if (transaction.kind !== kind) throw new UnauthorizedException("Verificacion invalida.");
    return transaction as Extract<PlatformSecurityTransaction, { kind: TKind }>;
  }

  async consume<TKind extends PlatformSecurityTransaction["kind"]>(id: string, kind: TKind) {
    const transaction = await this.read(id, kind);
    await this.delete(id);
    return transaction;
  }

  async delete(id: string) {
    await this.redis.del(this.key(id));
  }

  private key(id: string) {
    return `temis:platform-auth-transaction:${id}`;
  }
}
