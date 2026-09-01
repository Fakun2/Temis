"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
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
import { caseStatusLabels, casesTableColumnLabels } from "../../_constants/cases.constants";
import type {
  CaseDto,
  CaseSortDirection,
  CaseSortKey,
  CasesTableColumn
} from "../../_types/cases.types";
import { casesMutations } from "../../_api/cases.mutation-controller";
import { useCasesMutation } from "../../_hooks/use-cases-mutation";
import { CaseRowActions } from "./case-row-actions";
import { CaseSortableColumnHeader } from "./case-sortable-column-header";
import { DeleteCasesDialog } from "./delete-cases-dialog";
import { TableStateRow } from "./table-state-row";

export function CasesTable({
  canDelete,
  canUpdate,
  cases,
  columns,
  error,
  onSort,
  sortBy,
  sortDirection
}: {
  canDelete: boolean;
  canUpdate: boolean;
  cases: CaseDto[];
  columns: CasesTableColumn[];
  error: Error | null;
  onSort: (sortBy: CaseSortKey) => void;
  sortBy: CaseSortKey;
  sortDirection: CaseSortDirection;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const deleteMutation = useCasesMutation(casesMutations.deleteCase());
  const hasActions = true;
  const pageCaseIds = useMemo(() => cases.map((item) => item.id), [cases]);
  const selectedPageCount = pageCaseIds.filter((id) => selectedIds.has(id)).length;
  const allPageRowsSelected = cases.length > 0 && selectedPageCount === cases.length;
  const somePageRowsSelected = selectedPageCount > 0 && selectedPageCount < cases.length;

  useEffect(() => {
    setSelectedIds((current) => new Set([...current].filter((id) => pageCaseIds.includes(id))));
  }, [pageCaseIds]);

  function toggleAllPageRows(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of pageCaseIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    const idsToDelete = [...selectedIds];
    try {
      for (const id of idsToDelete) {
        await deleteMutation.mutateAsync(id);
      }
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
    } catch {
      // The mutation exposes its error state in the confirmation panel.
    }
  }

  if (error) {
    return <TableStateRow text={error.message} />;
  }

  if (cases.length === 0) {
    return <TableStateRow text="Todavia no hay expedientes cargados." />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible lg:overflow-hidden">
      {canDelete && selectedPageCount > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/35 px-3 py-2.5">
          <p className="text-sm text-muted-foreground">
            {selectedPageCount === 1
              ? "1 expediente seleccionado"
              : `${selectedPageCount} expedientes seleccionados`}
          </p>
          <Button
            type="button"
            className="h-9 px-3 sm:gap-2 sm:px-4"
            disabled={deleteMutation.isPending}
            onClick={() => setBulkDeleteOpen(true)}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        </div>
      ) : null}
      <div className="max-h-[52svh] overflow-auto scrollbar-none rounded-2xl lg:min-h-0 lg:max-h-none lg:flex-1">
        <Table className="min-w-max text-xs">
          <TableHeader className="bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 w-10 px-3 text-sm font-medium text-foreground">
                <Checkbox
                  checked={allPageRowsSelected || (somePageRowsSelected ? "indeterminate" : false)}
                  onCheckedChange={(value) => toggleAllPageRows(Boolean(value))}
                  aria-label="Seleccionar todos los expedientes de la pagina"
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead
                  className={`h-10 px-3 text-sm font-medium text-foreground ${getCaseTableColumnClassName(column)}`}
                  key={column}
                >
                  {renderCaseTableHeader({
                    activeSortKey: sortBy,
                    column,
                    direction: sortDirection,
                    onSort
                  })}
                </TableHead>
              ))}
              {hasActions ? (
                <TableHead className="h-10 px-3 text-right text-sm font-medium text-foreground">
                  Acciones
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-0">
            {cases.map((item) => (
              <TableRow className="h-16 border-border/40 hover:bg-secondary/30" key={item.id}>
                <TableCell className="h-16 w-10 px-3 py-2">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={(value) => toggleRow(item.id, Boolean(value))}
                    aria-label={`Seleccionar ${item.caseNumber}`}
                  />
                </TableCell>
                {columns.map((column) => (
                  <TableCell
                    className={`h-16 px-3 py-2 ${getCaseTableColumnClassName(column)}`}
                    key={column}
                  >
                    {renderCaseTableCell(column, item)}
                  </TableCell>
                ))}
                {hasActions ? (
                  <TableCell className="h-16 px-3 py-2 text-right">
                    <div className="flex justify-end">
                      <CaseRowActions canDelete={canDelete} canUpdate={canUpdate} caseItem={item} />
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DeleteCasesDialog
        count={selectedPageCount}
        error={deleteMutation.error?.message}
        loading={deleteMutation.isPending}
        open={bulkDeleteOpen}
        onConfirm={() => void handleBulkDelete()}
        onOpenChange={setBulkDeleteOpen}
      />
    </div>
  );
}

function renderCaseTableHeader({
  activeSortKey,
  column,
  direction,
  onSort
}: {
  activeSortKey: CaseSortKey;
  column: CasesTableColumn;
  direction: CaseSortDirection;
  onSort: (sortBy: CaseSortKey) => void;
}) {
  const sortableColumnMap: Partial<Record<CasesTableColumn, CaseSortKey>> = {
    caption: "caption",
    caseNumber: "caseNumber",
    status: "status"
  };
  const sortKey = sortableColumnMap[column];

  if (!sortKey) {
    return casesTableColumnLabels[column];
  }

  return (
    <CaseSortableColumnHeader
      active={activeSortKey === sortKey}
      direction={direction}
      label={casesTableColumnLabels[column]}
      onSort={onSort}
      sortKey={sortKey}
    />
  );
}

function renderCaseTableCell(column: CasesTableColumn, item: CaseDto) {
  const cellRenderMap: Record<CasesTableColumn, ReactNode> = {
    caseNumber: (
      <Link
        className="font-medium text-foreground underline-offset-4 transition-colors hover:text-btn-primary hover:underline"
        href={`/admin/cases/${item.id}`}
      >
        {item.caseNumber}
      </Link>
    ),
    caption: (
      <span className="block min-w-0 max-w-[280px] sm:max-w-[340px] xl:max-w-[420px]">
        <Link
          className="block truncate text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-btn-primary hover:underline"
          href={`/admin/cases/${item.id}`}
          title={item.caption}
        >
          {item.caption}
        </Link>
        <span
          className="mt-0.5 block truncate text-xs text-muted-foreground"
          title={item.subject || "Sin asunto"}
        >
          {item.subject || "Sin asunto"}
        </span>
      </span>
    ),
    court: <NullableText value={item.court} />,
    forum: <NullableText value={item.forum?.name ?? item.jurisdictionText} />,
    judicialCenter: (
      <NullableText value={item.judicialCenter?.name ?? item.judicialCenterText ?? item.unitText} />
    ),
    province: <NullableText value={item.province?.name ?? item.provinceText} />,
    status: <span className="text-sm text-foreground">{caseStatusLabels[item.status]}</span>
  };

  return cellRenderMap[column];
}

function getCaseTableColumnClassName(column: CasesTableColumn) {
  return column === "caption"
    ? "w-[280px] max-w-[280px] sm:w-[340px] sm:max-w-[340px] xl:w-[420px] xl:max-w-[420px]"
    : "";
}

function NullableText({ value }: { value: string | null | undefined }) {
  return (
    <span className={value ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>
      {value || "Sin cargar"}
    </span>
  );
}
