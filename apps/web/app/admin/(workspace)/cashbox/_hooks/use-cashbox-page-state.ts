"use client";

import { useState } from "react";

export function useCashboxPageState() {
  const [currencyCode, setCurrencyCode] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  function resetPagination() {
    setCursor(null);
    setCursorStack([]);
    setPageIndex(0);
  }

  function updateCurrencyCode(nextCurrencyCode: string) {
    setCurrencyCode(nextCurrencyCode);
    resetPagination();
  }

  function updateDate(nextDate: string) {
    setDate(nextDate);
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
    currencyCode,
    date,
    pageIndex,
    nextPage,
    previousPage,
    resetPagination,
    updateCurrencyCode,
    updateDate
  };
}
