"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, History, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle
} from "@/components/ui/dialog";
import { NewsletterContentView } from "@/components/newsletter/newsletter-content-v2";
import { useNewsletterReader } from "./use-newsletter-reader";

export type { NewsletterSummary } from "./use-newsletter-reader";

export function NewsletterDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    list,
    detail,
    items,
    index,
    selectedId,
    setSelectedId,
    cursor,
    loadingMore,
    loadError,
    loadMore
  } = useNewsletterReader(open);
  const contentWidth =
    detail.data?.content?.version === 2
      ? { compact: 640, standard: 720, wide: 880 }[detail.data.content.theme.width]
      : 720;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        overlayClassName="data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
        showCloseButton={false}
        style={{ maxWidth: contentWidth }}
        className="group flex max-h-[92vh] w-screen flex-col gap-0 overflow-hidden border-0 p-0 data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:ease-out data-[state=closed]:ease-in motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
      >
        <DialogTitle className="sr-only">Newsletter</DialogTitle>
        <DialogDescription className="sr-only">
          Novedades, mejoras y anuncios de Temis.
        </DialogDescription>
        <DialogClose
          aria-label="Cerrar newsletter"
          className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full border border-border/50 bg-background/90 text-foreground opacity-0 shadow-sm transition-opacity hover:bg-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 [@media(hover:none)]:h-10 [@media(hover:none)]:w-10 [@media(hover:none)]:opacity-100 motion-reduce:transition-none"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </DialogClose>
        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
          {list.isLoading ||
          (list.isFetching && !selectedId) ||
          (selectedId && detail.isLoading) ? (
            <p role="status" className="p-8">
              Cargando newsletter…
            </p>
          ) : list.error || detail.error ? (
            <div role="alert" className="space-y-3 p-8">
              <p>No se pudo cargar la newsletter.</p>
              <Button
                variant="outline"
                onClick={() => {
                  void list.refetch();
                  void detail.refetch();
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : detail.data ? (
            <article className="mx-auto max-w-4xl">
              <NewsletterContentView
                content={detail.data.content}
                assetPrefix="/api/announcements/newsletters/assets"
                title={detail.data.title}
                excerpt={detail.data.excerpt}
                compactPadding
              />
            </article>
          ) : (
            <p className="p-8 text-muted-foreground">Todavía no hay newsletters disponibles.</p>
          )}
          {loadError && (
            <p role="alert" className="p-4 text-sm text-destructive">
              {loadError}
            </p>
          )}
        </div>
        {(items.length > 1 || cursor) && (
          <nav
            aria-label="Navegación de newsletters"
            className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-full border border-border/50 bg-background/95 p-0.5 text-foreground opacity-0 shadow-sm transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 motion-reduce:transition-none"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full [@media(hover:none)]:h-10 [@media(hover:none)]:w-10"
              aria-label="Newsletter más reciente"
              disabled={index <= 0}
              onClick={() => setSelectedId(items[index - 1]?.id ?? null)}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <span className="px-1 text-xs text-muted-foreground" aria-live="polite">
              {index >= 0 ? `${index + 1} / ${items.length}${cursor ? "+" : ""}` : ""}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full [@media(hover:none)]:h-10 [@media(hover:none)]:w-10"
              aria-label="Newsletter anterior"
              disabled={index < 0 || index >= items.length - 1}
              onClick={() => setSelectedId(items[index + 1]?.id ?? null)}
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            {cursor && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full [@media(hover:none)]:h-10 [@media(hover:none)]:w-10"
                aria-label={
                  loadingMore
                    ? "Cargando publicaciones anteriores"
                    : "Cargar publicaciones anteriores"
                }
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                <History className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </nav>
        )}
      </DialogContent>
    </Dialog>
  );
}
