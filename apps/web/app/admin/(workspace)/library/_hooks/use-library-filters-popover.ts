"use client";

import { useState, type FormEvent } from "react";
import type { LibraryFilters } from "../_types/library-filters.types";
import type { DocumentMimeGroup } from "../_types/library.types";

type LibraryIdFilterKey = "categoryId";

export function useLibraryFiltersPopover({
  filters,
  onChange
}: {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
}) {
  const [idDialog, setIdDialog] = useState<{
    key: LibraryIdFilterKey;
    label: string;
    open: boolean;
    title: string;
    value: string;
  }>(getIdDialogState("categoryId", ""));

  function openIdDialog(key: LibraryIdFilterKey) {
    setIdDialog(getIdDialogState(key, filters[key], true));
  }

  function closeIdDialog() {
    setIdDialog((current) => ({ ...current, open: false }));
  }

  function updateIdDialogValue(value: string) {
    setIdDialog((current) => ({ ...current, value }));
  }

  function submitIdDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange({ ...filters, [idDialog.key]: idDialog.value.trim() });
    closeIdDialog();
  }

  function toggleMimeGroup(mimeGroup: DocumentMimeGroup, checked: boolean) {
    onChange({
      ...filters,
      mimeGroups: checked
        ? [...new Set([...filters.mimeGroups, mimeGroup])]
        : filters.mimeGroups.filter((item) => item !== mimeGroup)
    });
  }

  return {
    closeIdDialog,
    idDialog,
    openIdDialog,
    setIdDialog,
    submitIdDialog,
    toggleMimeGroup,
    updateIdDialogValue
  };
}

function getIdDialogState(key: LibraryIdFilterKey, value: string, open = false) {
  return {
    key,
    label: "ID de la categoria",
    open,
    title: "Filtrar por categoria",
    value
  };
}
