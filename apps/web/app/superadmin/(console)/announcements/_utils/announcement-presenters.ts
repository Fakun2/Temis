export const announcementCategoryLabel = {
  general: "General",
  maintenance: "Mantenimiento",
  deployment: "Despliegue",
  incident: "Incidente"
} as const;

export const announcementSeverityLabel = {
  info: "Informativa",
  warning: "Advertencia",
  critical: "Crítica"
} as const;

export const announcementLifecycleLabel = {
  draft: "Borrador",
  scheduled: "Programado",
  active: "Activo",
  expired: "Vencido",
  cancelled: "Cancelado"
} as const;

export function formatAnnouncementDateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(value)
      )
    : "Sin definir";
}
