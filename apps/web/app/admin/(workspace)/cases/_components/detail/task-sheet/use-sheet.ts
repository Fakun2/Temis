"use client";

import { useEffect, useState, type FormEvent } from "react";
import { caseTaskFormSchema, type CaseTaskFormValues } from "@/lib/validation/cases";
import { casesMutations } from "../../../_api/cases.mutation-controller";
import { useCasesMutation } from "../../../_hooks/use-cases-mutation";
import type { CaseTaskDto } from "../../../_types/cases.types";
import { emptyCaseTaskDraft } from "./constants";
import type { CaseTaskFieldErrors } from "./types";

export function useCaseTaskSheet({
  caseId,
  defaultDate,
  defaultStatus,
  localCaseId,
  onOpenChange,
  open: controlledOpen,
  task
}: {
  caseId?: string;
  defaultDate?: string;
  defaultStatus?: CaseTaskFormValues["status"];
  localCaseId?: string | null;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  task?: CaseTaskDto;
}) {
  const [draft, setDraft] = useState<CaseTaskFormValues>(emptyCaseTaskDraft);
  const [errors, setErrors] = useState<CaseTaskFieldErrors>({});
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const mutation = useCasesMutation(casesMutations.saveTask({ caseId, taskId: task?.id }));
  const localContextMutation = useCasesMutation(casesMutations.updateTaskLocalContext());
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
    setDraft(
      task
        ? mapTaskToDraft(task)
        : {
            ...emptyCaseTaskDraft,
            endDate: defaultDate ?? emptyCaseTaskDraft.endDate,
            notificationDate: defaultDate ?? emptyCaseTaskDraft.notificationDate,
            status: defaultStatus ?? emptyCaseTaskDraft.status
          }
    );
  }, [defaultDate, defaultStatus, open, task]);

  function updateDraft<K extends keyof CaseTaskFormValues>(key: K, value: CaseTaskFormValues[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = caseTaskFormSchema.safeParse(draft);

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path[0], issue.message])
        ) as CaseTaskFieldErrors
      );
      return;
    }

    setErrors({});
    try {
      const shouldSaveTask = !task || hasTaskDraftChanges(task, parsed.data);

      if (shouldSaveTask) {
        await mutation.mutateAsync(parsed.data);
      }

      if (task && localCaseId !== undefined && localCaseId !== task.caseId) {
        await localContextMutation.mutateAsync({ caseId: localCaseId, taskId: task.id });
      }
      setOpen(false);
    } catch {
      // The mutation exposes its error below.
    }
  }

  return {
    draft,
    errors,
    handleSubmit,
    mutation: {
      ...mutation,
      error: mutation.error ?? localContextMutation.error,
      isPending: mutation.isPending || localContextMutation.isPending
    },
    open,
    setOpen,
    updateDraft
  };
}

function mapTaskToDraft(task: CaseTaskDto): CaseTaskFormValues {
  return {
    assignedMembershipId: task.assignedMembershipId ?? "",
    endDate: toDateInputValue(task.endDate),
    name: task.name,
    notes: task.notes ?? "",
    notificationDate: toDateInputValue(task.notificationDate),
    notificationEnabled: task.notificationEnabled,
    notificationMembershipIds: task.notificationMembershipIds,
    notificationPracticeAreaId: task.notificationPracticeAreaId ?? "",
    notificationRecipientMode: task.notificationRecipientMode,
    notificationTime: task.notificationTime ?? "",
    startDate: toDateInputValue(task.startDate),
    status: task.status
  };
}

function toDateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function hasTaskDraftChanges(task: CaseTaskDto, draft: CaseTaskFormValues) {
  return (
    task.assignedMembershipId !== (draft.assignedMembershipId || null) ||
    toDateInputValue(task.endDate) !== (draft.endDate || "") ||
    task.name !== draft.name ||
    (task.notes ?? "") !== (draft.notes ?? "") ||
    toDateInputValue(task.notificationDate) !== (draft.notificationDate || "") ||
    task.notificationEnabled !== draft.notificationEnabled ||
    (task.notificationPracticeAreaId ?? "") !== (draft.notificationPracticeAreaId || "") ||
    task.notificationRecipientMode !== draft.notificationRecipientMode ||
    (task.notificationTime ?? "") !== (draft.notificationTime || "") ||
    toSortedKey(task.notificationMembershipIds) !== toSortedKey(draft.notificationMembershipIds) ||
    toDateInputValue(task.startDate) !== (draft.startDate || "") ||
    task.status !== draft.status
  );
}

function toSortedKey(values: string[]) {
  return [...values].sort().join("|");
}
