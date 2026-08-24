import type { ReactNode } from "react";
import type { CaseHearingFormValues } from "@/lib/validation/cases";
import type { CasePickerOption } from "../../case-picker-field";
import type { CaseHearingDto } from "../../../_types/cases.types";

export type CaseHearingSheetProps = {
  caseId?: string;
  selectedCase?: CasePickerOption | null;
  defaultDate?: string;
  hearing?: CaseHearingDto;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  trigger?: ReactNode;
};

export type CaseHearingFieldErrors = Partial<Record<keyof CaseHearingFormValues, string>>;
