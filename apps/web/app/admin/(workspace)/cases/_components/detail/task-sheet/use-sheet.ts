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
  onOpenChange,
  open: controlledOpen,
  task
}: {
  caseId: string;
  defaultDate?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  task?: CaseTaskDto;
}) {
  const [draft, setDraft] = useState<CaseTaskFormValues>(emptyCaseTaskDraft);
  const [errors, setErrors] = useState<CaseTaskFieldErrors>({});
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const mutation = useCasesMutation(casesMutations.saveTask({ caseId, taskId: task?.id }));
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
            startDate: defaultDate ?? emptyCaseTaskDraft.startDate
          }
    );
  }, [defaultDate, open, task]);

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
      await mutation.mutateAsync(parsed.data);
      setOpen(false);
    } catch {
      // The mutation exposes its error below.
    }
  }

  return {
    draft,
    errors,
    handleSubmit,
    mutation,
    open,
    setOpen,
    updateDraft
  };
}

function mapTaskToDraft(task: CaseTaskDto): CaseTaskFormValues {
  return {
    assignedMembershipId: task.assignedMembershipId ?? "",
    endDate: task.endDate ?? "",
    name: task.name,
    notes: task.notes ?? "",
    notificationDate: task.notificationDate ?? "",
    notificationEnabled: task.notificationEnabled,
    notificationMembershipIds: task.notificationMembershipIds,
    notificationPracticeAreaId: task.notificationPracticeAreaId ?? "",
    notificationRecipientMode: task.notificationRecipientMode,
    notificationTime: task.notificationTime ?? "",
    startDate: task.startDate ?? "",
    status: task.status
  };
}
