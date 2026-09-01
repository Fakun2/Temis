import { memo } from "react";
import { Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  courtImportActionLabels,
  courtImportStatusLabels
} from "../../_constants/court-import-systems";
import type { SaePreviewResponse } from "../../_types/account.types";

export const CourtImportPreviewTable = memo(function CourtImportPreviewTable({
  allSelected,
  busy,
  onImport,
  onToggleAll,
  onToggleItem,
  preview,
  selectedIds,
  selectedSet
}: {
  allSelected: boolean;
  busy: boolean;
  onImport: () => void;
  onToggleAll: (checked: boolean) => void;
  onToggleItem: (externalId: string, checked: boolean) => void;
  preview: SaePreviewResponse;
  selectedIds: string[];
  selectedSet: Set<string>;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Expedientes encontrados</p>
          <p className="text-xs text-muted-foreground">
            {preview.summary.total} detectados, {preview.summary.createCount} nuevos,{" "}
            {preview.summary.updateCount} para actualizar.
          </p>
        </div>
        <Button type="button" onClick={onImport} disabled={busy || selectedIds.length === 0}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          Importar seleccionados
        </Button>
      </div>

      {preview.items.length > 0 ? (
        <div className="max-h-[360px] overflow-auto rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(value) => onToggleAll(value === true)}
                    disabled={busy}
                  />
                </TableHead>
                <TableHead>Numero</TableHead>
                <TableHead>Caratula</TableHead>
                <TableHead>Provincia</TableHead>
                <TableHead>Fuero</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Accion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.items.map((item) => (
                <TableRow key={item.externalId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSet.has(item.externalId)}
                      onCheckedChange={(value) => onToggleItem(item.externalId, value === true)}
                      disabled={busy}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.caseNumber}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{item.caption}</TableCell>
                  <TableCell>{item.provinceText ?? "Sin dato"}</TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {item.jurisdictionText ?? "Sin dato"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {item.unitText ?? "Sin dato"}
                  </TableCell>
                  <TableCell>{courtImportStatusLabels[item.suggestedStatus]}</TableCell>
                  <TableCell>
                    <Badge variant={item.action === "create" ? "default" : "outline"}>
                      {courtImportActionLabels[item.action]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="rounded-xl border border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
          No se encontraron expedientes para importar.
        </p>
      )}
    </div>
  );
});
