"use client";
import { Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NewsletterFilter, NewsletterListItem } from "../_api/newsletters.api";
import {
  NewsletterMetrics,
  NewsletterPagination,
  NewsletterToolbar,
  type NewsletterMetricsData
} from "./newsletter-list-controls";
import { NewsletterCard } from "./newsletter-card";

export function NewsletterList({
  items,
  loading,
  busy,
  error,
  cursor,
  metrics,
  filter,
  pageIndex,
  onFilter,
  onCreate,
  onOpen,
  onCancel,
  onDelete,
  onRetry,
  onMore,
  onPrevious
}: {
  items: NewsletterListItem[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  cursor: string | null;
  metrics: NewsletterMetricsData;
  filter: NewsletterFilter;
  pageIndex: number;
  onFilter: (filter: NewsletterFilter) => void;
  onCreate: () => void;
  onOpen: (item: NewsletterListItem) => void;
  onCancel: (item: NewsletterListItem) => void;
  onDelete: (item: NewsletterListItem) => void;
  onRetry: () => void;
  onMore: () => void;
  onPrevious: () => void;
}) {
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Newsletter</h1>
          <p className="text-sm text-muted-foreground">
            Creá publicaciones visuales para todos los estudios.
          </p>
        </div>
      </div>
      <NewsletterMetrics metrics={metrics} />
      <div className="grid gap-4 rounded-[24px] bg-card p-4 shadow-[var(--admin-card-shadow)] sm:p-5">
        <NewsletterToolbar filter={filter} busy={busy} onFilter={onFilter} onCreate={onCreate} />
        {error && (
          <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
            {error}
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        )}
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando newsletters…</p>
        ) : !items.length ? (
          <div className="grid place-items-center gap-3 rounded-2xl bg-card py-12 text-center shadow-[var(--admin-card-shadow)]">
            <Brush className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay newsletters en esta vista.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <NewsletterCard
                key={item.id}
                item={item}
                busy={busy}
                onOpen={onOpen}
                onCancel={onCancel}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
        <NewsletterPagination
          loading={loading}
          busy={busy}
          pageIndex={pageIndex}
          cursor={cursor}
          onPrevious={onPrevious}
          onMore={onMore}
        />
      </div>
    </section>
  );
}
