"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ListTodo } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CaseTaskFormValues } from "@/lib/validation/cases";
import {
  caseInputClassName,
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
import { caseTaskStatusOptions, unassignedTaskAssigneeValue } from "./constants";
import type { CaseTaskSheetProps } from "./types";
import { useCaseTaskSheet } from "./use-sheet";

export function CaseTaskSheet({
  assignees = [],
  caseId,
  defaultDate,
  defaultStatus,
  onOpenChange,
  open: controlledOpen,
  presentation,
  selectedCase,
  task,
  trigger
}: CaseTaskSheetProps) {
  const [localSelectedCase, setLocalSelectedCase] = useState(selectedCase ?? null);
  const selectedCaseId = caseId ?? localSelectedCase?.id ?? "";
  const { draft, errors, handleSubmit, mutation, open, setOpen, updateDraft } = useCaseTaskSheet({
    caseId: task && !task.caseId ? undefined : selectedCaseId,
    defaultDate,
    defaultStatus,
    localCaseId: task ? selectedCaseId || null : undefined,
    onOpenChange,
    open: controlledOpen,
    task
  });
  const canSelectCase = !task && !caseId;
  const canLinkImportedCase = Boolean(task && !task.caseId);
  const isMissingCase = !task && !selectedCaseId;
  const notificationOptionsQuery = useCasesQuery(casesQueries.notificationOptions());

  useEffect(() => {
    if (open) {
      setLocalSelectedCase(selectedCase ?? getTaskSelectedCase(task));
    }
  }, [open, selectedCase, task]);

  function handleCaseScopedSubmit(event: FormEvent<HTMLFormElement>) {
    if (isMissingCase) {
      event.preventDefault();
      return;
    }

    handleSubmit(event);
  }

  return (
    <CaseActionSheet
      description="Formulario para cargar o actualizar una tarea del expediente."
      errorMessage={mutation.error?.message}
      icon={ListTodo}
      isSubmitting={mutation.isPending}
      onOpenChange={setOpen}
      onSubmit={handleCaseScopedSubmit}
      open={open}
      presentation={presentation}
      submitDisabled={isMissingCase}
      title={task ? "Editar tarea" : "Nueva tarea"}
      trigger={trigger}
    >
      {canSelectCase ? (
        <CaseField label="Expediente" required>
          <CasePickerField selectedCase={localSelectedCase} onSelect={setLocalSelectedCase} />
        </CaseField>
      ) : null}

      {canLinkImportedCase ? (
        <CaseField label="Expediente">
          <CasePickerField
            placeholder="Sin expediente"
            selectedCase={localSelectedCase}
            onSelect={setLocalSelectedCase}
          />
        </CaseField>
      ) : null}

      <CaseField error={errors.name} label="Descripcion" required>
        <Input
          autoComplete="off"
          className={caseInputClassName}
          placeholder="Presentar escrito"
          value={draft.name}
          onChange={(event) => updateDraft("name", event.target.value)}
        />
      </CaseField>

      <CaseField error={errors.assignedMembershipId} label="Asignado a">
        <Select
          value={draft.assignedMembershipId || unassignedTaskAssigneeValue}
          onValueChange={(value) =>
            updateDraft("assignedMembershipId", value === unassignedTaskAssigneeValue ? "" : value)
          }
        >
          <SelectTrigger className={caseSelectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={unassignedTaskAssigneeValue}>Sin asignar</SelectItem>
            {assignees.map((assignee) => (
              <SelectItem key={assignee.id} value={assignee.id}>
                {assignee.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CaseField>

      <CaseField error={errors.endDate} label="Fecha de vencimiento">
        <CaseDateInput
          autoComplete="off"
          value={draft.endDate ?? ""}
          onChange={(event) => updateDraft("endDate", event.target.value)}
        />
      </CaseField>

      <CaseField label="Estado">
        <Select
          value={draft.status}
          onValueChange={(value) => updateDraft("status", value as CaseTaskFormValues["status"])}
        >
          <SelectTrigger className={caseSelectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {caseTaskStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CaseField>

      <CaseField label="Observaciones">
        <Textarea
          className={`min-h-32 ${caseTextareaClassName}`}
          placeholder="Notas de seguimiento"
          value={draft.notes ?? ""}
          onChange={(event) => updateDraft("notes", event.target.value)}
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

function getTaskSelectedCase(task: CaseTaskSheetProps["task"]) {
  if (!task?.case) {
    return null;
  }

  return {
    caption: task.case.caption,
    caseNumber: task.case.caseNumber,
    id: task.case.id,
    subject: null
  };
}
