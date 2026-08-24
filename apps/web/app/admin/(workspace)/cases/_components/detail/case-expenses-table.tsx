"use client";

import { useState } from "react";
import { Banknote, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AdminTableHeader } from "../../../_components/admin-table-header";
import { AdminTableHeaderActionButton } from "../../../_components/admin-table-header-action-button";
import { AdminTableBodySkeleton } from "../../../_components/admin-skeletons";
import { adminSurfaceClassName } from "../../../_constants/dashboard";
import { useTenantCurrenciesQuery } from "../../../currencies/_hooks/use-currencies-query";
import { casesQueries } from "../../_api/cases.query-controller";
import { caseExpenseStatusLabels } from "../../_constants/cases.constants";
import { useCaseExpensesQuery } from "../../_hooks/use-case-expenses-query";
import { useCasesQuery } from "../../_hooks/use-cases-query";
import type { CaseExpenseDto, CaseExpenseStatus, CaseTaskDto } from "../../_types/cases.types";
import { formatCaseDate, formatCaseMoney, getExpenseStatusClassName } from "./case-detail-format";
import { CaseExpenseRowActions } from "./case-expense-row-actions";
import { CaseExpenseSheet } from "./expense-sheet";

const caseExpenseStatusFilterOptions = (
  Object.keys(caseExpenseStatusLabels) as CaseExpenseStatus[]
).map((value) => ({
  label: caseExpenseStatusLabels[value],
  value
}));

export function CaseExpensesTable({
  canCreate,
  canDelete,
  canRead,
  canUpdate,
  caseId,
  focusedExpenseId
}: {
  canCreate: boolean;
  canDelete: boolean;
  canRead: boolean;
  canUpdate: boolean;
  caseId: string;
  focusedExpenseId?: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState<CaseExpenseStatus | "all">("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const currenciesQuery = useTenantCurrenciesQuery({
    limit: 50,
    sort: "code:asc",
    status: "active"
  });
  const expensesQuery = useCaseExpensesQuery({
    caseId,
    currencyCode: currencyFilter === "all" ? undefined : currencyFilter,
    status: statusFilter === "all" ? undefined : statusFilter
  });
  const tasksQuery = useCasesQuery(casesQueries.tasks({ caseId, limit: 50 }));
  const currencies = currenciesQuery.data?.items ?? [];
  const expenses = expensesQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];
  const hasNextPage = Boolean(expensesQuery.data?.pageInfo.hasNextPage);
  const hasActions = canDelete || canUpdate;
  const columnCount = hasActions ? 8 : 7;

  return (
    <Card
      data-admin-surface
      className={`${adminSurfaceClassName} flex min-h-[320px] flex-col overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
    >
      <AdminTableHeader
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger
                className="h-9 w-[130px] rounded-md border-border/50 bg-background/70 text-sm"
                aria-label="Filtrar gastos por moneda"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as CaseExpenseStatus | "all")}
            >
              <SelectTrigger
                className="h-9 w-[150px] rounded-md border-border/50 bg-background/70 text-sm"
                aria-label="Filtrar gastos por estado"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {caseExpenseStatusFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canCreate ? (
              <CaseExpenseSheet
                caseId={caseId}
                tasks={tasks}
                trigger={
                  <AdminTableHeaderActionButton icon={Plus} label="Nuevo gasto" tone="primary" />
                }
              />
            ) : null}
          </div>
        }
        description={
          statusFilter === "all" && currencyFilter === "all"
            ? "Gastos propios del expediente, asociados opcionalmente a una tarea."
            : getExpensesFilterDescription(statusFilter, currencyFilter)
        }
        icon={Banknote}
        title="Gastos del expediente"
      />
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 md:px-4">
        <div className="h-[552px] min-h-[552px] overflow-auto rounded-2xl">
          <Table className="min-w-full text-xs">
            <TableHeader className="bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Concepto
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Monto
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Emision
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Pago
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Estado
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Tarea
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Observaciones
                </TableHead>
                {hasActions ? (
                  <TableHead className="h-10 px-3 text-right text-sm font-medium text-foreground">
                    Acciones
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <CaseExpensesTableBody
              canDelete={canDelete}
              canRead={canRead}
              canUpdate={canUpdate}
              caseId={caseId}
              columnCount={columnCount}
              errorMessage={expensesQuery.error?.message}
              expenses={expenses}
              hasActions={hasActions}
              focusedExpenseId={focusedExpenseId}
              isLoading={expensesQuery.isLoading}
              permissionDenied={!expensesQuery.hasPermission}
              tasks={tasks}
            />
          </Table>
        </div>
        <div className="flex items-center justify-between gap-3 px-1 py-3 text-sm text-muted-foreground">
          <span>
            Pagina {expensesQuery.pageIndex + 1} - {expenses.length} gastos
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-7 w-7 border-border/50 p-0"
              disabled={!expensesQuery.canGoBack}
              onClick={expensesQuery.goBack}
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-7 w-7 border-border/50 p-0"
              disabled={!hasNextPage}
              onClick={expensesQuery.goForward}
              aria-label="Pagina siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getExpensesFilterDescription(
  statusFilter: CaseExpenseStatus | "all",
  currencyFilter: string
) {
  const filters = [
    statusFilter === "all"
      ? null
      : `estado ${caseExpenseStatusLabels[statusFilter].toLowerCase()}`,
    currencyFilter === "all" ? null : `moneda ${currencyFilter}`
  ].filter(Boolean);

  return `Gastos del expediente con ${filters.join(" y ")}.`;
}

function CaseExpensesTableBody({
  canDelete,
  canRead,
  canUpdate,
  caseId,
  columnCount,
  errorMessage,
  expenses,
  focusedExpenseId,
  hasActions,
  isLoading,
  permissionDenied,
  tasks
}: {
  canDelete: boolean;
  canRead: boolean;
  canUpdate: boolean;
  caseId: string;
  columnCount: number;
  errorMessage?: string;
  expenses: CaseExpenseDto[];
  focusedExpenseId?: string | null;
  hasActions: boolean;
  isLoading: boolean;
  permissionDenied: boolean;
  tasks: CaseTaskDto[];
}) {
  if (isLoading) {
    return <AdminTableBodySkeleton columnCount={columnCount} rowCount={8} />;
  }

  if (errorMessage) {
    return (
      <CaseExpensesMessageBody
        className="font-medium text-destructive"
        columnCount={columnCount}
        message={errorMessage}
      />
    );
  }

  if (!canRead || permissionDenied) {
    return (
      <CaseExpensesMessageBody
        columnCount={columnCount}
        message="No tenes permisos para ver los gastos de este expediente."
      />
    );
  }

  if (!expenses.length) {
    return (
      <CaseExpensesMessageBody
        columnCount={columnCount}
        message="Todavia no hay gastos cargados para este expediente."
      />
    );
  }

  return (
    <TableBody className="[&_tr:last-child]:border-0">
      {expenses.map((expense) => (
        <TableRow
          className={`h-16 border-border/40 hover:bg-secondary/30 ${
            focusedExpenseId === expense.id
              ? "bg-primary/10 ring-1 ring-inset ring-primary/25"
              : ""
          }`}
          key={expense.id}
        >
          <TableCell className="px-3 py-3">
            <span className="font-medium text-foreground">{expense.concept}</span>
          </TableCell>
          <TableCell className="px-3 py-3 text-sm font-medium text-foreground">
            {formatCaseMoney(expense.amount, expense.currencyCode)}
          </TableCell>
          <TableCell className="px-3 py-3 text-sm text-muted-foreground">
            {formatCaseDate(expense.expenseDate)}
          </TableCell>
          <TableCell className="px-3 py-3 text-sm text-muted-foreground">
            {formatCaseDate(expense.paymentDate)}
          </TableCell>
          <TableCell className="px-3 py-3">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getExpenseStatusClassName(
                expense.status
              )}`}
            >
              {caseExpenseStatusLabels[expense.status]}
            </span>
          </TableCell>
          <TableCell className="max-w-[220px] px-3 py-3">
            <span className="block truncate text-sm text-muted-foreground">
              {expense.task?.name || "Sin tarea"}
            </span>
          </TableCell>
          <TableCell className="max-w-[260px] px-3 py-3">
            <span className="block truncate text-sm text-muted-foreground">
              {expense.alertEnabled
                ? `Alerta: ${formatCaseDate(expense.alertAt)}`
                : expense.notes || "Sin observaciones"}
            </span>
          </TableCell>
          {hasActions ? (
            <TableCell className="px-3 py-3 text-right">
              <div className="flex justify-end">
                <CaseExpenseRowActions
                  canDelete={canDelete}
                  canUpdate={canUpdate}
                  caseId={caseId}
                  expense={expense}
                  tasks={getTaskOptionsForExpense(tasks, expense)}
                />
              </div>
            </TableCell>
          ) : null}
        </TableRow>
      ))}
    </TableBody>
  );
}

function CaseExpensesMessageBody({
  className = "text-muted-foreground",
  columnCount,
  message
}: {
  className?: string;
  columnCount: number;
  message: string;
}) {
  return (
    <TableBody className="[&_tr:last-child]:border-0">
      <TableRow className="h-[512px] hover:bg-transparent">
        <TableCell className={`px-3 py-10 text-center text-sm ${className}`} colSpan={columnCount}>
          {message}
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

function getTaskOptionsForExpense(tasks: CaseTaskDto[], expense: CaseExpenseDto): CaseTaskDto[] {
  if (!expense.task || tasks.some((task) => task.id === expense.task?.id)) {
    return tasks;
  }

  return [
    ...tasks,
    {
      assignedMembershipId: null,
      assignedTo: null,
      caseId: expense.caseId,
      createdAt: expense.createdAt,
      endDate: null,
      id: expense.task.id,
      lastSeenAt: null,
      name: expense.task.name,
      notes: null,
      notificationDate: null,
      notificationEnabled: false,
      notificationMembershipIds: [],
      notificationPracticeAreaId: null,
      notificationRecipientMode: "self",
      notificationTime: null,
      startDate: null,
      status: "pending",
      updatedAt: expense.updatedAt
    }
  ];
}
