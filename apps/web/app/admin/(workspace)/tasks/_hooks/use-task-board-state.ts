"use client";

import { useState } from "react";
import type {
  TaskBoardViewDto,
  TaskBoardViewInput,
  TaskBoardViewsListResponse
} from "../../cases/_types/cases.types";
import { casesMutations } from "../../cases/_api/cases.mutation-controller";
import { casesQueries } from "../../cases/_api/cases.query-controller";
import { useCasesMutation } from "../../cases/_hooks/use-cases-mutation";
import { useCasesQuery } from "../../cases/_hooks/use-cases-query";
import {
  defaultTaskBoardSettings,
  emptyTaskFilters,
  type TaskBoardSettings,
  type TaskFilters,
  type TasksViewMode
} from "../_components/task-list-types";
import {
  fromBoardFilters,
  getSuggestedBoardName,
  toBoardFilters
} from "../_utils/task-board-filters";
import { normalizeTaskBoardSettings } from "../_utils/task-board-settings";

export function useTaskBoardState({
  resetPagination,
  setViewMode
}: {
  resetPagination: () => void;
  setViewMode: (viewMode: TasksViewMode) => void;
}) {
  const boardsQuery = useCasesQuery(casesQueries.taskBoards());
  const createBoardMutation = useCasesMutation(casesMutations.createTaskBoard());
  const updateBoardMutation = useCasesMutation(casesMutations.updateTaskBoard());
  const deleteBoardMutation = useCasesMutation(casesMutations.deleteTaskBoard());
  const [filters, setFilters] = useState<TaskFilters>(emptyTaskFilters);
  const [activeBoardId, setActiveBoardId] = useState("");
  const [boardName, setBoardName] = useState("Tablero de tareas");
  const [boardNameEdited, setBoardNameEdited] = useState(false);
  const [boardSettings, setBoardSettings] = useState<TaskBoardSettings>({
    ...defaultTaskBoardSettings
  });

  function updateFilters(nextFilters: TaskFilters) {
    setFilters(nextFilters);
    resetPagination();

    if (!boardNameEdited) {
      setBoardName(getSuggestedBoardName(nextFilters));
    }
  }

  function persistBoardSettings(nextSettings: Partial<TaskBoardSettings>) {
    const normalizedSettings = normalizeTaskBoardSettings(nextSettings);
    setBoardSettings(normalizedSettings);

    if (activeBoardId) {
      void updateBoardMutation
        .mutateAsync({ boardId: activeBoardId, input: { settings: normalizedSettings } })
        .catch(() => {
          // Mutation errors are rendered in the board header.
        });
    }

    return normalizedSettings;
  }

  function updateBoardSettings(nextSettings: Partial<TaskBoardSettings>) {
    resetPagination();
    persistBoardSettings({ ...boardSettings, ...nextSettings });
  }

  function updateBoardName(nextName: string) {
    setBoardName(nextName);
    setBoardNameEdited(true);
  }

  async function saveBoard() {
    const input: TaskBoardViewInput = {
      filters: toBoardFilters(filters),
      name: boardName.trim() || "Tablero de tareas",
      settings: boardSettings
    };

    try {
      if (activeBoardId) {
        await updateBoardMutation.mutateAsync({ boardId: activeBoardId, input });
        return;
      }

      const createdBoard = (await createBoardMutation.mutateAsync(input)) as TaskBoardViewDto;
      setActiveBoardId(createdBoard.id);
      setBoardName(createdBoard.name);
      setBoardNameEdited(true);
    } catch {
      // Mutation errors are rendered in the board header.
    }
  }

  async function deleteActiveBoard() {
    if (!activeBoardId) {
      return;
    }

    try {
      await deleteBoardMutation.mutateAsync(activeBoardId);
      setActiveBoardId("");
      setBoardName(getSuggestedBoardName(filters));
      setBoardNameEdited(false);
      setBoardSettings({ ...defaultTaskBoardSettings });
    } catch {
      // Mutation errors are rendered in the board header.
    }
  }

  function selectBoard(boardId: string) {
    if (boardId === "__current__") {
      setActiveBoardId("");
      setBoardName(getSuggestedBoardName(filters));
      setBoardNameEdited(false);
      return;
    }

    const board = (boardsQuery.data as TaskBoardViewsListResponse | undefined)?.items.find(
      (item) => item.id === boardId
    );
    if (!board) {
      return;
    }

    setActiveBoardId(board.id);
    setBoardName(board.name);
    setBoardNameEdited(true);
    setBoardSettings(normalizeTaskBoardSettings(board.settings));
    setViewMode("kanban");
    setFilters(fromBoardFilters(board.filters));
    resetPagination();
  }

  return {
    activeBoardId,
    boardMutationError:
      createBoardMutation.error ?? updateBoardMutation.error ?? deleteBoardMutation.error,
    boardName,
    boardSettings,
    boardsQuery,
    deleteActiveBoard,
    filters,
    saveBoard,
    selectBoard,
    savingBoard:
      createBoardMutation.isPending ||
      updateBoardMutation.isPending ||
      deleteBoardMutation.isPending,
    updateBoardName,
    updateBoardSettings,
    updateFilters
  };
}
