"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CaseHearingFormValues } from "@/lib/validation/cases";
import {
  caseNativeDateTimeInputClassName,
  caseSelectTriggerClassName,
  caseTextareaClassName
} from "../../../_constants/cases.constants";
import { casesQueries } from "../../../_api/cases.query-controller";
import { useCasesQuery } from "../../../_hooks/use-cases-query";
import { CasePickerField } from "../../case-picker-field";
import { CaseActionSheet } from "../case-action-sheet";
import { NotificationSettingsField } from "../notification-settings-field";
import { CaseDateInput } from "../../sheet/case-date-input";
import { CaseField } from "../../sheet/case-field";
import { caseHearingTypeOptions } from "./constants";
import type { CaseHearingSheetProps } from "./types";
import { useCaseHearingSheet } from "./use-sheet";

export function CaseHearingSheet({
  caseId,
  defaultDate,
  hearing,
  onOpenChange,
  open: controlledOpen,
  selectedCase,
  trigger
}: CaseHearingSheetProps) {
  const [localSelectedCase, setLocalSelectedCase] = useState(selectedCase ?? null);
  const selectedCaseId = caseId ?? localSelectedCase?.id ?? "";
  const { draft, errors, handleSubmit, mutation, open, setOpen, updateDraft } = useCaseHearingSheet(
    {
      caseId: selectedCaseId,
      defaultDate,
      hearing,
      onOpenChange,
      open: controlledOpen
    }
  );
  const canSelectCase = !hearing && !caseId;
  const isMissingCase = canSelectCase && !selectedCaseId;
  const notificationOptionsQuery = useCasesQuery(casesQueries.notificationOptions());

  useEffect(() => {
    if (open) {
      setLocalSelectedCase(selectedCase ?? null);
    }
  }, [open, selectedCase]);

  function handleCaseScopedSubmit(event: FormEvent<HTMLFormElement>) {
    if (isMissingCase) {
      event.preventDefault();
      return;
    }

    handleSubmit(event);
  }

  return (
    <CaseActionSheet
      description="Formulario para cargar o actualizar una audiencia del expediente."
      errorMessage={mutation.error?.message}
      icon={CalendarPlus}
      isSubmitting={mutation.isPending}
      onOpenChange={setOpen}
      onSubmit={handleCaseScopedSubmit}
      open={open}
      submitDisabled={isMissingCase}
      title={hearing ? "Editar audiencia" : "Nueva audiencia"}
      trigger={trigger}
      widthClassName="w-[760px] max-w-[94vw] sm:max-w-[760px]"
    >
      {canSelectCase ? (
        <CaseField label="Expediente" required>
          <CasePickerField selectedCase={localSelectedCase} onSelect={setLocalSelectedCase} />
        </CaseField>
      ) : null}

      <CaseField error={errors.type} label="Tipo de audiencia" required>
        <Select
          value={draft.type}
          onValueChange={(value) => updateDraft("type", value as CaseHearingFormValues["type"])}
        >
          <SelectTrigger className={caseSelectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {caseHearingTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CaseField>

      <div className="grid gap-4 md:grid-cols-2">
        <CaseField error={errors.date} label="Fecha" required>
          <CaseDateInput
            autoComplete="off"
            value={draft.date}
            onChange={(event) => updateDraft("date", event.target.value)}
          />
        </CaseField>
        <CaseField error={errors.time} label="Hora" required>
          <Input
            autoComplete="off"
            className={caseNativeDateTimeInputClassName}
            type="time"
            value={draft.time}
            onChange={(event) => updateDraft("time", event.target.value)}
          />
        </CaseField>
      </div>

      <CaseField error={errors.description} label="Descripcion" required>
        <Textarea
          className={`min-h-32 ${caseTextareaClassName}`}
          placeholder="Detalle breve de la audiencia"
          value={draft.description}
          onChange={(event) => updateDraft("description", event.target.value)}
        />
      </CaseField>

      <NotificationSettingsField
        draft={draft}
        errors={errors}
        options={notificationOptionsQuery.data}
        updateDraft={updateDraft}
      />
    </CaseActionSheet>
  );
}
