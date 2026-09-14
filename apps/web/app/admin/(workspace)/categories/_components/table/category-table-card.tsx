import { Tags } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminTableHeader } from "../../../_components/admin-table-header";
import { adminSurfaceClassName } from "../../../_constants/dashboard";
import type {
  CategoryDto,
  CategoryFiltersState,
  CategoryListResponseDto,
  CategorySortDirection,
  CategorySortKey
} from "../../_types/categories.types";
import { CategoryTableProvider, useCategoryTableContext } from "./context/category-table-context";
import { CategoryTableToolbar } from "./controls/category-table-toolbar";
import { CategoryTable } from "./category-table";

export function CategoryTableCard({
  categories,
  error,
  filters,
  loading,
  pageIndex,
  pageInfo,
  sortDirection,
  sortKey,
  onApplyFilters,
  onClearFilters,
  onCreateSuccess,
  onNextPage,
  onPreviousPage,
  onSort
}: {
  categories: CategoryDto[];
  error: Error | null;
  filters: CategoryFiltersState;
  loading: boolean;
  pageIndex: number;
  pageInfo: CategoryListResponseDto["pageInfo"] | undefined;
  sortDirection: CategorySortDirection;
  sortKey: CategorySortKey;
  onApplyFilters: (filters: CategoryFiltersState) => void;
  onClearFilters: () => void;
  onCreateSuccess: () => void;
  onNextPage: (cursor: string) => void;
  onPreviousPage: () => void;
  onSort: (key: CategorySortKey) => void;
}) {
  return (
    <CategoryTableProvider
      categories={categories}
      error={error}
      loading={loading}
      pageIndex={pageIndex}
      pageInfo={pageInfo}
      sortDirection={sortDirection}
      sortKey={sortKey}
      onMutationSuccess={onCreateSuccess}
      onNextPage={onNextPage}
      onPreviousPage={onPreviousPage}
      onSort={onSort}
    >
      <Card
        data-admin-surface
        className={`${adminSurfaceClassName} flex min-h-0 flex-1 flex-col overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
      >
        <CategoryTableCardHeader
          filters={filters}
          sortDirection={sortDirection}
          sortKey={sortKey}
          onApplyFilters={onApplyFilters}
          onClearFilters={onClearFilters}
          onCreateSuccess={onCreateSuccess}
          onSort={onSort}
        />
        <CardContent className="flex min-h-0 flex-1 flex-col px-3 pb-2 md:px-4">
          <CategoryTable />
        </CardContent>
      </Card>
    </CategoryTableProvider>
  );
}

function CategoryTableCardHeader({
  filters,
  sortDirection,
  sortKey,
  onApplyFilters,
  onClearFilters,
  onCreateSuccess,
  onSort
}: {
  filters: CategoryFiltersState;
  sortDirection: CategorySortDirection;
  sortKey: CategorySortKey;
  onApplyFilters: (filters: CategoryFiltersState) => void;
  onClearFilters: () => void;
  onCreateSuccess: () => void;
  onSort: (key: CategorySortKey) => void;
}) {
  const { table } = useCategoryTableContext();

  return (
    <AdminTableHeader
      actions={
        <CategoryTableToolbar
          filters={filters}
          sortDirection={sortDirection}
          sortKey={sortKey}
          table={table}
          onApplyFilters={onApplyFilters}
          onClearFilters={onClearFilters}
          onCreateSuccess={onCreateSuccess}
          onSort={onSort}
        />
      }
      icon={Tags}
      title="Categorias"
    />
  );
}
