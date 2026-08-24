import type { CaseTaskFormValues } from "@/lib/validation/cases";
import { caseTaskStatusLabels } from "../../../_constants/cases.constants";
import { mapRecordToOptions } from "../../../_utils/case-options";

export const caseTaskStatusOptions = mapRecordToOptions(caseTaskStatusLabels);
export const unassignedTaskAssigneeValue = "unassigned";

export const emptyCaseTaskDraft: CaseTaskFormValues = {
  assignedMembershipId: "",
  endDate: "",
  name: "",
  notes: "",
  notificationDate: "",
  notificationEnabled: false,
  notificationMembershipIds: [],
  notificationPracticeAreaId: "",
  notificationRecipientMode: "self",
  notificationTime: "",
  startDate: "",
  status: "pending"
};
