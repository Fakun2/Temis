"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TasksViewMode } from "../_components/task-list-types";
import { isTenantTasksDataQuery } from "../_utils/tasks-query-cache";

export function useTasksTableSync({
  flushTaskBuffer,
  pendingTableRefresh,
  setPendingTableRefresh,
  viewMode
}: {
  flushTaskBuffer: () => Promise<void>;
  pendingTableRefresh: boolean;
  setPendingTableRefresh: (pending: boolean) => void;
  viewMode: TasksViewMode;
}) {
  const queryClient = useQueryClient();
  const tableSyncingRef = useRef(false);
  const [isTasksSyncing, setIsTasksSyncing] = useState(false);

  function markTableSyncing() {
    tableSyncingRef.current = true;
    setPendingTableRefresh(true);
    setIsTasksSyncing(true);
  }

  useEffect(() => {
    if (!pendingTableRefresh || viewMode !== "table") {
      return;
    }

    let cancelled = false;

    async function syncTasksView() {
      try {
        await flushTaskBuffer();
        await queryClient.invalidateQueries({ predicate: isTenantTasksDataQuery });
        await queryClient.refetchQueries({ predicate: isTenantTasksDataQuery, type: "active" });
      } finally {
        if (!cancelled) {
          tableSyncingRef.current = false;
          setPendingTableRefresh(false);
          setIsTasksSyncing(false);
        }
      }
    }

    void syncTasksView();

    return () => {
      cancelled = true;
    };
  }, [flushTaskBuffer, pendingTableRefresh, queryClient, setPendingTableRefresh, viewMode]);

  return {
    isTasksSyncing,
    markTableSyncing,
    tableSyncingRef
  };
}
