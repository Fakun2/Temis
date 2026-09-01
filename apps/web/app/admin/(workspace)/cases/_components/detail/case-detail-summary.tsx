"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminMetricsGrid } from "../../../_components/admin-metrics-grid";
import { adminSurfacePrimaryClassName } from "../../../_constants/dashboard";
import { casesQueries } from "../../_api/cases.query-controller";
import { caseStatusLabels } from "../../_constants/cases.constants";
import { useCasesQuery } from "../../_hooks/use-cases-query";
import type { CaseDetailDto } from "../../_types/cases.types";
import { formatCaseMoney } from "./case-detail-format";
import { CaseDetailsPopup } from "./case-details-popup";

export function CaseDetailSummary({ caseItem }: { caseItem: CaseDetailDto }) {
  const detailQuery = useCasesQuery(casesQueries.detail(caseItem.id));
  const currentCase = detailQuery.data ?? caseItem;

  return (
    <div className="grid shrink-0 gap-3 md:gap-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Button
            asChild
            variant="outline"
            className="mt-0.5 h-7 w-7 shrink-0 border-border/40 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-secondary/40"
            aria-label="Volver a expedientes"
          >
            <Link href="/admin/cases">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>

          <div className="min-w-0 max-w-[min(100%,760px)]">
            <div className="flex min-w-0 items-center gap-2">
              <h1
                className={`min-w-0 max-w-[min(72vw,760px)] truncate text-2xl font-semibold leading-tight md:text-3xl ${adminSurfacePrimaryClassName}`}
                title={currentCase.caption}
              >
                {currentCase.caption}
              </h1>
              <CaseDetailsPopup caseItem={currentCase} />
            </div>
            <div className="mt-3 grid gap-1 sm:max-w-[760px]">
              <p className="truncate text-base font-semibold text-foreground sm:text-lg">
                {currentCase.caseNumber}
              </p>
              <p className="truncate text-sm font-medium text-muted-foreground sm:text-base">
                {currentCase.province?.name ?? currentCase.provinceText ?? "Sin provincia"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {currentCase.forum?.name ?? currentCase.jurisdictionText ?? "Sin fuero"}
              </p>
            </div>
          </div>
        </div>
        <CaseStatusPill status={currentCase.status} />
      </div>

      <AdminMetricsGrid
        metrics={[
          {
            icon: CalendarDays,
            label: "Audiencias",
            value: String(currentCase.metrics.hearingsCount)
          },
          {
            icon: Clock3,
            label: "Pagos pendientes",
            value: formatCaseMoney(currentCase.metrics.pendingPayments)
          },
          { icon: ListTodo, label: "Tareas totales", value: String(currentCase.metrics.totalTasks) },
          {
            icon: CheckCircle2,
            label: "Tareas pendientes",
            value: String(currentCase.metrics.pendingTasks)
          }
        ]}
      />
    </div>
  );
}

function CaseStatusPill({ status }: { status: CaseDetailDto["status"] }) {
  const classNameByStatus: Record<CaseDetailDto["status"], string> = {
    closed: "border-border/50 bg-muted text-muted-foreground",
    open: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    paused: "border-amber-500/20 bg-amber-500/10 text-amber-700"
  };

  return (
    <span
      className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${classNameByStatus[status]}`}
    >
      {caseStatusLabels[status]}
    </span>
  );
}
