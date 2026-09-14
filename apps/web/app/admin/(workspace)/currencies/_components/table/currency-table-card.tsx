import { CircleDollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminTableHeader } from "../../../_components/admin-table-header";
import { adminSurfaceClassName } from "../../../_constants/dashboard";
import type {
  CurrencyDto,
  CurrencySortDirection,
  CurrencySortKey,
  CurrencyStatusFilter,
  TenantCurrencyListResponseDto
} from "../../_types/currencies.types";
import { CurrencyTableProvider, useCurrencyTableContext } from "./context/currency-table-context";
import { CurrencyTableToolbar } from "./controls/currency-table-toolbar";
import { CurrencyTable } from "./currency-table";

export function CurrencyTableCard({
  currencies,
  error,
  loading,
  pageIndex,
  pageInfo,
  search,
  sortDirection,
  sortKey,
  status,
  onAddSuccess,
  onNextPage,
  onPreviousPage,
  onSearchChange,
  onSort,
  onStatusChange
}: {
  currencies: CurrencyDto[];
  error: Error | null;
  loading: boolean;
  pageIndex: number;
  pageInfo: TenantCurrencyListResponseDto["pageInfo"] | undefined;
  search: string;
  sortDirection: CurrencySortDirection;
  sortKey: CurrencySortKey;
  status: CurrencyStatusFilter;
  onAddSuccess: () => void;
  onNextPage: (cursor: string) => void;
  onPreviousPage: () => void;
  onSearchChange: (search: string) => void;
  onSort: (key: CurrencySortKey) => void;
  onStatusChange: (status: CurrencyStatusFilter) => void;
}) {
  return (
    <CurrencyTableProvider
      currencies={currencies}
      error={error}
      loading={loading}
      pageIndex={pageIndex}
      pageInfo={pageInfo}
      sortDirection={sortDirection}
      sortKey={sortKey}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      onSort={onSort}
    >
      <Card
        data-admin-surface
        className={`${adminSurfaceClassName} flex min-h-0 flex-1 flex-col overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
      >
        <CurrencyTableCardHeader
          search={search}
          sortDirection={sortDirection}
          sortKey={sortKey}
          status={status}
          onAddSuccess={onAddSuccess}
          onSearchChange={onSearchChange}
          onSort={onSort}
          onStatusChange={onStatusChange}
        />
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-visible px-3 pb-2 md:px-4 lg:overflow-hidden">
          <CurrencyTable />
        </CardContent>
      </Card>
    </CurrencyTableProvider>
  );
}

function CurrencyTableCardHeader({
  search,
  sortDirection,
  sortKey,
  status,
  onAddSuccess,
  onSearchChange,
  onSort,
  onStatusChange
}: {
  search: string;
  sortDirection: CurrencySortDirection;
  sortKey: CurrencySortKey;
  status: CurrencyStatusFilter;
  onAddSuccess: () => void;
  onSearchChange: (search: string) => void;
  onSort: (key: CurrencySortKey) => void;
  onStatusChange: (status: CurrencyStatusFilter) => void;
}) {
  const { table } = useCurrencyTableContext();

  return (
    <AdminTableHeader
      actions={
        <CurrencyTableToolbar
          search={search}
          sortDirection={sortDirection}
          sortKey={sortKey}
          status={status}
          table={table}
          onAddSuccess={onAddSuccess}
          onSearchChange={onSearchChange}
          onSort={onSort}
          onStatusChange={onStatusChange}
        />
      }
      icon={CircleDollarSign}
      title="Monedas"
    />
  );
}
