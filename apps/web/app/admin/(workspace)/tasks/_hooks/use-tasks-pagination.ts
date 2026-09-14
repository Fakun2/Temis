"use client";

import { useState } from "react";

export function useTasksPagination() {
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack.at(-1) || undefined;

  function resetPagination() {
    setCursorStack([]);
  }

  function goBack() {
    setCursorStack((currentStack) => currentStack.slice(0, -1));
  }

  function goForward(nextCursor?: string | null) {
    if (!nextCursor) {
      return;
    }

    setCursorStack((currentStack) => [...currentStack, nextCursor]);
  }

  return {
    cursorStack,
    currentCursor,
    goBack,
    goForward,
    resetPagination
  };
}
