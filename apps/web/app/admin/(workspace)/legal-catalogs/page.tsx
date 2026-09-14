"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Building2,
  ChevronLeft,
  ChevronRight,
  Gavel,
  MapPinned,
  XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { UnauthorizedState } from "@/components/ui/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminMetricsGrid } from "../_components/admin-metrics-grid";
import { AdminMetricsSkeletonGrid } from "../_components/admin-skeletons";
import { AdminTableHeader } from "../_components/admin-table-header";
import { AdminTableHeaderActionButton } from "../_components/admin-table-header-action-button";
import { RequirePermission } from "../_components/auth";
import { adminSurfaceClassName } from "../_constants/dashboard";
import { useForumsQuery, useProvincesQuery } from "./_hooks/use-legal-catalogs-query";
import type {
  Forum,
  LegalCatalogPage,
  LegalCatalogSort,
  LegalCatalogTab,
  Province
} from "./_types/legal-catalogs.types";

const catalogPageSize = 8;
const provinceFilterPageSize = 50;

export default function LegalCatalogsPage() {
  const [tab, setTab] = useState<LegalCatalogTab>("forums");
  const [forumOffset, setForumOffset] = useState(0);
  const [provinceOffset, setProvinceOffset] = useState(0);
  const [sort, setSort] = useState<LegalCatalogSort>("name:asc");
  const [provinceId, setProvinceId] = useState("");

  const forumsQuery = useForumsQuery({
    limit: catalogPageSize,
    offset: forumOffset,
    provinceId: provinceId || undefined,
    sort
  });
  const provincesQuery = useProvincesQuery({
    limit: catalogPageSize,
    offset: provinceOffset,
    sort
  });
  const provinceOptionsQuery = useProvincesQuery({
    limit: provinceFilterPageSize,
    offset: 0,
    sort: "name:asc"
  });

  const currentPageInfo =
    tab === "forums" ? forumsQuery.data?.pageInfo : provincesQuery.data?.pageInfo;
  const provinceOptions = provinceOptionsQuery.data?.items ?? [];

  function updateSort(nextSort: LegalCatalogSort) {
    setSort(nextSort);
    setForumOffset(0);
    setProvinceOffset(0);
  }

  function updateProvinceFilter(nextProvinceId: string) {
    setProvinceId(nextProvinceId);
    setForumOffset(0);
  }

  return (
    <RequirePermission
      mode="any"
      permissions={["forums:read", "provinces:read"]}
      fallback={<RestrictedLegalCatalogs />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-none md:gap-3">
        {(forumsQuery.isLoading && !forumsQuery.data) ||
        (provincesQuery.isLoading && !provincesQuery.data) ? (
          <AdminMetricsSkeletonGrid count={3} />
        ) : (
          <AdminMetricsGrid
            metrics={[
              {
                icon: Gavel,
                label: "Fueros encontrados",
                value: forumsQuery.data?.pageInfo.total ?? 0
              },
              {
                icon: MapPinned,
                label: "Provincias activas",
                value: provincesQuery.data?.pageInfo.total ?? 0
              },
              {
                icon: Building2,
                label: "Items por pagina",
                value: currentPageInfo?.limit ?? catalogPageSize
              }
            ]}
          />
        )}

        <Card
          data-admin-surface
          className={`${adminSurfaceClassName} flex min-h-0 flex-1 flex-col overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
        >
          <AdminTableHeader
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <AdminTableHeaderActionButton
                  icon={Gavel}
                  label="Fueros"
                  tone={tab === "forums" ? "primary" : "secondary"}
                  onClick={() => setTab("forums")}
                />
                <AdminTableHeaderActionButton
                  icon={MapPinned}
                  label="Provincias"
                  tone={tab === "provinces" ? "primary" : "secondary"}
                  onClick={() => setTab("provinces")}
                />
                <CatalogFilters
                  provinceId={provinceId}
                  provinceOptions={provinceOptions}
                  showProvinceFilter={tab === "forums"}
                  sort={sort}
                  onProvinceChange={updateProvinceFilter}
                  onSortChange={updateSort}
                />
              </div>
            }
            icon={Gavel}
            title="Catalogos legales"
          />
          <CardContent className="grid min-h-0 flex-1 grid-rows-[1fr_auto] gap-2 overflow-hidden px-2 py-2 md:px-3 md:py-3">
            {tab === "forums" ? (
              <ForumsPanel
                page={forumsQuery.data}
                error={forumsQuery.error}
                loading={forumsQuery.isLoading}
              />
            ) : (
              <ProvincesPanel
                page={provincesQuery.data}
                error={provincesQuery.error}
                loading={provincesQuery.isLoading}
              />
            )}
            <CatalogPagination
              pageInfo={currentPageInfo}
              onNext={() =>
                tab === "forums"
                  ? setForumOffset((current) => current + catalogPageSize)
                  : setProvinceOffset((current) => current + catalogPageSize)
              }
              onPrevious={() =>
                tab === "forums"
                  ? setForumOffset((current) => Math.max(0, current - catalogPageSize))
                  : setProvinceOffset((current) => Math.max(0, current - catalogPageSize))
              }
            />
          </CardContent>
        </Card>
      </div>
    </RequirePermission>
  );
}

function ForumsPanel({
  error,
  loading,
  page
}: {
  error: Error | null;
  loading: boolean;
  page: LegalCatalogPage<Forum> | undefined;
}) {
  return (
    <CatalogTable
      columns={["Fuero", "Provincia", "Origen", "Estado"]}
      emptyText="Todavia no hay fueros cargados."
      error={error}
      loading={loading}
      rows={(page?.items ?? []).map((forum) => ({
        id: forum.id,
        cells: [
          <CatalogName key="name" description={forum.description} name={forum.name} />,
          forum.province?.province ?? forum.province?.name ?? "Sin provincia",
          forum.isSystem ? "Sistema" : "Custom",
          <StatusPill key="status" active={forum.active} />
        ]
      }))}
    />
  );
}

function ProvincesPanel({
  error,
  loading,
  page
}: {
  error: Error | null;
  loading: boolean;
  page: LegalCatalogPage<Province> | undefined;
}) {
  return (
    <CatalogTable
      columns={["Provincia", "Codigo", "Pais", "Estado"]}
      emptyText="Todavia no hay provincias cargadas."
      error={error}
      loading={loading}
      rows={(page?.items ?? []).map((province) => ({
        id: province.id,
        cells: [
          province.name,
          province.code,
          province.country,
          <StatusPill key="status" active={province.active} />
        ]
      }))}
    />
  );
}

function CatalogFilters({
  provinceId,
  provinceOptions,
  showProvinceFilter,
  sort,
  onProvinceChange,
  onSortChange
}: {
  provinceId: string;
  provinceOptions: Province[];
  showProvinceFilter: boolean;
  sort: LegalCatalogSort;
  onProvinceChange: (provinceId: string) => void;
  onSortChange: (sort: LegalCatalogSort) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminTableHeaderActionButton
        icon={ArrowUpAZ}
        label="A-Z"
        tone={sort === "name:asc" ? "primary" : "secondary"}
        onClick={() => onSortChange("name:asc")}
      />
      <AdminTableHeaderActionButton
        icon={ArrowDownAZ}
        label="Z-A"
        tone={sort === "name:desc" ? "primary" : "secondary"}
        onClick={() => onSortChange("name:desc")}
      />
      {showProvinceFilter ? (
        <>
          <select
            className="hidden h-10 rounded-md border border-border/40 bg-card px-3 text-sm text-foreground shadow-none outline-none focus:border-ring/50 focus:ring-2 focus:ring-ring/10 sm:block"
            value={provinceId}
            onChange={(event) => onProvinceChange(event.target.value)}
            aria-label="Filtrar fueros por provincia"
          >
            <option value="">Todas las provincias</option>
            {provinceOptions.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AdminTableHeaderActionButton
                aria-label="Filtrar por provincia"
                className="sm:hidden"
                icon={MapPinned}
                label="Provincia"
                tone={provinceId ? "primary" : "secondary"}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-64">
              <DropdownMenuRadioGroup
                value={provinceId || "__all__"}
                onValueChange={(value) => onProvinceChange(value === "__all__" ? "" : value)}
              >
                <DropdownMenuRadioItem value="__all__">Todas las provincias</DropdownMenuRadioItem>
                {provinceOptions.map((province) => (
                  <DropdownMenuRadioItem key={province.id} value={province.id}>
                    {province.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
    </div>
  );
}

function CatalogTable({
  columns,
  emptyText,
  error,
  loading,
  rows
}: {
  columns: string[];
  emptyText: string;
  error: Error | null;
  loading: boolean;
  rows: Array<{ cells: ReactNode[]; id: string }>;
}) {
  return (
    <div className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden rounded-md border border-border/30">
      <div className="grid shrink-0 grid-cols-4 border-b border-border/30 bg-secondary/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {columns.map((column) => (
          <div key={column} className="px-2 py-2 md:px-3">
            {column}
          </div>
        ))}
      </div>
      <div className="h-full min-h-0 overflow-hidden">
        {loading ? (
          <CatalogRowsSkeleton />
        ) : error ? (
          <StateBox icon={<XCircle className="h-4 w-4" />} text={error.message} tone="error" />
        ) : rows.length === 0 ? (
          <StateBox text={emptyText} />
        ) : (
          <div className="h-full overflow-y-auto scrollbar-none">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid min-h-12 grid-cols-4 items-center border-b border-border/20 text-sm last:border-b-0"
              >
                {row.cells.map((cell, index) => (
                  <div key={index} className="min-w-0 px-2 py-2 md:px-3">
                    <div className="truncate">{cell}</div>
                  </div>
                ))}
              </div>
            ))}
            {Array.from({ length: Math.max(0, catalogPageSize - rows.length) }).map((_, index) => (
              <div
                key={`filler-${index}`}
                className="min-h-12 border-b border-border/10 last:border-b-0"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogName({ description, name }: { description?: string | null; name: string }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-medium text-foreground">{name}</span>
      {description ? (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
      ) : null}
    </span>
  );
}

function CatalogPagination({
  pageInfo,
  onNext,
  onPrevious
}: {
  pageInfo:
    | {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        limit: number;
        offset: number;
        total: number;
      }
    | undefined;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const currentPage = pageInfo ? Math.floor(pageInfo.offset / pageInfo.limit) + 1 : 1;
  const totalPages = pageInfo ? Math.max(1, Math.ceil(pageInfo.total / pageInfo.limit)) : 1;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        Pagina {currentPage} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <PageButton disabled={!pageInfo?.hasPreviousPage} onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </PageButton>
        <PageButton disabled={!pageInfo?.hasNextPage} onClick={onNext}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  children,
  disabled,
  onClick
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex size-9 items-center justify-center rounded-md border border-border/40 bg-card text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${active ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function StateBox({
  icon,
  text,
  tone = "muted"
}: {
  icon?: ReactNode;
  text: string;
  tone?: "error" | "muted";
}) {
  return (
    <div
      className={`flex h-full min-h-0 items-center justify-center gap-2 px-6 text-center text-sm ${tone === "error" ? "bg-destructive/5 text-destructive" : "text-muted-foreground"}`}
    >
      {icon}
      {text}
    </div>
  );
}

function RestrictedLegalCatalogs() {
  return (
    <UnauthorizedState
      title="Catalogos restringidos"
      description="Necesitas permisos adicionales para acceder al area de catalogos legales."
    />
  );
}

function CatalogRowsSkeleton() {
  return (
    <div className="h-full overflow-hidden" aria-label="Cargando catalogo">
      {Array.from({ length: catalogPageSize }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid min-h-12 grid-cols-4 items-center border-b border-border/20 text-sm last:border-b-0"
        >
          {Array.from({ length: 4 }).map((__, cellIndex) => (
            <div key={cellIndex} className="min-w-0 px-2 py-2 md:px-3">
              <Skeleton className={cellIndex === 0 ? "h-4 w-36" : "h-4 w-24"} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
