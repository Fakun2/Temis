"use client";

import { UnauthorizedState } from "@/components/ui/not-found";
import { AdminMetricsSkeletonGrid } from "../_components/admin-skeletons";
import { RequirePermission } from "../_components/auth";
import { ClientsMetrics } from "./_components/clients-metrics";
import { ClientsTableCard } from "./_components/clients-table-card";
import { useClientsPageState } from "./_hooks/use-clients-page-state";
import { useClientsQuery } from "./_hooks/use-clients-query";

export default function ClientsPage() {
  const pageState = useClientsPageState();
  const clientsQuery = useClientsQuery(pageState.queryParams);

  if (!clientsQuery.hasSession) {
    return <RestrictedClients />;
  }

  return (
    <RequirePermission permissions={["clients:read"]} fallback={<RestrictedClients />}>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-none md:gap-4">
        {clientsQuery.isLoading && !clientsQuery.data ? (
          <AdminMetricsSkeletonGrid />
        ) : (
          <ClientsMetrics data={clientsQuery.data} />
        )}

        <ClientsTableCard
          data={clientsQuery.data}
          error={clientsQuery.error}
          hasActiveFilters={pageState.hasActiveFilters}
          loading={clientsQuery.isLoading || clientsQuery.isFetching}
          pageIndex={pageState.pageIndex}
          search={pageState.search}
          status={pageState.status}
          type={pageState.type}
          onArchived={pageState.resetPagination}
          onClearFilters={pageState.clearFilters}
          onNextPage={pageState.nextPage}
          onPreviousPage={pageState.previousPage}
          onRetry={() => void clientsQuery.refetch()}
          onSearchChange={pageState.setSearch}
          onStatusChange={pageState.updateStatus}
          onTypeChange={pageState.updateType}
        />
      </div>
    </RequirePermission>
  );
}

function RestrictedClients() {
  return (
    <UnauthorizedState
      title="Clientes restringidos"
      description="Necesitas permisos adicionales para acceder a los clientes del estudio."
    />
  );
}
