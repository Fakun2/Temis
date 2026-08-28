"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClientsPagination({
  busy,
  hasNextPage,
  nextCursor,
  pageIndex,
  pageRowsLength,
  onNextPage,
  onPreviousPage
}: {
  busy: boolean;
  hasNextPage: boolean;
  nextCursor: string | null;
  pageIndex: number;
  pageRowsLength: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-t border-border/40 px-1">
      <p className="text-xs text-muted-foreground">
        {pageRowsLength === 0 ? "0 resultados" : `${pageRowsLength} resultados en esta página`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 border-border/50 px-2.5"
          disabled={busy || pageIndex === 0}
          onClick={onPreviousPage}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="min-w-16 text-center text-xs text-muted-foreground">
          Página {pageIndex + 1}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-8 border-border/50 px-2.5"
          disabled={busy || !hasNextPage || !nextCursor}
          onClick={onNextPage}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
