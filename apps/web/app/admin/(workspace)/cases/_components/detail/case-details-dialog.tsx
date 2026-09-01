"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { caseInstanceLabels, caseStatusLabels } from "../../_constants/cases.constants";
import type { CaseDetailDto } from "../../_types/cases.types";
import { formatCaseDate } from "./case-detail-format";
import { CaseDetailItem } from "./case-detail-item";
import { CaseParticipantsSection } from "./case-participants-section";

export function CaseDetailsDialog({
  caseItem,
  onClose
}: {
  caseItem: CaseDetailDto;
  onClose: () => void;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function requestClose() {
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  }

  return (
    <section
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-3 backdrop-blur-sm transition-[opacity,backdrop-filter] duration-200 ease-out sm:p-4 ${
        isClosing || !isVisible ? "opacity-0 backdrop-blur-none" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Detalles del expediente"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <article
        data-admin-surface
        className={`flex max-h-[84svh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[var(--admin-card-shadow)] transition-[opacity,transform] duration-200 ease-out ${
          isClosing || !isVisible
            ? "translate-y-2 scale-[0.98] opacity-0"
            : "translate-y-0 scale-100 opacity-100"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/30 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Detalles del expediente
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground">
              {caseItem.caption}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{caseItem.caseNumber}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-7 w-7 shrink-0 border-border/50 p-0"
            onClick={requestClose}
            aria-label="Cerrar detalles del expediente"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <section className="grid gap-4 md:grid-cols-2" aria-label="Informacion principal">
            <CaseDetailItem label="Caratula" value={caseItem.caption} />
            <CaseDetailItem label="Numero de expediente" value={caseItem.caseNumber} />
            <CaseDetailItem
              label="Provincia"
              value={caseItem.province?.name ?? caseItem.provinceText}
            />
            <CaseDetailItem
              label="Fuero"
              value={caseItem.forum?.name ?? caseItem.jurisdictionText}
            />
            <CaseDetailItem
              label="Centro judicial"
              value={caseItem.judicialCenter?.name ?? caseItem.judicialCenterText ?? caseItem.unitText}
            />
            <CaseDetailItem label="Juzgado / Tribunal" value={caseItem.court} />
            <CaseDetailItem label="Instancia" value={caseInstanceLabels[caseItem.instance]} />
            <CaseDetailItem label="Estado" value={caseStatusLabels[caseItem.status]} />
            <CaseDetailItem label="Fecha de ingreso" value={formatCaseDate(caseItem.filingDate)} />
            <CaseDetailItem label="Asunto" value={caseItem.subject} />
            <CaseDetailItem
              className="md:col-span-2"
              label="Descripcion"
              value={caseItem.description}
              multiline
            />
          </section>

          <CaseParticipantsSection participants={caseItem.participants} />
        </main>
      </article>
    </section>
  );
}
