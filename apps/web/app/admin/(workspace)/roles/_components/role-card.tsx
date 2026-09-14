"use client";

import { useState } from "react";
import { Loader2, Pencil, Power, ShieldCheck, Trash2 } from "lucide-react";
import type { PermissionDto, RoleDto } from "@temis/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteRoleMutation } from "../_hooks/use-delete-role-mutation";
import { useUpdateRoleMutation } from "../_hooks/use-update-role-mutation";
import { CreateRoleSheet } from "./create-role-sheet";
import { DeleteRoleDialog } from "./delete-role-dialog";

export function RoleCard({ permissions, role }: { permissions: PermissionDto[]; role: RoleDto }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteRoleMutation = useDeleteRoleMutation(role.id);
  const updateRoleMutation = useUpdateRoleMutation(role.id);
  const roleActionDisabled = role.isSystem || updateRoleMutation.isPending;

  async function toggleActive() {
    await updateRoleMutation.mutateAsync({
      active: !role.active,
      description: role.description ?? "",
      name: role.name,
      permissions: role.permissions
    });
  }

  async function confirmDelete() {
    await deleteRoleMutation.mutateAsync();
    setDeleteOpen(false);
  }

  return (
    <article className="grid gap-4 rounded-3xl border border-border/30 bg-card px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{role.name}</h3>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Badge variant={role.active ? "secondary" : "outline"}>
            {role.active ? "Activo" : "Inactivo"}
          </Badge>
          <Badge variant={role.isSystem ? "secondary" : "outline"}>
            {role.isSystem ? "Sistema" : "Personalizado"}
          </Badge>
        </div>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">
        {role.description ?? "Sin alcance configurado."}
      </p>

      {role.isSystem ? (
        <p className="text-xs font-medium text-muted-foreground">
          Los roles del sistema no se pueden modificar.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          <CreateRoleSheet
            permissions={permissions}
            role={role}
            trigger={
              <Button type="button" variant="outline" className="h-10 px-3 sm:px-4">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            }
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3 sm:px-4"
            disabled={roleActionDisabled}
            onClick={() => void toggleActive()}
          >
            {updateRoleMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Power className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{role.active ? "Desactivar" : "Activar"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3 text-foreground hover:text-foreground sm:px-4"
            disabled={deleteRoleMutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        </div>
      )}

      <DeleteRoleDialog
        error={deleteRoleMutation.error?.message}
        loading={deleteRoleMutation.isPending}
        open={deleteOpen}
        roleName={role.name}
        onConfirm={() => void confirmDelete()}
        onOpenChange={setDeleteOpen}
      />
    </article>
  );
}
