import type { AuthUserDto, TokenPairDto } from "@temis/api-client";
import { decodeJwtPayload } from "./jwt";

const sessionStorageKey = "bogaap.session";
const sessionListeners = new Set<() => void>();
let currentSession: TemisSession | null = null;

export type TemisSession = {
  tenantAccess?: SessionTenantAccess[];
  tokens?: Partial<TokenPairDto>;
  user: AuthUserDto;
};

export type SessionTenantAccess = {
  tenantId: string;
  role: string;
  permissions: string[];
};

export type SessionJwtPayload = {
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

export function saveSession(session: TemisSession) {
  const tenantAccess =
    session.tenantAccess ??
    (session.tokens?.accessToken ? decodeJwtPayload(session.tokens.accessToken).tenantAccess : []);

  currentSession = {
    tenantAccess,
    user: session.user
  };
  removeStoredSession();
  notifySessionListeners();
}

export function updateSessionUser(user: SessionUserPatch) {
  if (!currentSession) {
    return;
  }

  currentSession = {
    ...currentSession,
    user: {
      ...currentSession.user,
      ...user
    } as TemisSession["user"]
  };
  notifySessionListeners();
}

export function readSession(): TemisSession | null {
  removeStoredSession();
  return currentSession;
}

export function clearSession() {
  currentSession = null;
  removeStoredSession();
  notifySessionListeners();
}

export function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function notifySessionListeners() {
  for (const listener of sessionListeners) {
    listener();
  }
}

function removeStoredSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(sessionStorageKey);
  }
}

export function readAccessTokenPayload(accessToken: string): SessionJwtPayload {
  return decodeJwtPayload(accessToken);
}

export function hasTenantAccess(session: TemisSession) {
  return getSessionTenantAccess(session).length > 0;
}

export function getSessionTenantAccess(session: TemisSession | null) {
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

export function sessionHasPermission(session: TemisSession | null, permission: string) {
  return getSessionTenantAccess(session)[0]?.permissions.includes(permission) ?? false;
}
