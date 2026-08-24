import type { CaseHearingFormValues } from "@/lib/validation/cases";
import { mapRecordToOptions } from "../../../_utils/case-options";
import { caseHearingTypeLabels } from "../../../_constants/cases.constants";

export const caseHearingTypeOptions = mapRecordToOptions(caseHearingTypeLabels);

export const emptyCaseHearingDraft: CaseHearingFormValues = {
  date: "",
  description: "",
  notificationDate: "",
  notificationEnabled: false,
  notificationMembershipIds: [],
  notificationPracticeAreaId: "",
  notificationRecipientMode: "self",
  notificationTime: "",
  notificationsEnabled: false,
  time: "",
  type: "preliminary"
};
