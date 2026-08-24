"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { caseHearingFormSchema, type CaseHearingFormValues } from "@/lib/validation/cases";
import { casesMutations } from "../../../_api/cases.mutation-controller";
import { useCasesMutation } from "../../../_hooks/use-cases-mutation";
import type { CaseHearingDto } from "../../../_types/cases.types";
import { emptyCaseHearingDraft } from "./constants";
import type { CaseHearingFieldErrors } from "./types";

export function useCaseHearingSheet({
  caseId,
  defaultDate,
  hearing,
  onOpenChange,
  open: controlledOpen
}: {
  caseId: string;
  defaultDate?: string;
  hearing?: CaseHearingDto;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const [draft, setDraft] = useState<CaseHearingFormValues>(emptyCaseHearingDraft);
  const [errors, setErrors] = useState<CaseHearingFieldErrors>({});
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const mutation = useCasesMutation(casesMutations.saveHearing({ caseId, hearingId: hearing?.id }));
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
    setDraft(
      hearing
        ? mapHearingToDraft(hearing)
        : {
            ...emptyCaseHearingDraft,
            date: defaultDate ?? emptyCaseHearingDraft.date,
            notificationDate: defaultDate ?? emptyCaseHearingDraft.notificationDate
          }
    );
  }, [defaultDate, hearing, open]);

  function updateDraft<K extends keyof CaseHearingFormValues>(
    key: K,
    value: CaseHearingFormValues[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = caseHearingFormSchema.safeParse(draft);

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path[0], issue.message])
        ) as CaseHearingFieldErrors
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
    draft,
    errors,
    handleSubmit,
    mutation,
    open,
    setOpen,
    updateDraft
  };
}

function mapHearingToDraft(hearing: CaseHearingDto): CaseHearingFormValues {
  return {
    date: hearing.date,
    description: hearing.description,
    notificationDate: hearing.notificationDate ?? "",
    notificationEnabled: hearing.notificationEnabled,
    notificationMembershipIds: hearing.notificationMembershipIds,
    notificationPracticeAreaId: hearing.notificationPracticeAreaId ?? "",
    notificationRecipientMode: hearing.notificationRecipientMode,
    notificationTime: hearing.notificationTime ?? "",
    notificationsEnabled: hearing.notificationsEnabled,
    time: hearing.time,
    type: hearing.type
  };
}
