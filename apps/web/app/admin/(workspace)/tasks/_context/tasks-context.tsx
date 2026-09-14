"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTasksController, type TasksController } from "../_hooks/use-tasks-controller";

const TasksContext = createContext<TasksController | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const value = useTasksController();

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasksContext() {
  const context = useContext(TasksContext);

  if (!context) {
    throw new Error("useTasksContext must be used inside TasksProvider");
  }

  return context;
}
