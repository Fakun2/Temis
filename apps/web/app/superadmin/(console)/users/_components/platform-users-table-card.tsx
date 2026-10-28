"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  RotateCcw,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AdminTableHeader } from "@/components/dashboard/admin-table-header";
import { AdminTableHeaderActionButton } from "@/components/dashboard/admin-table-header-action-button";
import { AdminTableRowsSkeleton } from "@/components/dashboard/admin-skeletons";
import { dashboardSurfaceClassName as adminSurfaceClassName } from "@/components/dashboard/styles";
import type { PlatformUser, PlatformUsersQuery } from "../../_api/platform.api";
import { PlatformUsersToolbar } from "./platform-users-toolbar";

const columnCount = 6;
type PageData = {
  items: PlatformUser[];
  pageInfo: { hasNextPage: boolean; nextCursor: string | null };
};

export function PlatformUsersTableCard({
  busy,
  data,
  error,
  hasActiveFilters,
  pageIndex,
  search,
  sortBy,
  sortDirection,
  status,
  onClearFilters,
  onNextPage,
  onPreviousPage,
  onRefresh,
  onSearchChange,
  onSortChange,
  onStatusChange
}: {
  busy: boolean;
  data?: PageData;
  error: Error | null;
  hasActiveFilters: boolean;
  pageIndex: number;
  search: string;
  sortBy: NonNullable<PlatformUsersQuery["sortBy"]>;
  sortDirection: NonNullable<PlatformUsersQuery["sortDirection"]>;
  status?: PlatformUsersQuery["status"];
  onClearFilters: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: NonNullable<PlatformUsersQuery["sortBy"]>) => void;
  onStatusChange: (value: PlatformUsersQuery["status"]) => void;
}) {
  const users = data?.items ?? [];
  return (
    <Card
      data-admin-surface
      className={`${adminSurfaceClassName} flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
    >
      <AdminTableHeader
        title="Usuarios"
        description="Founders de estudios; las identidades de plataforma no se muestran aquí."
        icon={Users}
        actions={
          <>
            <PlatformUsersToolbar
              busy={busy && Boolean(data)}
              hasActiveFilters={hasActiveFilters}
              search={search}
              status={status}
              onClearFilters={onClearFilters}
              onSearchChange={onSearchChange}
              onStatusChange={onStatusChange}
            />
            <AdminTableHeaderActionButton
              icon={RefreshCw}
              label="Actualizar"
              disabled={busy}
              onClick={onRefresh}
            />
          </>
        }
      />
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-visible px-3 md:px-4 lg:overflow-hidden">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-none rounded-2xl">
          <div className="flex h-full min-w-[760px] flex-col">
            <Table className="min-w-full text-xs" aria-busy={busy}>
              <TableHeader className="bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0">
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    active={sortBy === "name"}
                    direction={sortDirection}
                    label="Usuario"
                    onClick={() => onSortChange("name")}
                  />
                  <SortableHead
                    active={sortBy === "status"}
                    direction={sortDirection}
                    label="Estado"
                    onClick={() => onSortChange("status")}
                  />
                  <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                    Estudio
                  </TableHead>
                  <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                    Personas
                  </TableHead>
                  <SortableHead
                    active={sortBy === "lastLoginAt"}
                    direction={sortDirection}
                    label="Último acceso"
                    onClick={() => onSortChange("lastLoginAt")}
                  />
                  <SortableHead
                    active={sortBy === "createdAt"}
                    direction={sortDirection}
                    label="Alta"
                    onClick={() => onSortChange("createdAt")}
                  />
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-0">
                {busy && !data ? (
                  <AdminTableRowsSkeleton columnCount={columnCount} rowCount={8} />
                ) : null}
                {!busy && error ? (
                  <StateRow
                    icon={<AlertCircle className="size-5" />}
                    message="No se pudieron cargar los usuarios."
                    tone="error"
                  >
                    <Button size="sm" variant="outline" onClick={onRefresh}>
                      <RotateCcw className="size-4" />
                      Reintentar
                    </Button>
                  </StateRow>
                ) : null}
                {!busy && !error && users.length === 0 ? (
                  <StateRow
                    icon={<Users className="size-5" />}
                    message={
                      hasActiveFilters
                        ? "No hay usuarios para los filtros seleccionados."
                        : "Todavía no hay usuarios."
                    }
                  >
                    {hasActiveFilters ? (
                      <Button size="sm" variant="outline" onClick={onClearFilters}>
                        Limpiar filtros
                      </Button>
                    ) : null}
                  </StateRow>
                ) : null}
                {!error
                  ? users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="h-16 border-border/40 hover:bg-secondary/30"
                      >
                        <TableCell className="px-3 py-2">
                          <p className="max-w-[260px] truncate text-sm font-medium text-foreground">
                            {user.fullName}
                          </p>
                          <p className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>
                            {user.status === "active" ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm text-foreground">
                          <p className="max-w-[220px] truncate">
                            {user.foundedTenants[0]?.name ?? "Sin estudio"}
                          </p>
                          {user.foundedTenants.length > 1 ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              +{user.foundedTenants.length - 1} estudios
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell
                          className="px-3 py-2 text-sm tabular-nums text-foreground"
                          title={user.foundedTenants
                            .map((tenant) => `${tenant.name}: ${tenant.peopleCount}`)
                            .join(" · ")}
                        >
                          {user.peopleCount}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                          {formatDate(user.lastLoginAt)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex h-14 shrink-0 items-center justify-between border-t border-border/40 px-1">
          <p className="text-xs text-muted-foreground">
            {users.length === 0 ? "0 resultados" : `${users.length} resultados en esta página`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 border-border/50 px-2.5"
              disabled={busy || pageIndex === 0}
              onClick={onPreviousPage}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-16 text-center text-xs text-muted-foreground">
              Página {pageIndex + 1}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-8 border-border/50 px-2.5"
              disabled={busy || !data?.pageInfo.hasNextPage || !data.pageInfo.nextCursor}
              onClick={onNextPage}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableHead({
  active,
  direction,
  label,
  onClick
}: {
  active: boolean;
  direction: "asc" | "desc";
  label: string;
  onClick: () => void;
}) {
  const Icon = direction === "asc" ? ChevronUp : ChevronDown;
  return (
    <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-primary"
        onClick={onClick}
      >
        {label}
        {active ? <Icon className="size-3.5" /> : null}
      </button>
    </TableHead>
  );
}
function StateRow({
  children,
  icon,
  message,
  tone = "muted"
}: {
  children?: ReactNode;
  icon: ReactNode;
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columnCount} className="h-[260px] p-6 text-center lg:h-[420px]">
        <div
          className={`mx-auto flex max-w-md flex-col items-center gap-3 ${tone === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {icon}
          <p className="text-sm">{message}</p>
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}
function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "Sin acceso";
}
