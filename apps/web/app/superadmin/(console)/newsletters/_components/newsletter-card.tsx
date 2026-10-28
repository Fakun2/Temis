"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brush, Eye, FilePenLine, MoreHorizontal, Trash2, XCircle } from "lucide-react";
import { NewsletterContentView } from "@/components/newsletter/newsletter-content-v2";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { getNewsletter, type NewsletterListItem } from "../_api/newsletters.api";
import { isNewsletterCanvasEmpty, lifecycle } from "../_lib/newsletter-builder-model";

export function LazyPreview({ item }: { item: NewsletterListItem }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const query = useQuery({
    queryKey: ["platform", "newsletters", "detail", item.id, item.revision],
    queryFn: () => getNewsletter(item.id),
    enabled: visible
  });
  const content = query.data;
  const failed = query.isError;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const isEmpty = content ? isNewsletterCanvasEmpty(content) : false;
  return (
    <div
      ref={ref}
      className="relative h-32 overflow-hidden bg-secondary/35"
      aria-label="Vista previa de la newsletter"
    >
      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <span className="flex size-9 items-center justify-center rounded-xl bg-card/80">
            <Brush className="size-4" aria-hidden="true" />
          </span>
          <span className="text-xs">Lienzo vacío</span>
        </div>
      ) : content?.content ? (
        <div
          className="pointer-events-none origin-top-left scale-[0.4] p-4"
          style={{ width: "250%" }}
          aria-hidden="true"
        >
          <NewsletterContentView
            content={content.content}
            assetPrefix="/api/superadmin/newsletters/assets"
            title={content.title}
            excerpt={content.excerpt ?? ""}
          />
        </div>
      ) : (
        <p className="p-4 text-xs text-muted-foreground">
          {failed ? "No se pudo cargar la vista previa." : "Cargando vista previa…"}
        </p>
      )}
    </div>
  );
}

export function NewsletterCard({
  item,
  busy,
  onOpen,
  onCancel,
  onDelete
}: {
  item: NewsletterListItem;
  busy: boolean;
  onOpen: (item: NewsletterListItem) => void;
  onCancel: (item: NewsletterListItem) => void;
  onDelete: (item: NewsletterListItem) => void;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-border/30 bg-background shadow-[0_3px_12px_-8px_rgba(15,23,42,0.18)]">
      <LazyPreview item={item} />
      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{item.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{lifecycle(item)}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={busy}
              aria-label={`Acciones para ${item.title}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem onSelect={() => onOpen(item)}>
              {item.status === "draft" ? <FilePenLine /> : <Eye />}
              {item.status === "draft" ? "Abrir builder" : "Ver newsletter"}
            </DropdownMenuItem>
            {item.status === "published" && (
              <DropdownMenuItem onSelect={() => onCancel(item)}>
                <XCircle />
                Desactivar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(item)}
            >
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
