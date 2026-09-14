"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Eye, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { casesMutations } from "../../_api/cases.mutation-controller";
import { useCasesMutation } from "../../_hooks/use-cases-mutation";
import type { CaseTaskDto, TaskAssigneeOption } from "../../_types/cases.types";
import { CaseExpenseSheet } from "./expense-sheet";
import { CaseTaskExpensesPopup } from "./case-task-expenses-popup";
import { CaseTaskSheet } from "./task-sheet";

export function CaseTaskRowActions({
  assignees,
  canCreateExpense,
  canDelete,
  canDeleteExpense,
  canReadExpense,
  canUpdate,
  canUpdateExpense,
  caseId,
  task
}: {
  assignees: TaskAssigneeOption[];
  canCreateExpense: boolean;
  canDelete: boolean;
  canDeleteExpense: boolean;
  canReadExpense: boolean;
  canUpdate: boolean;
  canUpdateExpense: boolean;
  caseId?: string;
  task: CaseTaskDto;
}) {
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteMutation = useCasesMutation(casesMutations.deleteTask(caseId ?? ""));
  const markSeenMutation = useCasesMutation(casesMutations.markTaskSeen(caseId ?? ""));
  const router = useRouter();
  const hasCase = Boolean(caseId);
  const hasExpenseActions = hasCase && (canCreateExpense || canReadExpense);

  if (!canDelete && !canUpdate && !hasExpenseActions) {
    return null;
  }

  async function handleDelete() {
    try {
      if (!caseId) {
        return;
      }

      await deleteMutation.mutateAsync(task.id);
      router.refresh();
    } catch {
      // The mutation exposes its error state if the request fails.
    }
  }

  async function openAfterMarkSeen(onOpen: () => void) {
    setMenuOpen(false);
    try {
      if (caseId) {
        await markSeenMutation.mutateAsync(task.id);
        router.refresh();
      }
    } catch {
      // The timestamp should not block the user from opening the task action.
    } finally {
      onOpen();
    }
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-7 w-7 border-border/50 p-0"
            disabled={deleteMutation.isPending}
            aria-label={`Acciones para ${task.name}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canReadExpense ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void openAfterMarkSeen(() => setExpensesOpen(true));
              }}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Ver gastos
            </DropdownMenuItem>
          ) : null}
          {canCreateExpense ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setMenuOpen(false);
                setAddExpenseOpen(true);
              }}
            >
              <Banknote className="h-4 w-4" aria-hidden="true" />
              Agregar gasto
            </DropdownMenuItem>
          ) : null}
          {canUpdate ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void openAfterMarkSeen(() => setEditTaskOpen(true));
              }}
            >
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              Editar
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem
              variant="destructive"
              disabled={deleteMutation.isPending}
              onSelect={(event) => {
                event.preventDefault();
                setMenuOpen(false);
                void handleDelete();
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canCreateExpense ? (
        <CaseExpenseSheet
          caseId={caseId}
          defaultTaskId={task.id}
          hideTaskSelect
          onOpenChange={setAddExpenseOpen}
          open={addExpenseOpen}
          tasks={[task]}
        />
      ) : null}

      {canUpdate ? (
        <CaseTaskSheet
          assignees={assignees}
          caseId={caseId}
          onOpenChange={setEditTaskOpen}
          open={editTaskOpen}
          task={task}
        />
      ) : null}

      {expensesOpen && caseId ? (
        <CaseTaskExpensesPopup
          canDelete={canDeleteExpense}
          canUpdate={canUpdateExpense}
          caseId={caseId}
          onClose={() => setExpensesOpen(false)}
          task={task}
        />
      ) : null}
    </>
  );
}
