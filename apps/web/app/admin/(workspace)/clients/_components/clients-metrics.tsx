"use client";

import { UserCheck, UsersRound, UserX, WalletCards } from "lucide-react";
import type { ClientsListResponseDto } from "@temis/api-client";
import { AdminMetricsGrid } from "../../_components/admin-metrics-grid";

export function ClientsMetrics({ data }: { data: ClientsListResponseDto | undefined }) {
  const metrics = data?.metrics;

  return (
    <AdminMetricsGrid
      metrics={[
        {
          icon: UsersRound,
          label: "Clientes totales",
          value: metrics?.total ?? 0
        },
        {
          icon: WalletCards,
          label: "Clientes con saldo",
          value: metrics?.withBalance ?? 0
        },
        {
          icon: UserCheck,
          label: "Clientes activos",
          value: metrics?.active ?? 0
        },
        {
          icon: UserX,
          label: "Clientes inactivos",
          value: metrics?.inactive ?? 0
        }
      ]}
    />
  );
}
