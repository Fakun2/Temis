import type { PermissionDto, RoleDto } from "@temis/api-client";
import { RoleCard } from "./role-card";

export function RolesList({ permissions, roles }: { permissions: PermissionDto[]; roles: RoleDto[] }) {
  if (roles.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center rounded-3xl border border-border/30 bg-card px-6 py-12 text-center text-sm text-muted-foreground">
        Todavia no hay roles configurados.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => (
        <RoleCard key={role.id} permissions={permissions} role={role} />
      ))}
    </div>
  );
}
