import type { NotionPropertyMapping, NotionStatusMapping } from "../../_api/notion-integration.api";

export const defaultPropertyMapping: NotionPropertyMapping = {
  assignee: "",
  case: "",
  dueDate: "Fecha objetivo",
  notes: "Notas",
  status: "Status",
  title: "Name"
};

export const defaultStatusMapping: NotionStatusMapping = {
  "Por hacer": "pending",
  Pending: "pending",
  "To do": "pending",
  "En curso": "in_progress",
  "In progress": "in_progress",
  Finalizado: "completed",
  Done: "completed",
  Completed: "completed",
  Cancelado: "cancelled",
  Cancelled: "cancelled"
};

export function formatNotionDateTime(value: string | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function getNotionCallbackError(error: string | null, description: string | null) {
  if (!error) {
    return null;
  }

  return description
    ? `Notion rechazo la conexion: ${description}`
    : `Notion rechazo la conexion (${error}).`;
}
