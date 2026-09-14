"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { TasksViewMode } from "../../_types/task-list.types";

export function TasksViewTransition({
  children,
  viewMode
}: {
  children: ReactNode;
  viewMode: TasksViewMode;
}) {
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 flex min-h-0 flex-col"
          exit={{ opacity: 0, y: -6 }}
          initial={{ opacity: 0, y: 8 }}
          key={viewMode}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
