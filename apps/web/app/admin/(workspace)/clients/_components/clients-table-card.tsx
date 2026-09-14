"use client";

import { UsersRound } from "lucide-react";
import type { ClientsListResponseDto } from "@temis/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { AdminTableHeader } from "../../_components/admin-table-header";
import { Can } from "../../_components/auth";
import { adminSurfaceClassName } from "../../_constants/dashboard";
import type { ClientStatusFilter, ClientTypeFilter } from "../_hooks/use-clients-page-state";
import { ClientSheet } from "./client-sheet";
import { ClientsPagination } from "./clients-pagination";
import { ClientsTable } from "./clients-table";
import { ClientsToolbar } from "./clients-toolbar";

export function ClientsTableCard({
  data,
  error,
  hasActiveFilters,
  loading,
  pageIndex,
  search,
  status,
  type,
  onArchived,
  onClearFilters,
  onNextPage,
  onPreviousPage,
  onRetry,
  onSearchChange,
  onStatusChange,
  onTypeChange
}: {
  data?: ClientsListResponseDto;
  error: Error | null;
  hasActiveFilters: boolean;
  loading: boolean;
  pageIndex: number;
  search: string;
  status: ClientStatusFilter;
  type: ClientTypeFilter;
  onArchived: () => void;
  onClearFilters: () => void;
  onNextPage: (cursor: string) => void;
  onPreviousPage: () => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ClientStatusFilter) => void;
  onTypeChange: (value: ClientTypeFilter) => void;
}) {
  const clients = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  return (
    <Card
      data-admin-surface
      className={`${adminSurfaceClassName} flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
    >
      <AdminTableHeader
        actions={
          <>
            <ClientsToolbar
              busy={loading && Boolean(data)}
              hasActiveFilters={hasActiveFilters}
              search={search}
              status={status}
              type={type}
              onClearFilters={onClearFilters}
              onSearchChange={onSearchChange}
              onStatusChange={onStatusChange}
              onTypeChange={onTypeChange}
            />
            <Can permissions={["clients:create"]}>
              <ClientSheet />
            </Can>
          </>
        }
        icon={UsersRound}
        title="Clientes"
      />
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-visible px-3 md:px-4 lg:overflow-hidden">
        <ClientsTable
          clients={clients}
          error={error}
          hasActiveFilters={hasActiveFilters}
          loading={loading}
          onArchived={onArchived}
          onClearFilters={onClearFilters}
          onRetry={onRetry}
        />
        <ClientsPagination
          busy={loading}
          hasNextPage={pageInfo?.hasNextPage ?? false}
          nextCursor={pageInfo?.nextCursor ?? null}
          pageIndex={pageIndex}
          pageRowsLength={clients.length}
          onNextPage={() => {
            if (pageInfo?.nextCursor) {
              onNextPage(pageInfo.nextCursor);
            }
          }}
          onPreviousPage={onPreviousPage}
        />
      </CardContent>
    </Card>
  );
}
