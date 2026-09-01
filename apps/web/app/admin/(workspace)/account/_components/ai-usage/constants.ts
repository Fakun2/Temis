import type { UsageViewMode } from "./types";

export const HEATMAP_ROW_COUNT = 7;
export const TOKEN_CELL_CLASSES = [
  "bg-secondary",
  "bg-[#d8e5fb]",
  "bg-[#a9c4f0]",
  "bg-[#6f9ce4]",
  "bg-[#2f6bdb]"
] as const;

export const TOKEN_USAGE_MODE_LABELS: Record<UsageViewMode, string> = {
  accumulated: "Acumulado",
  daily: "Diario",
  weekly: "Semanal"
};

export const TOKEN_USAGE_MODE_OPTIONS: UsageViewMode[] = ["daily", "weekly", "accumulated"];

export const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "short" });
export const dayFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});
