import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.constants";

const requestCooldownSeconds = 60;
const requestWindowSeconds = 60 * 60;
const requestMaximumPerIp = 10;
const confirmationWindowSeconds = 60 * 60;
const confirmationMaximumPerIp = 20;

const incrementWithTtlScript = `
  local value = redis.call('INCR', KEYS[1])
  if value == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return value
`;

@Injectable()
export class PasswordRecoveryRateLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertCanConfirm(ip: string) {
    await this.assertWithinWindow(
      this.key("confirm", ip),
      confirmationMaximumPerIp,
      confirmationWindowSeconds
    );
  }

  async assertCanRequest(email: string, ip: string) {
    try {
      const cooldownApplied = await this.redis.set(
        this.key("cooldown", email),
        "1",
        "EX",
        requestCooldownSeconds,
        "NX"
      );
      if (cooldownApplied !== "OK") {
        throw this.tooManyRequests("Espera un minuto antes de solicitar otro codigo.");
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new ServiceUnavailableException("El servicio de recuperacion no esta disponible.");
    }

    await this.assertWithinWindow(
      this.key("request", ip),
      requestMaximumPerIp,
      requestWindowSeconds
    );
  }

  private async assertWithinWindow(key: string, maximum: number, ttlSeconds: number) {
    try {
      const count = Number(await this.redis.eval(incrementWithTtlScript, 1, key, ttlSeconds));
      if (count > maximum) {
        throw this.tooManyRequests("Demasiados intentos. Intenta nuevamente mas tarde.");
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new ServiceUnavailableException("El servicio de recuperacion no esta disponible.");
    }
  }

  private key(kind: string, value: string) {
    const digest = createHash("sha256").update(value).digest("hex");
    return `auth:password-recovery:${kind}:${digest}`;
  }

  private tooManyRequests(message: string) {
    return new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
