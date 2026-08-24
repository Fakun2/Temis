"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Banknote, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CaseExpenseFormValues } from "@/lib/validation/cases";
import {
  caseInputClassName,
  caseSelectTriggerClassName,
  caseTextareaClassName
} from "../../../_constants/cases.constants";
import { casesQueries } from "../../../_api/cases.query-controller";
import { useCasesQuery } from "../../../_hooks/use-cases-query";
import { useTenantCurrenciesQuery } from "../../../../currencies/_hooks/use-currencies-query";
import { CasePickerField } from "../../case-picker-field";
import { CaseActionSheet } from "../case-action-sheet";
import { CaseDateInput } from "../../sheet/case-date-input";
import { CaseField } from "../../sheet/case-field";
import { CaseExpenseAttachmentsPopup } from "../case-expense-attachments-popup";
import { NotificationSettingsField } from "../notification-settings-field";
import { caseExpenseStatusOptions, noCaseExpenseTaskValue } from "./constants";
import type { CaseExpenseSheetProps } from "./types";
import { useCaseExpenseSheet } from "./use-sheet";

export function CaseExpenseSheet({
  caseId,
  defaultDate,
  defaultTaskId,
  expense,
  hideTaskSelect = false,
  onOpenChange,
  open: controlledOpen,
  selectedCase,
  tasks,
  trigger
}: CaseExpenseSheetProps) {
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [localSelectedCase, setLocalSelectedCase] = useState(selectedCase ?? null);
  const selectedCaseId = caseId ?? localSelectedCase?.id ?? "";
  const currenciesQuery = useTenantCurrenciesQuery({
    limit: 50,
    sort: "name:asc",
    status: "active"
  });
  const currencies = currenciesQuery.data?.items ?? [];
  const notificationOptionsQuery = useCasesQuery(casesQueries.notificationOptions());
  const defaultCurrencyCode =
    currencies.find((currency) => currency.code === "ARS")?.code ?? currencies[0]?.code;
  const {
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
  } = useCaseExpenseSheet({
    caseId: selectedCaseId,
    defaultCurrencyCode,
    defaultDate,
    defaultTaskId,
    expense,
    hideTaskSelect,
    onOpenChange,
    open: controlledOpen
  });
  const canSelectCase = !expense && !caseId;
  const isMissingCase = canSelectCase && !selectedCaseId;

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

  function handleSheetOpenChange(nextOpen: boolean) {
    if (!nextOpen && attachmentsOpen) {
      return;
    }

    if (!nextOpen) {
      setAttachmentsOpen(false);
    }

    setOpen(nextOpen);
  }

  return (
    <>
      <CaseActionSheet
        contentProps={{
          onInteractOutside: (event) => {
            if (attachmentsOpen) {
              event.preventDefault();
            }
          },
          onPointerDownOutside: (event) => {
            if (attachmentsOpen) {
              event.preventDefault();
            }
          }
        }}
        description="Formulario para cargar o actualizar un gasto asociado al expediente."
        errorMessage={mutation.error?.message}
        icon={Banknote}
        isSubmitting={mutation.isPending}
        modal={!attachmentsOpen}
        onOpenChange={handleSheetOpenChange}
        onSubmit={handleCaseScopedSubmit}
        open={open}
        submitDisabled={isMissingCase}
        title={expense ? "Editar gasto" : "Nuevo gasto"}
        trigger={trigger}
      >
        {canSelectCase ? (
          <CaseField label="Expediente" required>
            <CasePickerField selectedCase={localSelectedCase} onSelect={setLocalSelectedCase} />
          </CaseField>
        ) : null}

        <CaseField error={errors.concept} label="Concepto" required>
          <Input
            autoComplete="off"
            className={caseInputClassName}
            placeholder="Tasa judicial"
            value={draft.concept}
            onChange={(event) => updateDraft("concept", event.target.value)}
          />
        </CaseField>

        <div className="grid gap-4 md:grid-cols-2">
          <CaseField error={errors.amount} label="Monto" required>
            <Input
              autoComplete="off"
              className={caseInputClassName}
              inputMode="decimal"
              placeholder="12.500,50"
              type="text"
              value={amountText}
              onChange={(event) => updateAmount(event.target.value)}
            />
          </CaseField>
          <CaseField error={errors.currencyCode} label="Moneda" required>
            <Select
              value={draft.currencyCode}
              onValueChange={(value) => updateDraft("currencyCode", value)}
            >
              <SelectTrigger className={caseSelectTriggerClassName}>
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} · {currency.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CaseField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CaseField error={errors.expenseDate} label="Fecha de emision">
            <CaseDateInput
              autoComplete="off"
              value={draft.expenseDate}
              onChange={(event) => updateDraft("expenseDate", event.target.value)}
            />
          </CaseField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CaseField error={errors.paymentDate} label="Fecha de pago">
            <CaseDateInput
              autoComplete="off"
              value={draft.paymentDate}
              onChange={(event) => updateDraft("paymentDate", event.target.value)}
            />
          </CaseField>
          <CaseField label="Estado" required>
            <Select
              value={draft.status}
              onValueChange={(value) => updateStatus(value as CaseExpenseFormValues["status"])}
            >
              <SelectTrigger className={caseSelectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {caseExpenseStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CaseField>
        </div>

        {!hideTaskSelect ? (
          <div className="grid gap-4 md:grid-cols-2">
            <CaseField label="Tarea asociada">
              <Select
                value={draft.taskId || noCaseExpenseTaskValue}
                onValueChange={(value) =>
                  updateDraft("taskId", value === noCaseExpenseTaskValue ? "" : value)
                }
              >
                <SelectTrigger className={caseSelectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noCaseExpenseTaskValue}>Sin tarea asociada</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CaseField>
          </div>
        ) : null}

        <NotificationSettingsField
          draft={draft}
          errors={errors}
          options={notificationOptionsQuery.data}
          updateDraft={updateDraft}
        />

        <CaseField error={errors.notes} label="Observaciones">
          <Textarea
            className={`min-h-32 ${caseTextareaClassName}`}
            maxLength={100}
            placeholder="Notas del gasto"
            value={draft.notes ?? ""}
            onChange={(event) => updateDraft("notes", event.target.value)}
          />
        </CaseField>

        <div className="rounded-2xl border border-border/40 bg-background/35 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Comprobantes</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {expense
                  ? "Adjunta comprobantes PDF o imagenes asociados a este gasto."
                  : "Guarda el gasto para poder adjuntar comprobantes."}
              </p>
            </div>
            {expense ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0 border-border/50 px-3 sm:gap-2 sm:px-4"
                onClick={() => setAttachmentsOpen(true)}
              >
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Ver</span>
              </Button>
            ) : null}
          </div>
        </div>
      </CaseActionSheet>
      {expense && attachmentsOpen ? (
        <CaseExpenseAttachmentsPopup
          canUpdate
          caseId={caseId!}
          expense={expense}
          onClose={() => setAttachmentsOpen(false)}
        />
      ) : null}
    </>
  );
}
