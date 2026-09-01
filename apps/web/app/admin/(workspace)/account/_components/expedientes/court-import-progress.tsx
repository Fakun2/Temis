import { memo, type CSSProperties } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { SaeImportResponse, SaePreviewResponse } from "../../_types/account.types";
import type { ImportStage } from "../../_constants/court-import-systems";

export const CourtImportProgress = memo(function CourtImportProgress({
  preview,
  progress,
  result,
  stage
}: {
  preview: SaePreviewResponse | null;
  progress: number;
  result: SaeImportResponse | null;
  stage: ImportStage;
}) {
  const label = getStageLabel(stage, preview, result);
  const icon = getStageIcon(stage);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span
          className="court-import-status-text flex min-w-0 items-center justify-center gap-0.5"
          key={`${stage}-${label}`}
        >
          <span className="truncate">{label}</span>
          <span className="size-3">{icon}</span>
        </span>
        <span>{progress}%</span>
      </div>
      <Progress
        className="h-1"
        value={progress}
        style={{ "--progress-duration": "60ms" } as CSSProperties}
      />
    </div>
  );
});

function getStageLabel(
  stage: ImportStage,
  preview: SaePreviewResponse | null,
  result: SaeImportResponse | null
) {
  if (stage === "searching") {
    return "Consultando expedientes";
  }

  if (stage === "preview" && preview) {
    return `Se encontraron ${preview.summary.total} expedientes`;
  }

  if (stage === "importing") {
    return "Importando expedientes seleccionados";
  }

  if (stage === "done" && result) {
    return `${result.importedCount + result.updatedCount} expedientes procesados`;
  }

  if (stage === "error") {
    return "No se pudo completar la operacion";
  }

  return "";
}

function getStageIcon(stage: ImportStage) {
  if (stage === "searching" || stage === "importing") {
    return <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />;
  }

  if (stage === "preview" || stage === "done") {
    return <CheckCircle2 className="size-3 shrink-0 text-emerald-500" aria-hidden="true" />;
  }

  return null;
}
