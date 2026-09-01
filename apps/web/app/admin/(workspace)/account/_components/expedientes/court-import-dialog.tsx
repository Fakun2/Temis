"use client";

import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { useCourtImportDialog } from "../../_hooks/use-court-import-dialog";
import { useCourtImportVisualState } from "../../_hooks/use-court-import-visual-state";
import { cn } from "@/lib/utils";
import { CourtImportForm } from "./court-import-form";
import { CourtImportPreviewTable } from "./court-import-preview-table";
import { CourtImportProgress } from "./court-import-progress";
import { CourtImportResult } from "./court-import-result";

type CourtImportDialogState = ReturnType<typeof useCourtImportDialog>;

export const CourtImportDialog = memo(function CourtImportDialog({
  state
}: {
  state: CourtImportDialogState;
}) {
  const visualState = useCourtImportVisualState({
    hasPreview: Boolean(state.preview),
    hasResult: Boolean(state.result),
    stage: state.importStage
  });

  return (
    <Dialog
      open={Boolean(state.selectedSystem)}
      onOpenChange={(open) => {
        if (!open) {
          state.closeDialog();
        }
      }}
    >
      <DialogContent
        className={cn(
          "max-h-[88svh] overflow-hidden p-0 backdrop-blur-none transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [backdrop-filter:none]",
          visualState.modalExpanded
            ? "max-w-3xl"
            : visualState.modalCompact
              ? "max-w-md"
              : "max-w-xl"
        )}
        overlayClassName="bg-black/30 backdrop-blur-none [backdrop-filter:none]"
      >
        <div className="grid max-h-[88svh] grid-rows-[auto_minmax(0,1fr)]">
          <DialogHeader className="border-b border-border/50 px-5 py-4 pr-12">
            <DialogTitle>
              Importar expedientes desde {state.selectedSystem?.name ?? "sistema judicial"}
            </DialogTitle>
            <DialogDescription>
              {state.selectedSystem?.jurisdiction ?? "Argentina"} - ingresa tus credenciales para
              buscar expedientes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 gap-4 overflow-y-auto px-5 py-4">
            <CourtImportProgress
              preview={state.preview}
              progress={visualState.progress}
              result={state.result}
              stage={state.importStage}
            />

            <CourtImportForm
              busy={state.busy}
              form={state.form}
              formError={state.formError}
              collapsed={visualState.formCollapsed}
              onFieldChange={state.updateField}
              onSubmit={state.previewCases}
            />

            {state.preview && visualState.previewVisible ? (
              <div className="court-import-preview-enter">
                <CourtImportPreviewTable
                  allSelected={state.allSelected}
                  busy={state.busy}
                  preview={state.preview}
                  selectedIds={state.selectedIds}
                  selectedSet={state.selectedSet}
                  onImport={state.importSelectedCases}
                  onToggleAll={state.toggleAll}
                  onToggleItem={state.toggleItem}
                />
              </div>
            ) : null}

            {state.result ? <CourtImportResult result={state.result} /> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
