import type { AdminQuickLink } from "../_types/admin";

export const adminQuickLinks: AdminQuickLink[] = [
  {
    href: "/admin/cases",
    label: "Abrir casos",
    description: "Expedientes, estados y proximos pasos"
  },
  {
    href: "/admin/clients",
    label: "Ver clientes",
    description: "Personas, sociedades y contactos clave"
  },
  {
    href: "/admin/staff",
    label: "Gestionar staff",
    description: "Usuarios habilitados y permisos"
  }
];

export const adminWorkspaceStatus = [
  "Tenant activo",
  "Onboarding completo",
  "Sesion local disponible",
  "Theme TEMIS aplicado"
];

export const adminSurfaceClassName = "bg-card text-card-foreground";
export const adminSurfaceMutedClassName = "text-muted-foreground";
export const adminSurfacePrimaryClassName = "text-foreground";
export const adminPrimaryActionButtonClassName =
  "bg-btn-primary text-btn-primary-foreground hover:bg-btn-primary/85 disabled:bg-btn-primary/60 disabled:text-btn-primary-foreground";
