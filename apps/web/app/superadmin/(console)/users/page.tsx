"use client";

import { PlatformUsersMetrics } from "./_components/platform-users-metrics";
import { PlatformUsersTableCard } from "./_components/platform-users-table-card";
import { usePlatformUsersPage } from "./_hooks/use-platform-users-page";

export default function PlatformUsersPage() {
  const page = usePlatformUsersPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 shrink-0">
        <PlatformUsersMetrics
          loading={page.summaryQuery.isLoading}
          summary={page.summaryQuery.data}
        />
      </div>
      <PlatformUsersTableCard
        busy={page.usersQuery.isLoading || page.usersQuery.isFetching}
        data={page.usersQuery.data}
        error={page.usersQuery.error}
        hasActiveFilters={page.hasActiveFilters}
        pageIndex={page.pageIndex}
        search={page.search}
        sortBy={page.sortBy}
        sortDirection={page.sortDirection}
        status={page.status}
        onClearFilters={page.clearFilters}
        onNextPage={page.nextPage}
        onPreviousPage={page.previousPage}
        onRefresh={page.refresh}
        onSearchChange={page.updateSearch}
        onSortChange={page.changeSort}
        onStatusChange={page.updateStatus}
      />
    </div>
  );
}
