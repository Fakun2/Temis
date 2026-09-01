"use client";

import { Banknote, BriefcaseBusiness, CalendarClock, Users } from "lucide-react";
import { formatCanonicalMoney } from "../cashbox/_utils/local-decimal";
import { AdminMetricsGrid } from "./admin-metrics-grid";
import { AdminMetricsSkeletonGrid } from "./admin-skeletons";
import { useAdminDashboardMetricsQuery } from "../_hooks/use-admin-dashboard-metrics-query";
import type { DashboardMetricsDto } from "../_types/dashboard.types";

export function AdminDashboardMetrics({
  initialMetrics
}: {
  initialMetrics?: DashboardMetricsDto | null;
}) {
  const metricsQuery = useAdminDashboardMetricsQuery(initialMetrics);
  const metrics = metricsQuery.data;

  if (metricsQuery.isError) {
    return (
      <AdminMetricsGrid
        metrics={[
          {
            detail: "No se pudo consultar el dashboard.",
            icon: BriefcaseBusiness,
            label: "Casos activos",
            value: "--"
          },
          {
            detail: "Listado disponible en Clientes",
            icon: Users,
            label: "Clientes",
            value: "--"
          },
          {
            detail: "No se pudo consultar caja.",
            icon: Banknote,
            label: "Caja diaria",
            value: "--"
          },
          {
            detail: "No se pudieron consultar vencimientos.",
            icon: CalendarClock,
            label: "Vencimientos",
            tooltipItems: [
              { label: "Tareas", value: "--" },
              { label: "Pagos", value: "--" }
            ],
            value: "--"
          }
        ]}
      />
    );
  }

  if (metricsQuery.isPending || !metrics) {
    return <AdminMetricsSkeletonGrid />;
  }

  return (
    <AdminMetricsGrid
      metrics={[
        {
          detail: "Expedientes abiertos",
          icon: BriefcaseBusiness,
          label: "Casos activos",
          value: metrics.activeCasesCount
        },
        {
          detail: "Listado disponible en Clientes",
          icon: Users,
          label: "Clientes",
          value: "--"
        },
        {
          detail: `Caja en ${metrics.cashbox.currency.code}`,
          icon: Banknote,
          label: "Balance",
          value: formatCanonicalMoney(metrics.cashbox.balance, metrics.cashbox.currency.symbol)
        },
        {
          detail: "Vencen hoy",
          icon: CalendarClock,
          label: "Vencimientos",
          tooltipItems: [
            { label: "Tareas", value: metrics.dueToday.tasksCount },
            { label: "Pagos", value: metrics.dueToday.paymentsCount }
          ],
          value: metrics.dueToday.tasksCount + metrics.dueToday.paymentsCount
        }
      ]}
    />
  );
}
