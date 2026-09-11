import "server-only";

import { randomUUID } from "node:crypto";
import type { AuthUserDto } from "@temis/api-client";
import { decodeJwtPayload } from "./jwt";
import type { SessionTenantAccess } from "./session";
import { decodeSessionCookie, encodeSessionCookie } from "./session-cookie";
import type { TokenPair } from "./token-types";
import { sessionMaxAgeSeconds } from "./cookies";

type StoredAuthSession = {
  tenantAccess: SessionTenantAccess[];
  tokens: TokenPair;
  updatedAt: string;
  user: AuthUserDto;
};

declare global {
  var temisAuthSessions: Map<string, StoredAuthSession> | undefined;
  var temisAuthRedis:
    | {
        del(key: string): Promise<unknown>;
        get(key: string): Promise<string | null>;
        set(key: string, value: string, mode: "EX", seconds: number): Promise<unknown>;
      }
    | undefined;
}

const redisKeyPrefix = "bogaap:web:auth-session:";

export async function createAuthSession(input: { tokens: TokenPair; user: AuthUserDto }) {
  const sessionId = randomUUID();
  const payload = decodeJwtPayload(input.tokens.accessToken);
  const session: StoredAuthSession = {
    tenantAccess: payload.tenantAccess,
    tokens: input.tokens,
    updatedAt: new Date().toISOString(),
    user: input.user
  };

  await writeStoredSession(sessionId, session);

  return {
    cookieValue: encodeSessionCookie({ sessionId }),
    session
  };
}

export async function readAuthSessionFromCookie(cookieValue?: string | null) {
  const parsed = decodeSessionCookie(cookieValue);
  if (!parsed) {
    return null;
  }

  const session = await readStoredSession(parsed.sessionId);
  if (!session) {
    return null;
  }

  return {
    cookieValue: encodeSessionCookie({ sessionId: parsed.sessionId }),
    session,
    sessionId: parsed.sessionId
  };
}

export async function updateAuthSessionTokens(sessionId: string, tokens: TokenPair) {
  const currentSession = await readStoredSession(sessionId);
  if (!currentSession) {
    return null;
  }

  const payload = decodeJwtPayload(tokens.accessToken);
  const session: StoredAuthSession = {
    ...currentSession,
    tenantAccess: payload.tenantAccess,
    tokens,
    updatedAt: new Date().toISOString()
  };

  await writeStoredSession(sessionId, session);

  return {
    cookieValue: encodeSessionCookie({ sessionId }),
    session
  };
}

export async function deleteAuthSessionFromCookie(cookieValue?: string | null) {
  const parsed = decodeSessionCookie(cookieValue);
  if (!parsed) {
    return;
  }

  await deleteStoredSession(parsed.sessionId);
}

async function readStoredSession(sessionId: string) {
  const redis = await getRedisClient();
  if (redis) {
    const value = await redis.get(toRedisKey(sessionId));
    return value ? (JSON.parse(value) as StoredAuthSession) : null;
  }

  return getMemoryStore().get(sessionId) ?? null;
}

async function writeStoredSession(sessionId: string, session: StoredAuthSession) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(toRedisKey(sessionId), JSON.stringify(session), "EX", sessionMaxAgeSeconds);
    return;
  }

  getMemoryStore().set(sessionId, session);
}

async function deleteStoredSession(sessionId: string) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.del(toRedisKey(sessionId));
    return;
  }

  getMemoryStore().delete(sessionId);
}

function getMemoryStore() {
  globalThis.temisAuthSessions ??= new Map<string, StoredAuthSession>();
  return globalThis.temisAuthSessions;
}

async function getRedisClient() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (globalThis.temisAuthRedis) {
    return globalThis.temisAuthRedis;
  }

  const { default: Redis } = await import("ioredis");
  globalThis.temisAuthRedis = new Redis(redisUrl, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1
  });

  return globalThis.temisAuthRedis;
}

function toRedisKey(sessionId: string) {
  return `${redisKeyPrefix}${sessionId}`;
}
