import {
  Banknote,
  BriefcaseBusiness,
  Bot,
  CalendarDays,
  CircleDollarSign,
  FileText,
  FilePlus2,
  FolderOpen,
  Gavel,
  Home,
  Landmark,
  ShieldCheck,
  Settings,
  Tags
} from "lucide-react";
import type { AdminCommandSection } from "../_types/admin";

export const adminCommandSections: AdminCommandSection[] = [
  {
    title: "Acciones rapidas",
    items: [
      {
        href: "/admin/cases",
        label: "Nuevo expediente",
        icon: FilePlus2,
        requiredPermissions: ["cases:create"],
        shortcut: "N"
      },
      {
        href: "/admin/library",
        label: "Subir documento",
        icon: FileText,
        requiredPermissions: ["documents:write"]
      },
      {
        href: "/admin/cashbox",
        label: "Nuevo ingreso",
        icon: Banknote,
        requiredPermissions: ["finance:create"]
      },
      {
        href: "/admin/cashbox",
        label: "Nuevo egreso",
        icon: CircleDollarSign,
        requiredPermissions: ["finance:create"]
      },
      {
        href: "/admin/categories",
        label: "Nueva categoria",
        icon: Tags,
        requiredPermissions: ["categories:create"]
      }
    ]
  },
  {
    title: "Navegacion",
    items: [
      {
        href: "/admin",
        label: "Ir a Dashboard",
        icon: Home,
        requiredPermissions: ["admin:access"]
      },
      {
        href: "/admin/cases",
        label: "Ir a Expedientes",
        icon: BriefcaseBusiness,
        requiredPermissions: ["cases:read"]
      },
      {
        href: "/admin/calendar",
        label: "Ir a Calendario",
        icon: CalendarDays,
        requiredPermissions: ["cases:read"]
      },
      {
        href: "/admin/library",
        label: "Ir a Biblioteca",
        icon: FolderOpen,
        requiredPermissions: ["documents:read"]
      },
      {
        href: "/admin/staff",
        label: "Ir a Staff",
        icon: Settings,
        requiredPermissions: ["staff:read"]
      },
      {
        href: "/admin/roles",
        label: "Ir a Roles",
        icon: ShieldCheck,
        requiredPermissions: ["roles:read"]
      },
      {
        href: "/admin/legal-catalogs",
        label: "Ir a Catalogos legales",
        icon: Gavel,
        requiredPermissions: ["forums:read", "provinces:read"],
        permissionMode: "any"
      },
      {
        href: "/admin/categories",
        label: "Ir a Categorias",
        icon: Tags,
        requiredPermissions: ["categories:read"]
      },
      {
        href: "/admin/currencies",
        label: "Ir a Monedas",
        icon: Landmark,
        requiredPermissions: ["currencies:read"]
      },
      {
        href: "/admin/cashbox",
        label: "Ir a Ingresos / Egresos",
        icon: Banknote,
        requiredPermissions: ["finance:read"]
      },
      {
        href: "/admin/ai",
        label: "Ir a IA",
        icon: Bot,
        requiredPermissions: ["ai:case_chat"]
      }
    ]
  }
];
