import type { CaseExpenseFormValues } from "@/lib/validation/cases";
import { mapRecordToOptions } from "../../../_utils/case-options";

export const caseExpenseStatusOptions = mapRecordToOptions({
  cancelled: "Cancelado",
  paid: "Pagado",
  pending: "Pendiente"
});
export const noCaseExpenseTaskValue = "none";

export const emptyCaseExpenseDraft: CaseExpenseFormValues = {
  amount: 0,
  concept: "",
  currencyCode: "",
  expenseDate: "",
  notes: "",
  notificationDate: "",
  notificationEnabled: false,
  notificationMembershipIds: [],
  notificationPracticeAreaId: "",
  notificationRecipientMode: "self",
  notificationTime: "",
  paymentDate: "",
  status: "pending",
  taskId: ""
};
