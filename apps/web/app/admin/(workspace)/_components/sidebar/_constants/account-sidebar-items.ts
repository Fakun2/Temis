import type { AdminNavItem } from "../../../_types/admin";
import {
  AnimatedAccountAiIcon,
  AnimatedAccountArchiveIcon,
  AnimatedAccountOrganizationIcon,
  AnimatedAccountPlanIcon,
  AnimatedAccountPreferencesIcon,
  AnimatedAccountProfileIcon,
  AnimatedAccountSecurityIcon
} from "../animated-library-icon";

export const accountSidebarItems = [
  {
    href: "/admin/account#profile",
    icon: AnimatedAccountProfileIcon,
    iconAnimation: "account-profile",
    label: "Mi perfil"
  },
  {
    href: "/admin/account#security",
    icon: AnimatedAccountSecurityIcon,
    iconAnimation: "account-security",
    label: "Seguridad"
  },
  {
    href: "/admin/account?view=ia",
    icon: AnimatedAccountAiIcon,
    iconAnimation: "account-ai",
    label: "IA"
  },
  {
    href: "/admin/account#cases-import",
    icon: AnimatedAccountArchiveIcon,
    iconAnimation: "account-archive",
    label: "Expedientes"
  },
  {
    href: "/admin/account#studio",
    icon: AnimatedAccountOrganizationIcon,
    iconAnimation: "account-organization",
    label: "Organizacion"
  },
  {
    href: "/admin/account#membership",
    icon: AnimatedAccountPlanIcon,
    iconAnimation: "account-plan",
    label: "Plan"
  },
  {
    href: "/admin/account#notifications",
    icon: AnimatedAccountPreferencesIcon,
    iconAnimation: "account-preferences",
    label: "Preferencias"
  }
] satisfies AdminNavItem[];
