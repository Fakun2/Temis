"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatCaseDate } from "../../../../cases/_components/detail/case-detail-format";
import { CaseTaskSheet } from "../../../../cases/_components/detail/task-sheet";
import type { TaskAssigneeOption } from "../../../../cases/_types/cases.types";
import { useTasksContext } from "../../../_context/tasks-context";
import { getYesterdayDateKey } from "../shared/date-utils";
import type { TasksChartDatum } from "./chart-utils";

export function TasksChartDetailsDialog({
  assignees,
  canCreate,
  datum
}: {
  assignees: TaskAssigneeOption[];
  canCreate: boolean;
  datum: TasksChartDatum;
}) {
  const { boardSettings } = useTasksContext();

  return (
    <DialogContent className="left-4 top-[18vh] max-h-[70vh] max-w-[min(760px,calc(100vw-2rem))] translate-x-0 translate-y-0 overflow-hidden p-0">
      <DialogHeader className="border-b border-border/40 px-5 py-4">
        <DialogTitle className="text-xl">{datum.title}</DialogTitle>
        <DialogDescription>
          {datum.count} {datum.count === 1 ? "tarea" : "tareas"} en este grupo.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-4 p-5">
        <div className="max-h-[46vh] overflow-auto rounded-xl border border-border/40">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Expediente</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datum.tasks.length ? (
                datum.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="max-w-[220px] truncate font-medium">{task.name}</TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {task.case?.caseNumber ?? "Sin expediente"}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {task.client?.displayName ?? "Sin cliente"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCaseDate(task.endDate)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={4}>
                    Sin tareas en este estado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {canCreate ? (
          <div className="flex justify-end">
            <CaseTaskSheet
              assignees={assignees}
              defaultDate={datum.id === "overdue" ? getYesterdayDateKey() : undefined}
              defaultStatus={datum.status ?? "pending"}
              presentation={boardSettings.openTaskIn === "center_modal" ? "dialog" : "sheet"}
              trigger={
                <Button className="gap-2" type="button">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nueva tarea
                </Button>
              }
            />
          </div>
        ) : null}
      </div>
    </DialogContent>
  );
}
