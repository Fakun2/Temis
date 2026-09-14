"use client";

import { useCallback } from "react";
import { Archive, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { courtImportSystems } from "../_constants/court-import-systems";
import type { CourtImportSystem } from "../_constants/court-import-systems";
import { useCourtImportDialog } from "../_hooks/use-court-import-dialog";
import type { AccountResponse } from "../_types/account.types";
import { CourtImportDialog } from "./expedientes/court-import-dialog";
import { CourtSystemPill } from "./expedientes/court-system-pill";

export function ExpedientesSection({ account }: { account: AccountResponse }) {
  const importDialog = useCourtImportDialog();
  const handleSelectSystem = useCallback(
    (system: CourtImportSystem) => {
      importDialog.openSystem(system);
    },
    [importDialog.openSystem]
  );

  return (
    <Card id="cases-import" className="scroll-mt-20 border-border/60 bg-card shadow-sm">
      <CardContent className="grid gap-5 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-btn-secondary text-muted-foreground">
              <Archive className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">Expedientes</h2>
              <p className="text-xs text-muted-foreground">
                Importacion desde sistemas judiciales argentinos.
              </p>
            </div>
          </div>
          <Badge variant="outline">Owner</Badge>
        </div>

        {!account.permissions.canImportSae ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/20 px-3 py-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Solo owners pueden importar expedientes desde sistemas externos.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {courtImportSystems.map((system) => (
            <CourtSystemPill
              key={system.id}
              disabled={!account.permissions.canImportSae}
              system={system}
              onSelect={handleSelectSystem}
            />
          ))}
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Las credenciales se piden en cada busqueda y no se guardan en Temis. Los conectores en
          gris estan preparados como mapa de integraciones futuras.
        </p>

        {importDialog.selectedSystem ? <CourtImportDialog state={importDialog} /> : null}
      </CardContent>
    </Card>
  );
}
