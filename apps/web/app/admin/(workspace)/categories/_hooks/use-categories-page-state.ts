"use client";

import { useState } from "react";
import type {
  CategorySortDirection,
  CategorySortKey,
  CategoryFiltersState
} from "../_types/categories.types";
import {
  defaultCategoryFilters,
  normalizeCategoryFilters
} from "../_utils/category-filters";

export function useCategoriesPageState() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [filters, setFilters] = useState<CategoryFiltersState>(defaultCategoryFilters);
  const [sortKey, setSortKey] = useState<CategorySortKey>("name");
  const [sortDirection, setSortDirection] = useState<CategorySortDirection>("asc");

  function resetPagination() {
    setCursor(null);
    setCursorStack([]);
    setPageIndex(0);
  }

  function sortBy(key: CategorySortKey) {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
        return currentKey;
      }

      setSortDirection("asc");
      return key;
    });
    resetPagination();
  }

  function applyFilters(nextFilters: CategoryFiltersState) {
    setFilters(normalizeCategoryFilters(nextFilters));
    resetPagination();
  }

  function clearFilters() {
    setFilters(defaultCategoryFilters);
    resetPagination();
  }

  function nextPage(nextCursor: string) {
    setCursorStack((current) => [...current, cursor ?? ""]);
    setCursor(nextCursor);
    setPageIndex((current) => current + 1);
  }

  function previousPage() {
    setCursorStack((current) => {
      const previousCursor = current.at(-1) ?? null;
      setCursor(previousCursor === "" ? null : previousCursor);
      return current.slice(0, -1);
    });
    setPageIndex((current) => Math.max(0, current - 1));
  }

  return {
    cursor,
    cursorStack,
    filters,
    pageIndex,
    sortDirection,
    sortKey,
    applyFilters,
    clearFilters,
    nextPage,
    previousPage,
    resetPagination,
    sortBy
  };
}
