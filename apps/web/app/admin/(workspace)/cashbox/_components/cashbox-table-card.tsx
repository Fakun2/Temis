"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Banknote, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AdminTableHeader } from "../../_components/admin-table-header";
import { AdminTableHeaderActionButton } from "../../_components/admin-table-header-action-button";
import { AdminTableRowsSkeleton } from "../../_components/admin-skeletons";
import { Can } from "../../_components/auth";
import { adminSurfaceClassName } from "../../_constants/dashboard";
import type { CurrencyDto } from "../../currencies/_types/currencies.types";
import {
  cashboxColumnLabels,
  cashboxDefaultColumns,
  cashboxMovementSignMap,
  cashboxMovementTypeLabels
} from "../_constants/cashbox.constants";
import type {
  CashboxColumn,
  CashboxMovementDto,
  CashboxMovementType,
  CashboxTablePageInfo
} from "../_types/cashbox.types";
import { CashboxConversionDialog } from "./cashbox-conversion-dialog";
import { CashboxMovementDialog } from "./cashbox-movement-dialog";
import { CashboxRowActions } from "./cashbox-row-actions";

export function CashboxTableCard({
  currencies,
  currencyCode,
  date,
  error,
  loading,
  movements,
  pageIndex,
  pageInfo,
  selectedBalance,
  selectedBalanceSymbol,
  onDateChange,
  onMutationSuccess,
  onNextPage,
  onPreviousPage
}: {
  currencies: CurrencyDto[];
  currencyCode?: string;
  date: string;
  error: Error | null;
  loading: boolean;
  movements: CashboxMovementDto[];
  pageIndex: number;
  pageInfo: CashboxTablePageInfo | undefined;
  selectedBalance: string;
  selectedBalanceSymbol?: string;
  onDateChange: (date: string) => void;
  onMutationSuccess: () => void;
  onNextPage: (cursor: string) => void;
  onPreviousPage: () => void;
}) {
  const [visibleColumns, setVisibleColumns] = useState<CashboxColumn[]>(cashboxDefaultColumns);

  function toggleColumn(column: CashboxColumn) {
    setVisibleColumns((current) => {
      if (current.includes(column)) {
        return current.length === 1 ? current : current.filter((item) => item !== column);
      }

      return [...current, column];
    });
  }

  return (
    <Card
      data-admin-surface
      className={`${adminSurfaceClassName} flex min-h-[420px] flex-1 flex-col overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
    >
      <AdminTableHeader
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className="cashbox-date-input h-9 w-[150px] border-border/40 bg-card"
            />
            <Can permissions={["finance:create"]}>
              <CashboxMovementDialog
                currencyCode={currencyCode}
                mode="income"
                onSuccess={onMutationSuccess}
              />
              <CashboxMovementDialog
                currencyCode={currencyCode}
                currentBalance={selectedBalance}
                currentBalanceSymbol={selectedBalanceSymbol}
                mode="expense"
                onSuccess={onMutationSuccess}
              />
              <CashboxConversionDialog
                currencies={currencies}
                selectedBalance={selectedBalance}
                selectedCurrencyCode={currencyCode}
                onSuccess={onMutationSuccess}
              />
            </Can>
            <ColumnMenu visibleColumns={visibleColumns} onToggleColumn={toggleColumn} />
          </div>
        }
        icon={Banknote}
        title="Caja"
      />
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-2 md:px-4">
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border/30">
          <div className="flex h-full min-w-[760px] flex-col">
            <CashboxTable
              error={error}
              loading={loading}
              movements={movements}
              visibleColumns={visibleColumns}
            />
            <CashboxPagination
              hasNextPage={Boolean(pageInfo?.hasNextPage)}
              nextCursor={pageInfo?.nextCursor ?? null}
              pageIndex={pageIndex}
              pageRowsLength={movements.length}
              onNextPage={onNextPage}
              onPreviousPage={onPreviousPage}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CashboxTable({
  error,
  loading,
  movements,
  visibleColumns
}: {
  error: Error | null;
  loading: boolean;
  movements: CashboxMovementDto[];
  visibleColumns: CashboxColumn[];
}) {
  const hasState = loading || Boolean(error) || movements.length === 0;

  return (
    <div
      className={`min-h-0 flex-1 scrollbar-none ${hasState ? "overflow-hidden" : "overflow-auto"} [scrollbar-gutter:stable]`}
    >
      <Table className="min-w-full text-xs">
        <TableHeader className="sticky top-0 z-10 bg-[color-mix(in_oklab,var(--muted)_28%,transparent)]">
          <TableRow className="border-border/40 hover:bg-transparent">
            {visibleColumns.map((column) => (
              <TableHead key={column} className="h-10 px-3 text-sm font-medium text-foreground">
                {cashboxColumnLabels[column]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <AdminTableRowsSkeleton columnCount={visibleColumns.length} rowCount={6} />
          ) : hasState ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={visibleColumns.length} className="p-0">
                <div className="flex h-full min-h-44 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  {error ? error.message : "Todavia no hay movimientos para esta moneda y dia."}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            movements.map((movement) => (
              <TableRow key={movement.id} className="h-12 border-border/40 hover:bg-secondary/30">
                {visibleColumns.map((column) => (
                  <TableCell key={column} className="px-3 py-2">
                    {renderMovementCell(movement, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function renderMovementCell(movement: CashboxMovementDto, column: CashboxColumn) {
  const sign = cashboxMovementSignMap[movement.type];
  const cellRenderMap: Record<CashboxColumn, ReactNode> = {
    amount: (
      <span className={getMovementAmountClassName(movement.type)}>
        {sign > 0 ? "+" : "-"}
        {movement.currencySymbol} {movement.amount}
      </span>
    ),
    actions: <CashboxRowActions movement={movement} />,
    category: movement.categoryName ? (
      <span className="text-foreground">{movement.categoryName}</span>
    ) : (
      <span className="text-muted-foreground">Sin categoria</span>
    ),
    description: (
      <span className="line-clamp-1 text-muted-foreground">
        {movement.description ?? "Sin descripcion"}
        {movement.source ? (
          <>
            {" · "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href={movement.source.href}
            >
              Ver expediente
            </Link>
          </>
        ) : null}
      </span>
    ),
    occurredAt: <span>{new Date(movement.occurredAt).toLocaleString("es-AR")}</span>,
    type: <MovementTypeBadge type={movement.type} />,
    user: <span className="text-muted-foreground">{movement.createdByName}</span>
  };

  return cellRenderMap[column];
}

function MovementTypeBadge({ type }: { type: CashboxMovementType }) {
  const toneMap: Record<CashboxMovementType, string> = {
    conversion_in: "border-primary/20 bg-primary/10 text-primary",
    conversion_out: "border-primary/20 bg-primary/10 text-primary",
    expense: "border-destructive/20 bg-destructive/10 text-destructive",
    income: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
  };

  return (
    <Badge variant="outline" className={toneMap[type]}>
      {cashboxMovementTypeLabels[type]}
    </Badge>
  );
}

function getMovementAmountClassName(type: CashboxMovementType) {
  if (type === "income") {
    return "font-semibold text-emerald-600";
  }

  return cashboxMovementSignMap[type] > 0
    ? "font-semibold text-primary"
    : "font-semibold text-destructive";
}

function ColumnMenu({
  visibleColumns,
  onToggleColumn
}: {
  visibleColumns: CashboxColumn[];
  onToggleColumn: (column: CashboxColumn) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AdminTableHeaderActionButton icon={Columns3} label="Columnas" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {cashboxDefaultColumns.map((column) => (
          <DropdownMenuCheckboxItem
            checked={visibleColumns.includes(column)}
            disabled={visibleColumns.includes(column) && visibleColumns.length === 1}
            key={column}
            onCheckedChange={() => onToggleColumn(column)}
          >
            {cashboxColumnLabels[column]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CashboxPagination({
  hasNextPage,
  nextCursor,
  pageIndex,
  pageRowsLength,
  onNextPage,
  onPreviousPage
}: {
  hasNextPage: boolean;
  nextCursor: string | null;
  pageIndex: number;
  pageRowsLength: number;
  onNextPage: (cursor: string) => void;
  onPreviousPage: () => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-t border-border/40 px-1">
      <p className="text-xs text-muted-foreground">
        {pageRowsLength === 0 ? "0 resultados" : `${pageRowsLength} resultados en esta pagina`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 border-border/50 px-2.5"
          disabled={pageIndex === 0}
          onClick={onPreviousPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-16 text-center text-xs text-muted-foreground">
          Pagina {pageIndex + 1}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-8 border-border/50 px-2.5"
          disabled={!hasNextPage || !nextCursor}
          onClick={() => {
            if (nextCursor) {
              onNextPage(nextCursor);
            }
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
