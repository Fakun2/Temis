import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { dashboardSurfaceClassName as adminSurfaceClassName } from "./styles";

export function AdminMetricSkeleton() {
  return (
    <Card
      data-admin-surface
      className={`${adminSurfaceClassName} min-w-0 border-0 py-0 shadow-[var(--admin-card-shadow)]`}
    >
      <CardContent className="flex min-h-[94px] items-center gap-2 p-2 sm:min-h-[118px] sm:gap-4 sm:p-4">
        <Skeleton className="size-7 shrink-0 rounded-xl sm:size-8 sm:rounded-2xl" />
        <div className="grid min-w-0 flex-1 gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminMetricsSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid shrink-0 grid-cols-2 gap-2 sm:gap-6 lg:grid-cols-4 lg:gap-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Cargando metricas</span>
      {Array.from({ length: count }).map((_, index) => (
        <AdminMetricSkeleton key={index} />
      ))}
    </div>
  );
}

export function AdminListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Cargando lista</span>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="border-border/40 bg-card">
          <CardContent className="grid gap-4 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="size-9 rounded-lg" />
            </div>
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminTableRowsSkeleton({
  columnCount,
  rowCount = 6
}: {
  columnCount: number;
  rowCount?: number;
}) {
  return Array.from({ length: rowCount }).map((_, rowIndex) => (
    <TableRow className="h-14 border-border/40 hover:bg-transparent" key={rowIndex}>
      {Array.from({ length: columnCount }).map((__, cellIndex) => (
        <TableCell className="px-3 py-3" key={cellIndex}>
          <Skeleton className={cellIndex === 0 ? "h-4 w-36" : "h-4 w-24"} />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function AdminTableBodySkeleton({
  columnCount,
  rowCount
}: {
  columnCount: number;
  rowCount?: number;
}) {
  return (
    <TableBody
      className="[&_tr:last-child]:border-0"
      aria-busy="true"
      aria-label="Cargando tabla"
      aria-live="polite"
    >
      <AdminTableRowsSkeleton columnCount={columnCount} rowCount={rowCount} />
    </TableBody>
  );
}
