import { CircleCheck, CircleSlash, ShieldCheck } from "lucide-react";
import type { RoleDto } from "@temis/api-client";
import { AdminMetricsGrid } from "../../_components/admin-metrics-grid";

export function RolesMetrics({ roles }: { roles: RoleDto[] }) {
  const activeRoles = roles.filter((role) => role.active).length;

  return (
    <AdminMetricsGrid
      metrics={[
        { icon: ShieldCheck, label: "Cantidad de roles", value: roles.length },
        { icon: CircleCheck, label: "Roles activos", value: activeRoles },
        { icon: CircleSlash, label: "Roles inactivos", value: roles.length - activeRoles }
      ]}
    />
  );
}
