import type { AuthUserDto, TokenPairDto } from "@temis/api-client";
import { decodeJwtPayload } from "./jwt";
import { createSessionStore } from "./session-store";

const sessionStorageKey = "bogaap.session";

export type TenantSession = {
  tenantAccess?: SessionTenantAccess[];
  tokens?: Partial<TokenPairDto>;
  user: AuthUserDto;
};

export type TenantAuthContext = {
  session: TenantSession | null;
  clear: () => void;
};

export type SessionTenantAccess = {
  tenantId: string;
  role: string;
  permissions: string[];
};

export type TenantSessionJwtPayload = {
  sessionKind: "tenant";
  sub?: string;
  email?: string;
  sessionVersion?: number;
  tenantAccess: SessionTenantAccess[];
};

export type SessionUserPatch = {
  avatarUrl?: string | null;
  email?: string;
  fullName?: string;
  phone?: string | null;
  status?: string;
};

const sessionStore = createSessionStore<TenantSession>();

export function saveSession(session: TenantSession) {
  const tenantAccess =
    session.tenantAccess ??
    (session.tokens?.accessToken
      ? (() => {
          const payload = decodeJwtPayload(session.tokens.accessToken);
          return payload?.sessionKind === "tenant" ? payload.tenantAccess : [];
        })()
      : []);

  sessionStore.save({
    tenantAccess,
    user: session.user
  });
  removeStoredSession();
}

export function updateSessionUser(user: SessionUserPatch) {
  sessionStore.update((session) => ({
    ...session,
    user: {
      ...session.user,
      ...user
    } as TenantSession["user"]
  }));
}

export function readSession(): TenantSession | null {
  removeStoredSession();
  return sessionStore.read();
}

export function clearSession() {
  sessionStore.clear();
  removeStoredSession();
}

export function subscribeSession(listener: () => void) {
  return sessionStore.subscribe(listener);
}

function removeStoredSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(sessionStorageKey);
  }
}

export function readAccessTokenPayload(accessToken: string): TenantSessionJwtPayload {
  const payload = decodeJwtPayload(accessToken);
  if (!payload || payload.sessionKind !== "tenant") {
    throw new Error("Token tenant invalido.");
  }
  return payload;
}

export function hasTenantAccess(session: TenantSession) {
  return getSessionTenantAccess(session).length > 0;
}

export function getSessionTenantAccess(session: TenantSession | null) {
  if (!session) {
    return [];
  }

  if (session.tenantAccess) {
    return session.tenantAccess;
  }

  return session.tokens?.accessToken
    ? readAccessTokenPayload(session.tokens.accessToken).tenantAccess
    : [];
}

export function sessionHasPermission(session: TenantSession | null, permission: string) {
  return getSessionTenantAccess(session)[0]?.permissions.includes(permission) ?? false;
}
