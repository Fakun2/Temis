import {
  BarChart3,
  CircleDollarSign,
  Gavel,
  Home,
  Tags,
  UsersRound
} from "lucide-react";
import type { AdminNavSection, AdminPageTitle } from "../_types/admin";
import {
  AnimatedAiStarsIcon,
  AnimatedCalendarIcon,
  AnimatedCashboxIcon,
  AnimatedCasesIcon,
  AnimatedLibraryIcon,
  AnimatedSettingsIcon,
  AnimatedStaffIcon
} from "../_components/sidebar/animated-library-icon";

export const adminNavSections: AdminNavSection[] = [
  {
    title: "Navegacion",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: Home,
        requiredPermissions: ["admin:access"],
        shortcut: { keys: ["a", "d"], label: "A Luego D" }
      },
      {
        href: "/admin/clients",
        label: "Clientes",
        icon: UsersRound,
        requiredPermissions: ["clients:read"]
      },
      {
        href: "/admin/cases",
        iconAnimation: "cases",
        label: "Expedientes",
        icon: AnimatedCasesIcon,
        requiredPermissions: ["cases:read"],
        shortcut: { keys: ["a", "e"], label: "A Luego E" }
      },
      {
        href: "/admin/calendar",
        iconAnimation: "calendar",
        label: "Calendario",
        icon: AnimatedCalendarIcon,
        requiredPermissions: ["cases:read"],
        shortcut: { keys: ["a", "c"], label: "A Luego C" }
      },
      {
        href: "/admin/library",
        iconAnimation: "library",
        label: "Biblioteca",
        icon: AnimatedLibraryIcon,
        requiredPermissions: ["documents:read"],
        shortcut: { keys: ["a", "b"], label: "A Luego B" }
      },
      {
        href: "/admin/staff",
        iconAnimation: "staff",
        label: "Staff",
        icon: AnimatedStaffIcon,
        requiredPermissions: ["staff:read"],
        shortcut: { keys: ["a", "s"], label: "A Luego S" }
      },
      {
        href: "/admin/cashbox",
        iconAnimation: "cashbox",
        label: "Caja",
        icon: AnimatedCashboxIcon,
        requiredPermissions: ["finance:read"],
        shortcut: { keys: ["a", "j"], label: "A Luego J" },
        children: [
          {
            href: "/admin/currencies",
            label: "Monedas",
            icon: CircleDollarSign,
            requiredPermissions: ["currencies:read"],
            shortcut: { keys: ["a", "m"], label: "A Luego M" }
          },
          {
            href: "/admin/categories",
            label: "Categorias",
            icon: Tags,
            requiredPermissions: ["categories:read"],
            shortcut: { keys: ["a", "g"], label: "A Luego G" }
          },
          {
            href: "/admin/reports",
            label: "Reportes",
            icon: BarChart3,
            requiredPermissions: ["finance:read"],
            status: "soon"
          }
        ]
      },
      {
        href: "/admin/legal-catalogs",
        label: "Catalogos legales",
        icon: Gavel,
        requiredPermissions: ["forums:read", "provinces:read"],
        permissionMode: "any",
        shortcut: { keys: ["a", "l"], label: "A Luego L" }
      },
      {
        href: "/admin/ai",
        iconAnimation: "ai-stars",
        label: "IA",
        icon: AnimatedAiStarsIcon,
        requiredPermissions: ["ai:case_chat"],
        shortcut: { keys: ["a", "i"], label: "A Luego I" }
      },
      {
        href: "/admin/roles",
        icon: AnimatedSettingsIcon,
        iconAnimation: "settings",
        label: "Roles",
        requiredPermissions: ["roles:read"],
        shortcut: { keys: ["a", "r"], label: "A Luego R" }
      }
    ]
  }
];

export const adminPageTitles: AdminPageTitle[] = [
  { href: "/admin/account", title: "Cuenta" },
  { href: "/admin/ai", title: "IA" },
  { href: "/admin/roles", title: "Roles" },
  { href: "/admin/legal-catalogs", title: "Catalogos legales" },
  { href: "/admin/currencies", title: "Monedas" },
  { href: "/admin/categories", title: "Categorias" },
  { href: "/admin/staff", title: "Staff" },
  { href: "/admin/cases", title: "Expedientes" },
  { href: "/admin/calendar", title: "Calendario" },
  { href: "/admin/library", title: "Biblioteca" },
  { href: "/admin/clients", title: "Clientes" },
  { href: "/admin/cashbox", title: "Caja" },
  { href: "/admin/reports", title: "Reportes" },
  { href: "/admin/settings", title: "Settings" },
  { href: "/admin/help", title: "Help Center" },
  { href: "/admin", title: "Dashboard" }
];
