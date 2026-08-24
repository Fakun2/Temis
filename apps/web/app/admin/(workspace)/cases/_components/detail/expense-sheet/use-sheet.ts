"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { caseExpenseFormSchema, type CaseExpenseFormValues } from "@/lib/validation/cases";
import { casesMutations } from "../../../_api/cases.mutation-controller";
import { useCasesMutation } from "../../../_hooks/use-cases-mutation";
import type { CaseExpenseDto } from "../../../_types/cases.types";
import {
  formatCaseExpenseAmountForInput,
  formatCaseExpenseAmountText,
  parseCaseExpenseAmountText
} from "./amount";
import { emptyCaseExpenseDraft } from "./constants";
import type { CaseExpenseFieldErrors } from "./types";

export function useCaseExpenseSheet({
  caseId,
  defaultCurrencyCode,
  defaultDate,
  defaultTaskId,
  expense,
  hideTaskSelect,
  onOpenChange,
  open: controlledOpen
}: {
  caseId: string;
  defaultCurrencyCode?: string;
  defaultDate?: string;
  defaultTaskId?: string;
  expense?: CaseExpenseDto;
  hideTaskSelect: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const [draft, setDraft] = useState<CaseExpenseFormValues>(emptyCaseExpenseDraft);
  const [amountText, setAmountText] = useState("");
  const [errors, setErrors] = useState<CaseExpenseFieldErrors>({});
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const mutation = useCasesMutation(casesMutations.saveExpense({ caseId, expenseId: expense?.id }));
  const router = useRouter();
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    setErrors({});
    const nextDraft = expense
      ? mapExpenseToDraft(expense)
      : {
          ...emptyCaseExpenseDraft,
          currencyCode: defaultCurrencyCode ?? emptyCaseExpenseDraft.currencyCode,
          expenseDate: defaultDate ?? emptyCaseExpenseDraft.expenseDate,
          notificationDate: defaultDate ?? emptyCaseExpenseDraft.notificationDate,
          paymentDate: defaultDate ?? emptyCaseExpenseDraft.paymentDate,
          taskId: defaultTaskId ?? ""
        };

    setDraft(nextDraft);
    setAmountText(nextDraft.amount > 0 ? formatCaseExpenseAmountForInput(nextDraft.amount) : "");
  }, [defaultCurrencyCode, defaultDate, defaultTaskId, expense, open]);

  function updateDraft<K extends keyof CaseExpenseFormValues>(
    key: K,
    value: CaseExpenseFormValues[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateStatus(status: CaseExpenseFormValues["status"]) {
    setDraft((current) => ({
      ...current,
      paymentDate:
        status === "paid" && current.status !== "paid"
          ? getBuenosAiresTodayDateString()
          : current.paymentDate,
      status
    }));
  }

  function updateAmount(value: string) {
    const nextAmountText = formatCaseExpenseAmountText(value);
    setAmountText(nextAmountText);
    updateDraft("amount", parseCaseExpenseAmountText(nextAmountText));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseCaseExpenseAmountText(amountText);
    const values =
      hideTaskSelect && defaultTaskId
        ? { ...draft, amount, taskId: defaultTaskId }
        : { ...draft, amount };
    const parsed = caseExpenseFormSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path[0], issue.message])
        ) as CaseExpenseFieldErrors
      );
      return;
    }

    setErrors({});
    try {
      await mutation.mutateAsync(parsed.data);
      setOpen(false);
      router.refresh();
    } catch {
      // The mutation exposes its error below.
    }
  }

  return {
    amountText,
    draft,
    errors,
    handleSubmit,
    mutation,
    open,
    setOpen,
    updateAmount,
    updateDraft,
    updateStatus
  };
}

function mapExpenseToDraft(expense: CaseExpenseDto): CaseExpenseFormValues {
  return {
    amount: expense.amount,
    concept: expense.concept,
    currencyCode: expense.currencyCode,
    expenseDate: expense.expenseDate,
    notes: expense.notes ?? "",
    notificationDate: expense.notificationDate ?? "",
    notificationEnabled: expense.notificationEnabled,
    notificationMembershipIds: expense.notificationMembershipIds,
    notificationPracticeAreaId: expense.notificationPracticeAreaId ?? "",
    notificationRecipientMode: expense.notificationRecipientMode,
    notificationTime: expense.notificationTime ?? "",
    paymentDate: expense.paymentDate,
    status: expense.status === "overdue" ? "pending" : expense.status,
    taskId: expense.taskId ?? ""
  };
}

function getBuenosAiresTodayDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).formatToParts(new Date());
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}
