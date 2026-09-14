import {
  BarChart3,
  BarChartHorizontal,
  CalendarDays,
  Columns3,
  Eye,
  LayoutGrid,
  LineChart,
  List,
  PieChart,
  Table2,
  Text,
  Users,
  Zap
} from "lucide-react";
import type {
  TasksBoardViewOption,
  TasksChartGroupOption,
  TasksChartSortOption,
  TasksChartTypeOption,
  TasksKanbanCardSizeOption,
  TasksOpenTaskOption,
  TasksSortOption,
  TasksVisiblePropertyOption
} from "./settings-types";

export const boardViewOptions = [
  { icon: Table2, label: "Tabla", value: "table" },
  { icon: Columns3, label: "Tablero", value: "kanban" },
  { icon: CalendarDays, label: "Calendario", value: "calendar" },
  { icon: BarChart3, label: "Grafico", value: "bar_chart" }
] satisfies Array<TasksBoardViewOption & { icon: typeof Table2 }>;

export const chartTypeOptions = [
  { icon: BarChart3, label: "Vertical", value: "vertical_bar" },
  { icon: BarChartHorizontal, label: "Horizontal", value: "horizontal_bar" },
  { icon: LineChart, label: "Linea", value: "line" },
  { icon: PieChart, label: "Torta", value: "pie" }
] satisfies Array<TasksChartTypeOption & { icon: typeof BarChart3 }>;

export const chartGroupOptions = [
  { icon: Zap, label: "Estado", value: "status" },
  { icon: LayoutGrid, label: "Cliente", value: "client" },
  { icon: Columns3, label: "Expediente", value: "case" },
  { icon: Users, label: "Asignado", value: "assignedTo" }
] satisfies Array<TasksChartGroupOption & { icon: typeof Text }>;

export const chartSortOptions = [
  { icon: BarChart3, label: "Recuento", value: "count" },
  { icon: Text, label: "Nombre", value: "label" }
] satisfies Array<TasksChartSortOption & { icon: typeof Text }>;

export const openTaskOptions = [
  { icon: Columns3, label: "Ventana lateral", value: "side_sheet" },
  { icon: LayoutGrid, label: "Ventana central", value: "center_modal" }
] satisfies Array<TasksOpenTaskOption & { icon: typeof Columns3 }>;

export const kanbanCardSizeOptions = [
  { label: "Pequeño", value: "small" },
  { label: "Mediano", value: "medium" },
  { label: "Grande", value: "large" }
] satisfies TasksKanbanCardSizeOption[];

export const visiblePropertyOptions = [
  { icon: Text, value: "name" },
  { icon: Columns3, value: "case" },
  { icon: LayoutGrid, value: "client" },
  { icon: Eye, value: "assignedTo" },
  { icon: CalendarDays, value: "endDate" },
  { icon: Zap, value: "status" },
  { icon: List, value: "notes" }
] satisfies Array<TasksVisiblePropertyOption & { icon: typeof Text }>;

export const sortOptions = [
  { icon: Text, value: "name" },
  { icon: Zap, value: "status" },
  { icon: CalendarDays, value: "endDate" },
  { icon: LayoutGrid, value: "client" },
  { icon: Columns3, value: "case" },
  { icon: Eye, value: "assignedTo" },
  { icon: CalendarDays, value: "createdAt" }
] satisfies Array<TasksSortOption & { icon: typeof Text }>;
