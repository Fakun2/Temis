import { memo } from "react";
import { CheckCircle2 } from "lucide-react";
import type { SaeImportResponse } from "../../_types/account.types";

export const CourtImportResult = memo(function CourtImportResult({
  result
}: {
  result: SaeImportResponse;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
        Importacion completada
      </div>
      <p className="text-muted-foreground">
        {result.importedCount} importados, {result.updatedCount} actualizados,{" "}
        {result.skippedCount} omitidos.
      </p>
    </div>
  );
});
