import type { TemisSession } from "@/lib/auth/session";

export function getInitials(name: string) {
  const [first = "B", second = ""] = name.trim().split(/\s+/);
  return `${first[0] ?? "B"}${second[0] ?? ""}`.toUpperCase();
}

export function getSessionDisplayUser(session: TemisSession | null) {
  const user = session?.user;

  return {
    avatarUrl: typeof user?.avatarUrl === "string" ? user.avatarUrl : null,
    displayName: user?.fullName || "Usuario TEMIS",
    email: user?.email || "workspace@temis"
  };
}
