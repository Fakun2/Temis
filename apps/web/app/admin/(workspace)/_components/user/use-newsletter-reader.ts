"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  isNewsletterContentValid,
  type NewsletterDetail
} from "@/components/newsletter/newsletter-content-v2";
import { dashboardHttpClient } from "@/lib/http";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";

export type NewsletterSummary = {
  unreadCount: number;
  oldestUnreadId: string | null;
  latestId: string | null;
};
type ListItem = { id: string; title: string; isRead: boolean };
type Page = { items: ListItem[]; nextCursor: string | null };
export function useNewsletterReader(open: boolean) {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extra, setExtra] = useState<ListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setExtra([]);
      setCursor(null);
      setLoadError(null);
    }
  }, [open]);
  const list = useDashboardQuery({
    queryKey: ["newsletter-list"],
    enabled: open,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const current = await dashboardHttpClient.request<NewsletterSummary>({
        path: "/announcements/newsletters/summary"
      });
      const initialId = current.oldestUnreadId ?? current.latestId;
      let page: Page;
      let next: string | null = null;
      const items: ListItem[] = [];
      do {
        page = await dashboardHttpClient.request<Page>({
          path: "/announcements/newsletters",
          params: next ? { cursor: next } : undefined
        });
        items.push(...page.items);
        next = page.nextCursor;
      } while (next && initialId && !items.some((item) => item.id === initialId));
      return { items, nextCursor: next, initialId };
    }
  });
  const detail = useDashboardQuery({
    queryKey: ["newsletter-detail", selectedId],
    enabled: open && Boolean(selectedId),
    queryFn: () =>
      dashboardHttpClient.request<NewsletterDetail>({
        path: `/announcements/newsletters/${selectedId}`
      })
  });
  useEffect(() => {
    if (open && list.data && !list.isFetching) {
      setSelectedId((current) => current ?? list.data.initialId ?? list.data.items[0]?.id ?? null);
      setExtra([]);
      setCursor(list.data.nextCursor);
      setLoadError(null);
    }
  }, [open, list.data, list.isFetching]);
  useEffect(() => {
    if (
      !open ||
      !detail.data ||
      detail.data.id !== selectedId ||
      !detail.tenantId ||
      !isNewsletterContentValid(detail.data.content)
    )
      return;
    let cancelled = false;
    void dashboardHttpClient
      .request({ path: `/announcements/newsletters/${detail.data.id}/read`, method: "POST" })
      .then(() => {
        if (!cancelled)
          void client.invalidateQueries({ queryKey: [detail.tenantId, "newsletter-summary"] });
      })
      .catch(() => {
        if (!cancelled)
          setLoadError(
            "No se pudo registrar la lectura. Volvé a abrir la publicación para reintentar."
          );
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedId, detail.data, detail.tenantId, client]);
  const items = [...(list.data?.items ?? []), ...extra];
  const index = items.findIndex((item) => item.id === selectedId);
  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const page = await dashboardHttpClient.request<Page>({
        path: "/announcements/newsletters",
        params: { cursor }
      });
      setExtra((old) => [...old, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setLoadError("No se pudieron cargar publicaciones anteriores.");
    } finally {
      setLoadingMore(false);
    }
  }
  return {
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
  };
}
