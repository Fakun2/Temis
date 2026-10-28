"use client";
import { Activity, CalendarClock, CircleCheck, CircleOff, Mail, Plus } from "lucide-react";
import {
  AdminTableFilterClearItem,
  AdminTableFilterMenu
} from "@/components/dashboard/admin-table-filter-menu";
import { DashboardMetricsGrid } from "@/components/dashboard/dashboard-metrics-grid";
import { Button } from "@/components/ui/button";
import type { NewsletterFilter } from "../_api/newsletters.api";

export type NewsletterMetricsData = {
  total: number;
  active: number;
  inactive: number;
  scheduled: number;
};
const filters: { id: NewsletterFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Activas" },
  { id: "inactive", label: "Inactivas" },
  { id: "scheduled", label: "Programadas" }
];

export function NewsletterMetrics({ metrics }: { metrics: NewsletterMetricsData }) {
  return (
    <DashboardMetricsGrid
      metrics={[
        {
          label: "Total de newsletters",
          value: metrics.total,
          icon: Mail,
          detail: "Publicaciones creadas en la plataforma."
        },
        {
          label: "Activas",
          value: metrics.active,
          icon: CircleCheck,
          detail: "Publicadas y vigentes en este momento."
        },
        {
          label: "Inactivas",
          value: metrics.inactive,
          icon: CircleOff,
          detail: "Borradores, canceladas o vencidas."
        },
        {
          label: "Programadas",
          value: metrics.scheduled,
          icon: CalendarClock,
          detail: "Publicaciones con inicio futuro."
        }
      ]}
    />
  );
}
export function NewsletterToolbar({
  filter,
  busy,
  onFilter,
  onCreate
}: {
  filter: NewsletterFilter;
  busy: boolean;
  onFilter: (filter: NewsletterFilter) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">Newsletters</h2>
        <p className="text-xs text-muted-foreground">
          {filter === "all"
            ? "Todas las publicaciones"
            : filters.find((entry) => entry.id === filter)?.label}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <AdminTableFilterMenu
          active={filter !== "all"}
          subMenuSide="right"
          sections={[
            {
              icon: Activity,
              label: "Estado",
              options: filters.map((entry) => ({
                label: entry.label,
                active: filter === entry.id,
                onSelect: () => onFilter(entry.id)
              }))
            }
          ]}
          footer={
            <AdminTableFilterClearItem
              disabled={filter === "all"}
              onClear={() => onFilter("all")}
            />
          }
        />
        <Button size="sm" disabled={busy} onClick={onCreate}>
          <Plus /> Nueva newsletter
        </Button>
      </div>
    </div>
  );
}
export function NewsletterPagination({
  loading,
  busy,
  pageIndex,
  cursor,
  onPrevious,
  onMore
}: {
  loading: boolean;
  busy: boolean;
  pageIndex: number;
  cursor: string | null;
  onPrevious: () => void;
  onMore: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="secondary"
        disabled={loading || busy || pageIndex === 0}
        onClick={onPrevious}
      >
        Anterior
      </Button>
      <span className="text-sm text-muted-foreground">Página {pageIndex + 1}</span>
      <Button variant="secondary" disabled={loading || busy || !cursor} onClick={onMore}>
        Siguiente
      </Button>
    </div>
  );
}
