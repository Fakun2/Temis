import type { TokenPairDto } from "@temis/api-client";
import { createSessionStore } from "./session-store";

export type SuperAdminAccess = {
  role: "super_admin";
  permissions: string[];
  securityMode: "disabled" | "required";
};

export type SuperAdminSession = {
  platformAccess: SuperAdminAccess;
  tokens?: Partial<TokenPairDto>;
  user: SuperAdminUser;
};

export type SuperAdminUser = {
  avatarUrl?: string | null;
  email: string;
  fullName: string;
  id: string;
  phone?: string | null;
  status: string;
};

export type SuperAdminAuthContext = {
  session: SuperAdminSession | null;
  clear: () => void;
};

export type PlatformSessionJwtPayload = {
  sessionKind: "platform";
  sub?: string;
  email?: string;
  sessionVersion?: number;
  platformAccess: SuperAdminAccess;
  sid?: string;
  platformDeviceId?: string;
  amr?: string[];
  authTime?: string;
  postureCheckedAt?: string;
};

const sessionStore = createSessionStore<SuperAdminSession>();

export function saveSuperAdminSession(session: SuperAdminSession) {
  sessionStore.save({ platformAccess: session.platformAccess, user: session.user });
}

export function readSuperAdminSession() {
  return sessionStore.read();
}

export function clearSuperAdminSession() {
  sessionStore.clear();
}

export function updateSuperAdminSessionUser(user: {
  avatarUrl?: string | null;
  email?: string;
  fullName?: string;
  phone?: string | null;
  status?: string;
}) {
  sessionStore.update((session) => ({
    ...session,
    user: { ...session.user, ...user }
  }));
}

export function subscribeSuperAdminSession(listener: () => void) {
  return sessionStore.subscribe(listener);
}
