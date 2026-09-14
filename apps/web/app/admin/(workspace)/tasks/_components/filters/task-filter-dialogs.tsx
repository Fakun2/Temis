"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CasePickerField, type CasePickerOption } from "../../../cases/_components/case-picker-field";
import { caseInputClassName } from "../../../cases/_constants/cases.constants";

type SearchTaskDialogProps = {
  open: boolean;
  searchDraft: string;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
  onSearchDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SearchTaskDialog({
  open,
  searchDraft,
  onCancel,
  onOpenChange,
  onSearchDraftChange,
  onSubmit
}: SearchTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buscar tarea</DialogTitle>
          <DialogDescription>
            Ingresa descripcion, notas, expediente o cliente para refinar la lista.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-1.5 text-sm font-medium">
            <span className="text-xs text-muted-foreground">Busqueda</span>
            <Input
              autoFocus
              autoComplete="off"
              className={caseInputClassName}
              placeholder="Ej. audiencia, vencimiento, expediente"
              type="text"
              value={searchDraft}
              onChange={(event) => onSearchDraftChange(event.target.value)}
            />
          </label>
          <DialogActions onCancel={onCancel} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

type CaseTaskDialogProps = {
  caseLabel: string;
  open: boolean;
  selectedCase: CasePickerOption | null;
  onCancel: () => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (caseItem: CasePickerOption) => void;
};

export function CaseTaskDialog({
  caseLabel,
  open,
  selectedCase,
  onCancel,
  onOpenChange,
  onSelect
}: CaseTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filtrar por expediente</DialogTitle>
          <DialogDescription>Selecciona un expediente para ver solo sus tareas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            <span className="text-xs text-muted-foreground">Expediente</span>
            <CasePickerField
              selectedCase={selectedCase}
              onSelect={onSelect}
              placeholder={caseLabel || "Buscar expediente"}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type DueDateRangeDialogProps = {
  dateDraft: {
    endDateFrom: string;
    endDateTo: string;
  };
  open: boolean;
  onCancel: () => void;
  onDateDraftChange: (dateDraft: { endDateFrom: string; endDateTo: string }) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function DueDateRangeDialog({
  dateDraft,
  open,
  onCancel,
  onDateDraftChange,
  onOpenChange,
  onSubmit
}: DueDateRangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rango de vencimiento</DialogTitle>
          <DialogDescription>Define el rango exacto de fechas de vencimiento.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              <span className="text-xs text-muted-foreground">Desde</span>
              <Input
                className={caseInputClassName}
                type="date"
                value={dateDraft.endDateFrom}
                onChange={(event) =>
                  onDateDraftChange({ ...dateDraft, endDateFrom: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              <span className="text-xs text-muted-foreground">Hasta</span>
              <Input
                className={caseInputClassName}
                type="date"
                value={dateDraft.endDateTo}
                onChange={(event) =>
                  onDateDraftChange({ ...dateDraft, endDateTo: event.target.value })
                }
              />
            </label>
          </div>
          <DialogActions onCancel={onCancel} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DialogActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit">Aplicar</Button>
    </div>
  );
}
