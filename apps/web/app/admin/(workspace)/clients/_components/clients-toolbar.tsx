"use client";

import type { ClientStatusFilter, ClientTypeFilter } from "../_hooks/use-clients-page-state";
import { ClientsFiltersPopover } from "./clients-filters-popover";

export function ClientsToolbar({
  busy,
  hasActiveFilters,
  search,
  status,
  type,
  onClearFilters,
  onSearchChange,
  onStatusChange,
  onTypeChange
}: {
  busy: boolean;
  hasActiveFilters: boolean;
  search: string;
  status: ClientStatusFilter;
  type: ClientTypeFilter;
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ClientStatusFilter) => void;
  onTypeChange: (value: ClientTypeFilter) => void;
}) {
  return (
    <ClientsFiltersPopover
      disabled={busy}
      hasActiveFilters={hasActiveFilters}
      search={search}
      status={status}
      type={type}
      onClearFilters={onClearFilters}
      onSearchChange={onSearchChange}
      onStatusChange={onStatusChange}
      onTypeChange={onTypeChange}
    />
  );
}
