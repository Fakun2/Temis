import type { CaseFormValues } from "@/lib/validation/cases";
import type {
  CaseCatalogStrategy,
  CaseExpenseStatus,
  CaseHearingType,
  CaseInstance,
  CaseSortKey,
  CaseTaskStatus,
  CaseStatus
} from "../_types/cases.types";
import type { ParticipantKind, ParticipantRole } from "../_types/case-form.types";

export const casesPageSize = 4;

export const caseInputClassName =
  "h-12 rounded-2xl border-border/40 bg-card px-4 shadow-none focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/10";

export const caseNativeDateTimeInputClassName = `${caseInputClassName} min-h-12 max-h-12 overflow-hidden py-0 leading-normal text-left [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:shrink-0 [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-date-and-time-value]:min-h-0 [&::-webkit-date-and-time-value]:text-left`;

export const caseTextareaClassName =
  "rounded-2xl border-border/40 bg-card px-4 py-3 shadow-none focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/10";

export const caseSelectTriggerClassName =
  "h-12 w-full rounded-2xl border-border/40 bg-card px-4 shadow-none focus-visible:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/10";

export const caseCatalogStrategies = {
  manual: {
    centerControl: "input",
    forumScope: "province"
  },
  center_forum: {
    centerControl: "select",
    forumScope: "judicialCenter"
  }
} as const satisfies Record<
  CaseCatalogStrategy,
  {
    centerControl: "input" | "select";
    forumScope: "province" | "judicialCenter";
  }
>;

export const emptyCaseDraft: CaseFormValues = {
  caseNumber: "",
  caption: "",
  subject: "",
  description: "",
  provinceId: "",
  forumTemplateId: "",
  judicialCenterForumId: "",
  judicialCenterText: "",
  court: "",
  instance: "first",
  status: "open",
  filingDate: "",
  primaryClientId: "",
  practiceAreaId: "",
  responsibleMembershipId: "",
  participants: []
};

export const participantKindLabels: Record<ParticipantKind, string> = {
  client: "Cliente",
  opposing_party: "Parte contraria",
  third_party: "Tercero",
  other: "Otro"
};

export const participantRoleLabels: Record<ParticipantRole, string> = {
  claimant: "Actor / Demandante",
  defendant: "Demandado",
  complainant: "Denunciante",
  accused: "Denunciado / Imputado",
  third_party: "Tercero",
  client: "Cliente / Representado",
  opposing_party: "Parte contraria",
  other: "Otro"
};

export const caseStatusLabels: Record<CaseStatus, string> = {
  open: "Abierto",
  paused: "Pausado",
  closed: "Cerrado"
};

export const caseInstanceLabels: Record<CaseInstance, string> = {
  first: "Primera",
  second: "Segunda",
  third: "Tercera"
};

export const caseTaskStatusLabels: Record<CaseTaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada"
};

export const caseTasksTableColumnLabels = {
  name: "Descripcion",
  assignedTo: "Asignado",
  startDate: "Inicio",
  endDate: "Vencimiento",
  status: "Estado",
  lastSeenAt: "Ultima apertura",
  notes: "Observaciones"
} as const;

export const defaultCaseTasksTableColumns = [
  "name",
  "assignedTo",
  "endDate",
  "status",
  "lastSeenAt"
] as const;

export const caseExpenseStatusLabels: Record<CaseExpenseStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  cancelled: "Cancelado",
  overdue: "Vencido"
};

export const caseHearingTypeLabels: Record<CaseHearingType, string> = {
  preliminary: "Preliminar",
  trial_view: "Vista de causa",
  conciliation: "Conciliacion",
  mediation: "Mediacion",
  testimonial: "Testimonial",
  confessional: "Confesional",
  debate: "Juicio / debate",
  investigative_statement: "Indagatoria",
  other: "Otra"
};

export const casesTableColumnLabels = {
  caseNumber: "Nro.",
  caption: "Caratula",
  province: "Provincia",
  forum: "Fuero",
  judicialCenter: "Centro judicial",
  court: "Juzgado",
  status: "Estado"
} as const;

export const defaultCasesTableColumns = [
  "caseNumber",
  "caption",
  "province",
  "forum",
  "status"
] as const;

export const caseSortLabels: Record<CaseSortKey, string> = {
  caseNumber: "Nro.",
  caption: "Caratula",
  createdAt: "Fecha de carga",
  status: "Estado"
};

export const defaultCaseSortKey: CaseSortKey = "createdAt";
export const defaultCaseSortDirection = "desc";
