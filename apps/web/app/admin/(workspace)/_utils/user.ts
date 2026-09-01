import type { BogaapSession } from "@/lib/auth/session";

export function getInitials(name: string) {
  const [first = "B", second = ""] = name.trim().split(/\s+/);
  return `${first[0] ?? "B"}${second[0] ?? ""}`.toUpperCase();
}

export function getSessionDisplayUser(session: BogaapSession | null) {
  const user = session?.user;

  return {
    avatarUrl: typeof user?.avatarUrl === "string" ? user.avatarUrl : null,
    displayName: user?.fullName || "Usuario BOGAP",
    email: user?.email || "workspace@bogaap"
  };
}
