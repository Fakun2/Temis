"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { TasksViewMode } from "../_components/task-list-types";

export function useTasksViewMode() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode: TasksViewMode = searchParams.get("view") === "kanban" ? "kanban" : "table";

  function setViewMode(nextViewMode: TasksViewMode) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextViewMode === "kanban") {
      nextParams.set("view", "kanban");
    } else {
      nextParams.delete("view");
    }

    const queryString = nextParams.toString();
    router.replace(queryString ? `/admin/tasks?${queryString}` : "/admin/tasks", {
      scroll: false
    });
  }

  return { setViewMode, viewMode };
}
