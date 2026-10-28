import { BellRing, CircleCheck, CircleOff, MessagesSquare } from "lucide-react";
import { DashboardMetricsGrid } from "@/components/dashboard/dashboard-metrics-grid";
import type { PlatformAnnouncementsSummary } from "../_api/announcements.api";

export function AnnouncementMetrics({ summary }: { summary?: PlatformAnnouncementsSummary }) {
  return (
    <DashboardMetricsGrid
      metrics={[
        {
          detail: "Comunicados creados en la plataforma.",
          icon: BellRing,
          label: "Total",
          value: summary?.total ?? "—"
        },
        {
          detail: "Publicados y vigentes en este momento.",
          icon: CircleCheck,
          label: "Activos",
          value: summary?.active ?? "—"
        },
        {
          detail: "Borradores, programados, vencidos o cancelados.",
          icon: CircleOff,
          label: "Inactivos",
          value: summary?.inactive ?? "—"
        },
        {
          detail: "Comunicados de categoría general.",
          icon: MessagesSquare,
          label: "Generales",
          value: summary?.general ?? "—"
        }
      ]}
    />
  );
}
