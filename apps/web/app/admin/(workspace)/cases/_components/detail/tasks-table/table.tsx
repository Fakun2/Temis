"use client";

import { useState } from "react";
import { ListTodo, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AdminTableHeader } from "../../../../_components/admin-table-header";
import { AdminTableHeaderActionButton } from "../../../../_components/admin-table-header-action-button";
import { adminSurfaceClassName } from "../../../../_constants/dashboard";
import { casesQueries } from "../../../_api/cases.query-controller";
import {
  caseTasksTableColumnLabels,
  defaultCaseTasksTableColumns
} from "../../../_constants/cases.constants";
import { useCaseTasksQuery } from "../../../_hooks/use-case-tasks-query";
import { useCasesQuery } from "../../../_hooks/use-cases-query";
import type { CaseTaskDto, CaseTasksTableColumn } from "../../../_types/cases.types";
import { CaseTaskRowActions } from "../case-task-row-actions";
import { CaseTaskSheet } from "../task-sheet";
import { TaskTableCell } from "./cells";
import { TaskColumnsMenu } from "./column-menu";
import { TasksTablePagination } from "./pagination";
import { TaskRowsSkeleton, TaskTableMessageRow } from "./states";

export function CaseTasksTable({
  canCreate,
  canCreateExpense,
  canDelete,
  canDeleteExpense,
  canReadExpense,
  canUpdate,
  canUpdateExpense,
  caseId,
  focusedTaskId
}: {
  canCreate: boolean;
  canCreateExpense: boolean;
  canDelete: boolean;
  canDeleteExpense: boolean;
  canReadExpense: boolean;
  canUpdate: boolean;
  canUpdateExpense: boolean;
  caseId: string;
  focusedTaskId?: string | null;
}) {
  const hasActions = canDelete || canUpdate || canCreateExpense || canReadExpense;
  const assigneesQuery = useCasesQuery(casesQueries.taskAssignees());
  const assignees = assigneesQuery.data ?? [];
  const tasksQuery = useCaseTasksQuery(caseId);
  const tasks = tasksQuery.data?.items ?? [];
  const hasNextPage = Boolean(tasksQuery.data?.pageInfo.hasNextPage);
  const [visibleColumns, setVisibleColumns] = useState<CaseTasksTableColumn[]>([
    ...defaultCaseTasksTableColumns
  ]);
  const columnCount = visibleColumns.length + (hasActions ? 1 : 0);

  function toggleColumn(column: CaseTasksTableColumn, checked: boolean) {
    const nextColumns = checked
      ? [...new Set([...visibleColumns, column])]
      : visibleColumns.filter((item) => item !== column);

    setVisibleColumns(nextColumns.length ? nextColumns : [...defaultCaseTasksTableColumns]);
  }

  return (
    <Card
      data-admin-surface
      className={`${adminSurfaceClassName} flex min-h-[320px] flex-col overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
    >
      <AdminTableHeader
        actions={
          <>
            {canCreate ? (
              <CaseTaskSheet
                assignees={assignees}
                caseId={caseId}
                trigger={
                  <AdminTableHeaderActionButton icon={Plus} label="Nueva tarea" tone="primary" />
                }
              />
            ) : null}
            <TaskColumnsMenu onToggleColumn={toggleColumn} visibleColumns={visibleColumns} />
          </>
        }
        description="Seguimiento operativo, fechas y observaciones del expediente."
        icon={ListTodo}
        title="Tareas del expediente"
      />
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 md:px-4">
        <section className="min-h-[240px] max-h-[420px] overflow-auto rounded-2xl xl:max-h-[480px]">
          <Table className="min-w-full text-xs">
            <TasksTableHeader hasActions={hasActions} visibleColumns={visibleColumns} />
            <TasksTableBody
              assignees={assignees}
              canCreateExpense={canCreateExpense}
              canDelete={canDelete}
              canDeleteExpense={canDeleteExpense}
              canReadExpense={canReadExpense}
              canUpdate={canUpdate}
              canUpdateExpense={canUpdateExpense}
              caseId={caseId}
              columnCount={columnCount}
              hasActions={hasActions}
              isLoading={tasksQuery.isLoading}
              permissionDenied={!tasksQuery.hasPermission}
              tasks={tasks}
              visibleColumns={visibleColumns}
              errorMessage={tasksQuery.error?.message}
              focusedTaskId={focusedTaskId}
            />
          </Table>
        </section>
        <TasksTablePagination
          canGoBack={tasksQuery.canGoBack}
          canGoForward={hasNextPage}
          goBack={tasksQuery.goBack}
          goForward={tasksQuery.goForward}
          pageIndex={tasksQuery.pageIndex}
          taskCount={tasks.length}
        />
      </CardContent>
    </Card>
  );
}

function TasksTableHeader({
  hasActions,
  visibleColumns
}: {
  hasActions: boolean;
  visibleColumns: CaseTasksTableColumn[];
}) {
  return (
    <TableHeader className="bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0">
      <TableRow className="hover:bg-transparent">
        {visibleColumns.map((column) => (
          <TableHead className="h-10 px-3 text-sm font-medium text-foreground" key={column}>
            {caseTasksTableColumnLabels[column]}
          </TableHead>
        ))}
        {hasActions ? (
          <TableHead className="h-10 px-3 text-right text-sm font-medium text-foreground">
            Acciones
          </TableHead>
        ) : null}
      </TableRow>
    </TableHeader>
  );
}

function TasksTableBody({
  assignees,
  canCreateExpense,
  canDelete,
  canDeleteExpense,
  canReadExpense,
  canUpdate,
  canUpdateExpense,
  caseId,
  columnCount,
  errorMessage,
  focusedTaskId,
  hasActions,
  isLoading,
  permissionDenied,
  tasks,
  visibleColumns
}: {
  assignees: Parameters<typeof CaseTaskRowActions>[0]["assignees"];
  canCreateExpense: boolean;
  canDelete: boolean;
  canDeleteExpense: boolean;
  canReadExpense: boolean;
  canUpdate: boolean;
  canUpdateExpense: boolean;
  caseId: string;
  columnCount: number;
  errorMessage?: string;
  focusedTaskId?: string | null;
  hasActions: boolean;
  isLoading: boolean;
  permissionDenied: boolean;
  tasks: CaseTaskDto[];
  visibleColumns: CaseTasksTableColumn[];
}) {
  if (isLoading) {
    return (
      <TableBody className="[&_tr:last-child]:border-0">
        <TaskRowsSkeleton columnCount={columnCount} />
      </TableBody>
    );
  }

  if (errorMessage) {
    return (
      <TableBody className="[&_tr:last-child]:border-0">
        <TaskTableMessageRow
          className="font-medium text-destructive"
          columnCount={columnCount}
          message={errorMessage}
        />
      </TableBody>
    );
  }

  if (permissionDenied) {
    return (
      <TableBody className="[&_tr:last-child]:border-0">
        <TaskTableMessageRow
          columnCount={columnCount}
          message="No tenes permisos para ver las tareas de este expediente."
        />
      </TableBody>
    );
  }

  if (!tasks.length) {
    return (
      <TableBody className="[&_tr:last-child]:border-0">
        <TaskTableMessageRow
          columnCount={columnCount}
          message="Todavia no hay tareas cargadas para este expediente."
        />
      </TableBody>
    );
  }

  return (
    <TableBody className="[&_tr:last-child]:border-0">
      {tasks.map((task) => (
        <TableRow
          className={`h-16 border-border/40 hover:bg-secondary/30 ${
            focusedTaskId === task.id ? "bg-primary/10 ring-1 ring-inset ring-primary/25" : ""
          }`}
          key={task.id}
        >
          {visibleColumns.map((column) => (
            <TableCell className="px-3 py-3" key={column}>
              <TaskTableCell column={column} task={task} />
            </TableCell>
          ))}
          {hasActions ? (
            <TableCell className="px-3 py-3 text-right">
              <div className="flex justify-end">
                <CaseTaskRowActions
                  assignees={assignees}
                  canCreateExpense={canCreateExpense}
                  canDelete={canDelete}
                  canDeleteExpense={canDeleteExpense}
                  canReadExpense={canReadExpense}
                  canUpdate={canUpdate}
                  canUpdateExpense={canUpdateExpense}
                  caseId={caseId}
                  task={task}
                />
              </div>
            </TableCell>
          ) : null}
        </TableRow>
      ))}
    </TableBody>
  );
}
