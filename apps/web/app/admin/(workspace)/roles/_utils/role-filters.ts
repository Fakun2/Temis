import type { RoleDto } from "@temis/api-client";
import type { RoleStatusFilter } from "../_components/roles-filters";

export function filterRoles({
  name,
  roles,
  status
}: {
  name: string;
  roles: RoleDto[];
  status: RoleStatusFilter;
}) {
  const normalizedName = name.trim().toLowerCase();

  return roles.filter((role) => {
    const matchesName = normalizedName
      ? role.name.toLowerCase().includes(normalizedName)
      : true;
    const matchesStatus =
      status === "all" || (status === "active" ? role.active : !role.active);

    return matchesName && matchesStatus;
  });
}
