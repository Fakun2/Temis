import type { CaseExpenseStatus, CaseTaskStatus } from "../../_types/cases.types";

export function formatCaseDate(value: string | null | undefined) {
  if (!value) {
    return "Sin cargar";
  }

  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(toCalendarDate(value));
}

export function formatCaseDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sin abrir";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatCaseMoney(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function getTaskStatusClassName(status: CaseTaskStatus) {
  const statusClassMap: Record<CaseTaskStatus, string> = {
    cancelled: "border-border/50 bg-muted text-muted-foreground",
    completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    in_progress: "border-blue-500/20 bg-blue-500/10 text-blue-700",
    pending: "border-amber-500/20 bg-amber-500/10 text-amber-700"
  };

  return statusClassMap[status];
}

export function getExpenseStatusClassName(status: CaseExpenseStatus) {
  const statusClassMap: Record<CaseExpenseStatus, string> = {
    cancelled: "border-border/50 bg-muted text-muted-foreground",
    overdue: "border-destructive/20 bg-destructive/10 text-destructive",
    paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    pending: "border-amber-500/20 bg-amber-500/10 text-amber-700"
  };

  return statusClassMap[status];
}

function toCalendarDate(value: string) {
  const [datePart] = value.split("T");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart ?? "");

  if (!match) {
    return new Date(value);
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
