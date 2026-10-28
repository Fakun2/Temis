import { BarChart3, BellRing, Home, Newspaper, ShieldCheck, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SuperAdminNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  permission: string;
};

export const superAdminNavigation: SuperAdminNavItem[] = [
  { href: "/superadmin", icon: Home, label: "Inicio", permission: "platform:access" },
  {
    href: "/superadmin/announcements",
    icon: BellRing,
    label: "Comunicados",
    permission: "platform:announcements:manage"
  },
  {
    href: "/superadmin/newsletters",
    icon: Newspaper,
    label: "Newsletter",
    permission: "platform:announcements:manage"
  },
  {
    href: "/superadmin/users",
    icon: Users,
    label: "Usuarios",
    permission: "platform:users:read"
  },
  {
    href: "/superadmin/observability",
    icon: BarChart3,
    label: "Observabilidad",
    permission: "platform:observability:read"
  },
  {
    href: "/superadmin/account",
    icon: UserRound,
    label: "Cuenta",
    permission: "platform:account:self_manage"
  },
  {
    href: "/superadmin/security",
    icon: ShieldCheck,
    label: "Seguridad",
    permission: "platform:account:self_manage"
  }
];

export function isSuperAdminRouteActive(pathname: string, href: string) {
  return pathname === href || (href !== "/superadmin" && pathname.startsWith(`${href}/`));
}

export function getSuperAdminPageTitle(pathname: string) {
  return (
    superAdminNavigation.find((item) => isSuperAdminRouteActive(pathname, item.href))?.label ??
    "Panel global"
  );
}
