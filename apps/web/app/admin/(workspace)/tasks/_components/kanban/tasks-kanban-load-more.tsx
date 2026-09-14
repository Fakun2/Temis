"use client";

import { useEffect, type RefObject } from "react";
import { Loader2 } from "lucide-react";

export function TasksKanbanLoadMore({
  canLoadMore,
  isLoading,
  onLoadMore,
  rootRef
}: {
  canLoadMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !canLoadMore) {
      return;
    }

    const sentinel = root.querySelector<HTMLDivElement>("[data-tasks-kanban-sentinel]");
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { root, rootMargin: "240px 0px", threshold: 0.01 }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [canLoadMore, isLoading, onLoadMore, rootRef]);

  return (
    <div
      className="grid min-h-16 place-items-center py-3 text-sm text-muted-foreground"
      data-tasks-kanban-sentinel
    >
      {isLoading ? (
        <div className="grid w-full gap-3">
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando mas tareas
          </span>
          <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                className="h-20 animate-pulse rounded-2xl border border-border/40 bg-muted/45"
                key={index}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
