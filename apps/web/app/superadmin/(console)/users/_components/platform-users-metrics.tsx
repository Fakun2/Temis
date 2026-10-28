import { UserCheck, UserX, Users } from "lucide-react";
import { DashboardMetricsGrid } from "@/components/dashboard/dashboard-metrics-grid";
import type { PlatformDashboardSummary } from "../../_api/platform.api";

export function PlatformUsersMetrics({
  loading,
  summary
}: {
  loading: boolean;
  summary?: PlatformDashboardSummary;
}) {
  return (
    <DashboardMetricsGrid
      metrics={[
        {
          detail: "Personas que fundaron al menos un estudio.",
          icon: Users,
          label: "Founders totales",
          loading,
          value: summary?.users.total ?? "—"
        },
        {
          detail: "Founders habilitados para acceder a Temis.",
          icon: UserCheck,
          label: "Usuarios activos",
          loading,
          value: summary?.users.active ?? "—"
        },
        {
          detail: "Founders inactivos o con el acceso deshabilitado.",
          icon: UserX,
          label: "Inactivos o deshabilitados",
          loading,
          value: summary?.users.inactive ?? "—"
        }
      ]}
    />
  );
}
