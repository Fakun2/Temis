import {
  Banknote,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CircleHelp,
  CircleDollarSign,
  FolderOpen,
  Gavel,
  Home,
  Scale,
  Settings,
  Tags,
  UsersRound
} from "lucide-react";
import type { AdminNavSection, AdminPageTitle } from "../_types/admin";

export const adminNavSections: AdminNavSection[] = [
  {
    title: "Navegacion",
    items: [
      { href: "/admin", label: "Dashboard", icon: Home, requiredPermissions: ["admin:access"] },
      {
        href: "/admin/clients",
        label: "Clientes",
        icon: UsersRound,
        requiredPermissions: ["clients:read"]
      },
      {
        href: "/admin/cases",
        label: "Expedientes",
        icon: BriefcaseBusiness,
        requiredPermissions: ["cases:read"]
      },
      {
        href: "/admin/calendar",
        label: "Calendario",
        icon: CalendarDays,
        requiredPermissions: ["cases:read"]
      },
      {
        href: "/admin/library",
        label: "Biblioteca",
        icon: FolderOpen,
        requiredPermissions: ["documents:read"]
      },
      {
        href: "/admin/staff",
        label: "Staff",
        icon: Scale,
        requiredPermissions: ["staff:read"]
      },
      {
        href: "/admin/cashbox",
        label: "Caja",
        icon: Banknote,
        requiredPermissions: ["finance:read"],
        children: [
          {
            href: "/admin/currencies",
            label: "Monedas",
            icon: CircleDollarSign,
            requiredPermissions: ["currencies:read"]
          },
          {
            href: "/admin/categories",
            label: "Categorias",
            icon: Tags,
            requiredPermissions: ["categories:read"]
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
        href: "/admin/roles",
        icon: Settings,
        label: "Sistema",
        requiredPermissions: ["roles:read"],
        children: [
          {
            href: "/admin/legal-catalogs",
            label: "Catalogos legales",
            icon: Gavel,
            requiredPermissions: ["forums:read", "provinces:read"],
            permissionMode: "any"
          },
          {
            href: "/admin/ai",
            label: "IA",
            icon: Bot,
            requiredPermissions: ["ai:case_chat"]
          },
          {
            href: "/admin/settings",
            label: "Settings",
            icon: Settings,
            requiredPermissions: ["tenants:manage"],
            status: "soon"
          },
          {
            href: "/admin/help",
            label: "Help Center",
            icon: CircleHelp,
            requiredPermissions: ["admin:access"],
            status: "soon"
          }
        ]
      }
    ]
  }
];

export const adminPageTitles: AdminPageTitle[] = [
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
