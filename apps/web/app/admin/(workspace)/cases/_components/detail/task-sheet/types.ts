import type { ReactNode } from "react";
import type { CaseTaskFormValues } from "@/lib/validation/cases";
import type { CasePickerOption } from "../../case-picker-field";
import type {
  CaseTaskDto,
  CaseTaskStatus,
  TaskAssigneeOption
} from "../../../_types/cases.types";

type CaseTaskSheetBaseProps = {
  assignees?: TaskAssigneeOption[];
  defaultDate?: string;
  defaultStatus?: CaseTaskStatus;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  presentation?: "sheet" | "dialog";
  trigger?: ReactNode;
};

type CreateCaseTaskSheetProps = CaseTaskSheetBaseProps & {
  caseId?: string;
  selectedCase?: CasePickerOption | null;
  task?: undefined;
};

type EditCaseTaskSheetProps = CaseTaskSheetBaseProps & {
  caseId?: string;
  selectedCase?: never;
  task: CaseTaskDto & { case?: CasePickerOption | null };
};

export type CaseTaskSheetProps = CreateCaseTaskSheetProps | EditCaseTaskSheetProps;

export type CaseTaskFieldErrors = Partial<Record<keyof CaseTaskFormValues, string>>;
