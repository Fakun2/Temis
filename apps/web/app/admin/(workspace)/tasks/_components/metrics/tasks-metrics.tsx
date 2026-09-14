import { CheckCircle2, ListTodo, Timer, TriangleAlert } from "lucide-react";
import { AdminMetricsGrid } from "../../../_components/admin-metrics-grid";
import type { TenantCaseTasksMetricsDto } from "../../../cases/_types/cases.types";

export function TasksMetrics({
  isLoading,
  metrics
}: {
  isLoading: boolean;
  metrics?: TenantCaseTasksMetricsDto;
}) {
  return (
    <AdminMetricsGrid
      metrics={[
        { icon: ListTodo, label: "Por hacer", loading: isLoading, value: metrics?.todo ?? 0 },
        { icon: CheckCircle2, label: "Hechas", loading: isLoading, value: metrics?.done ?? 0 },
        { icon: Timer, label: "Por vencer", loading: isLoading, value: metrics?.dueSoon ?? 0 },
        { icon: TriangleAlert, label: "Vencidas", loading: isLoading, value: metrics?.overdue ?? 0 }
      ]}
    />
  );
}
