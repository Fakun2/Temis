"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNewsletters, type NewsletterFilter } from "../_api/newsletters.api";
import { message } from "../_lib/newsletter-builder-model";

const queryKey = ["platform", "newsletters", "list"] as const;
const emptyMetrics = { total: 0, active: 0, inactive: 0, scheduled: 0 };

export function useNewsletterList() {
  const client = useQueryClient();
  const [filter, setFilter] = useState<NewsletterFilter>("all");
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const query = useQuery({
    queryKey: [...queryKey, filter, pageCursors[pageIndex]],
    queryFn: () => listNewsletters(pageCursors[pageIndex], filter),
    placeholderData: keepPreviousData
  });
  const cursor = query.data?.nextCursor ?? null;
  async function load() {
    await client.invalidateQueries({ queryKey });
  }
  function changeFilter(next: NewsletterFilter) {
    setPageCursors([undefined]);
    setPageIndex(0);
    setFilter(next);
  }
  function loadMore() {
    if (cursor) {
      setPageCursors((current) => [...current.slice(0, pageIndex + 1), cursor]);
      setPageIndex((current) => current + 1);
    }
  }
  function previousPage() {
    setPageIndex((current) => Math.max(0, current - 1));
  }
  return {
    items: query.data?.items ?? [],
    metrics: query.data?.metrics ?? emptyMetrics,
    cursor,
    filter,
    pageIndex,
    loading: query.isLoading || query.isFetching,
    error: query.error ? message(query.error) : null,
    changeFilter,
    loadMore,
    previousPage,
    load
  };
}
