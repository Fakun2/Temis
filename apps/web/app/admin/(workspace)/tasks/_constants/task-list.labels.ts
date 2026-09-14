import type { TaskBoardSortKey } from "../../cases/_types/cases.types";
import type { TasksTableColumn } from "../_types/task-list.types";

export const taskColumnLabels: Record<TasksTableColumn, string> = {
  assignedTo: "Asignado",
  case: "Expediente",
  client: "Cliente",
  endDate: "Vencimiento",
  name: "Descripcion",
  status: "Estado"
};

export const taskBoardPropertyLabels: Record<TasksTableColumn | "notes", string> = {
  assignedTo: "Asignado",
  case: "Expediente",
  client: "Cliente",
  endDate: "Vencimiento",
  name: "Tarea",
  notes: "Observaciones",
  status: "Estado"
};

export const taskBoardSortLabels: Record<TaskBoardSortKey, string> = {
  assignedTo: "Asignado",
  case: "Expediente",
  client: "Cliente",
  createdAt: "Fecha de creacion",
  endDate: "Vencimiento",
  name: "Tarea",
  status: "Estado"
};
