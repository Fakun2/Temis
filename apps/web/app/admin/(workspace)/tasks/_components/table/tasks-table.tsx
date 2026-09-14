"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AdminTableRowsSkeleton } from "../../../_components/admin-skeletons";
import { CaseTaskRowActions } from "../../../cases/_components/detail/case-task-row-actions";
import {
  formatCaseDate,
  getTaskStatusClassName
} from "../../../cases/_components/detail/case-detail-format";
import { caseTaskStatusLabels } from "../../../cases/_constants/cases.constants";
import type { GlobalCaseTaskDto, TaskAssigneeOption } from "../../../cases/_types/cases.types";
import { taskColumnLabels } from "../../_constants/task-list.labels";
import type { TasksTableColumn } from "../../_types/task-list.types";
import { TaskDetailsDialog } from "./task-details-dialog";

export function TasksTable({
  assignees,
  canDelete,
  canUpdate,
  columns,
  error,
  isLoading,
  tasks
}: {
  assignees: TaskAssigneeOption[];
  canDelete: boolean;
  canUpdate: boolean;
  columns: TasksTableColumn[];
  error: Error | null;
  isLoading: boolean;
  tasks: GlobalCaseTaskDto[];
}) {
  const hasActions = canDelete || canUpdate;
  const columnCount = columns.length + 1 + (hasActions ? 1 : 0);
  const message = !isLoading && error
    ? error.message
    : !isLoading && !tasks.length
      ? "Todavia no hay tareas para los filtros seleccionados."
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
      {message ? (
        <>
          <Table className="table-fixed text-xs" aria-busy={isLoading}>
            <TasksTableHeader columns={columns} hasActions={hasActions} />
          </Table>
          <div
            className={`flex min-h-0 flex-1 items-center justify-center border-b border-border/40 px-6 py-8 text-center text-sm ${
              error ? "font-medium text-destructive" : "text-muted-foreground"
            }`}
          >
            {message}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto scrollbar-none">
          <Table className="min-w-[920px] text-xs" aria-busy={isLoading}>
            <TasksTableHeader columns={columns} hasActions={hasActions} />
            <TableBody className="[&_tr:last-child]:border-0">
              {isLoading ? <AdminTableRowsSkeleton columnCount={columnCount} rowCount={8} /> : null}
              {!isLoading && !error
                ? tasks.map((task) => (
                    <TableRow
                      className="h-16 border-border/40 hover:bg-secondary/30"
                      key={task.id}
                    >
                      {columns.map((column) => (
                        <TableCell className="h-16 px-3 py-2" key={column}>
                          <GlobalTaskCell column={column} task={task} />
                        </TableCell>
                      ))}
                      <TableCell className="h-16 px-3 py-2 text-center">
                        <TaskDetailsDialog task={task} />
                      </TableCell>
                      {hasActions ? (
                        <TableCell className="h-16 px-3 py-2 text-right">
                          <div className="flex justify-end">
                            <CaseTaskRowActions
                              assignees={assignees}
                              canCreateExpense={false}
                              canDelete={Boolean(task.caseId && canDelete)}
                              canDeleteExpense={false}
                              canReadExpense={false}
                              canUpdate={canUpdate}
                              canUpdateExpense={false}
                              caseId={task.caseId ?? undefined}
                              task={task}
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function TasksTableHeader({
  columns,
  hasActions
}: {
  columns: TasksTableColumn[];
  hasActions: boolean;
}) {
  return (
    <TableHeader className="bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0">
      <TableRow className="hover:bg-transparent">
        {columns.map((column) => (
          <TableHead className="h-10 px-3 text-sm font-medium text-foreground" key={column}>
            {taskColumnLabels[column]}
          </TableHead>
        ))}
        <TableHead className="h-10 px-3 text-center text-sm font-medium text-foreground">
          Detalle
        </TableHead>
        {hasActions ? (
          <TableHead className="h-10 px-3 text-right text-sm font-medium text-foreground">
            Acciones
          </TableHead>
        ) : null}
      </TableRow>
    </TableHeader>
  );
}

function GlobalTaskCell({ column, task }: { column: TasksTableColumn; task: GlobalCaseTaskDto }) {
  if (column === "name") {
    return <span className="font-medium text-foreground">{task.name}</span>;
  }

  if (column === "case") {
    if (!task.case) {
      return <span className="text-sm text-muted-foreground">Sin expediente</span>;
    }

    return (
      <Link
        className="grid max-w-[260px] gap-0.5 hover:text-primary"
        href={`/admin/cases/${task.case.id}`}
      >
        <span className="truncate text-sm font-medium">{task.case.caseNumber}</span>
        <span className="truncate text-xs text-muted-foreground">{task.case.caption}</span>
      </Link>
    );
  }

  if (column === "client") {
    return (
      <span className="block max-w-[180px] truncate text-sm text-muted-foreground">
        {task.client?.displayName ?? "Sin cliente"}
      </span>
    );
  }

  if (column === "assignedTo") {
    return (
      <span className="block max-w-[180px] truncate text-sm text-muted-foreground">
        {task.assignedTo?.fullName ?? "Sin asignar"}
      </span>
    );
  }

  if (column === "endDate") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        {formatCaseDate(task.endDate)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getTaskStatusClassName(
        task.status
      )}`}
    >
      {caseTaskStatusLabels[task.status]}
    </span>
  );
}
