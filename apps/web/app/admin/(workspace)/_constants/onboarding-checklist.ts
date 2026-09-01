import { Archive, Banknote, Bell, CalendarDays, type LucideIcon } from "lucide-react";
import type { OnboardingChecklistStepId } from "../_types/onboarding-checklist.types";

export const onboardingChecklistIcons: Record<OnboardingChecklistStepId, LucideIcon> = {
  configure_finance: Banknote,
  configure_notifications: Bell,
  connect_calendar: CalendarDays,
  import_cases: Archive
};

export const onboardingChecklistDoneLabel = {
  completed: "Completado",
  skipped: "Omitido"
} as const;

export const onboardingChecklistDefaultCategories = [
  { kind: "income", name: "Honorarios" },
  { kind: "expense", name: "Tasas judiciales" },
  { kind: "expense", name: "Gastos administrativos" }
] as const;

export const onboardingChecklistCurrencyOptions = [
  { code: "ARS", label: "Peso argentino" },
  { code: "USD", label: "Dolar estadounidense" },
  { code: "BRL", label: "Real brasileno" }
] as const;
