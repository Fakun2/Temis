"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import type { PermissionDto, RoleDto } from "@temis/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRoleFormSchema, type CreateRoleFormValues } from "@/lib/validation/roles";
import { adminPrimaryActionButtonClassName } from "../../_constants/dashboard";
import { useCreateRoleMutation } from "../_hooks/use-create-role-mutation";
import { useUpdateRoleMutation } from "../_hooks/use-update-role-mutation";
import { PermissionSelector } from "./permission-selector";

type RoleFormErrors = Partial<Record<keyof CreateRoleFormValues, string>>;

const adminAccessPermission = "admin:access";
const allPermissionCodes = [
  "admin:access",
  "staff:read",
  "staff:create",
  "staff:update",
  "staff:delete",
  "staff:manage",
  "tenants:manage",
  "users:manage",
  "clients:read",
  "clients:create",
  "clients:update",
  "clients:delete",
  "cases:read",
  "cases:create",
  "cases:update",
  "cases:delete",
  "forums:read",
  "provinces:read",
  "documents:read",
  "documents:write",
  "tasks:read",
  "tasks:create",
  "tasks:update",
  "tasks:delete",
  "expenses:read",
  "expenses:create",
  "expenses:update",
  "expenses:delete",
  "hearings:read",
  "hearings:create",
  "hearings:update",
  "hearings:delete",
  "categories:read",
  "categories:create",
  "categories:update",
  "categories:delete",
  "finance:read",
  "finance:create",
  "finance:update",
  "finance:delete",
  "billing:manage"
];

function getInitialForm(role?: RoleDto): CreateRoleFormValues {
  const hierarchyLevel = getRoleHierarchyLevel(role);

  return {
    active: true,
    description: role?.description ?? "",
    hierarchyLevel,
    name: role?.name ?? "",
    permissions: normalizePermissionsForHierarchy(role?.permissions ?? [], hierarchyLevel),
    ...(role ? { active: role.active } : {})
  };
}

export function CreateRoleForm({
  onSuccess,
  permissions,
  role
}: {
  onSuccess?: () => void;
  permissions: PermissionDto[];
  role?: RoleDto;
}) {
  const [form, setForm] = useState<CreateRoleFormValues>(() => getInitialForm(role));
  const [errors, setErrors] = useState<RoleFormErrors>({});
  const createRoleMutation = useCreateRoleMutation();
  const updateRoleMutation = useUpdateRoleMutation(role?.id);
  const mode = role ? "update" : "create";
  const mutation = mode === "create" ? createRoleMutation : updateRoleMutation;

  useEffect(() => {
    setForm(getInitialForm(role));
    setErrors({});
  }, [role]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createRoleFormSchema.safeParse(form);

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [
            key,
            value?.[0]
          ])
        ) as RoleFormErrors
      );
      return;
    }

    setErrors({});
    try {
      if (mode === "create") {
        await createRoleMutation.mutateAsync(parsed.data);
        setForm(getInitialForm());
      } else {
        await updateRoleMutation.mutateAsync(parsed.data);
      }
      onSuccess?.();
    } catch {
      // The mutation exposes its error below the form.
    }
  }

  function updateField<K extends keyof CreateRoleFormValues>(
    key: K,
    value: CreateRoleFormValues[K]
  ) {
    setForm((current) => {
      if (key === "hierarchyLevel") {
        const hierarchyLevel = Number(value) as 1 | 2 | 3;
        return {
          ...current,
          hierarchyLevel,
          permissions: normalizePermissionsForHierarchy(current.permissions, hierarchyLevel)
        };
      }

      return { ...current, [key]: value };
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function updatePermissions(permissionCodes: string[]) {
    setForm((current) => ({
      ...current,
      permissions: normalizePermissionsForHierarchy(permissionCodes, current.hierarchyLevel)
    }));
    setErrors((current) => ({ ...current, permissions: undefined }));
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={handleSubmit}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-4 px-6 py-5">
          <Field error={errors.name} label="Nombre *">
            <Input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Coordinador"
              className="h-12 rounded-2xl border-border/40 bg-card px-4"
            />
          </Field>

          <Field error={errors.description} label="Alcance del sistema *">
            <Textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Describe el alcance que tendra este rol dentro del sistema."
              className="min-h-24 rounded-2xl border-border/40 bg-card px-4 py-3"
            />
          </Field>

          <Field error={errors.hierarchyLevel} label="Jerarquia *">
            <div className="grid gap-2 sm:grid-cols-3">
              {hierarchyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    form.hierarchyLevel === option.value
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/40 bg-card text-muted-foreground hover:bg-secondary/60"
                  }`}
                  onClick={() => updateField("hierarchyLevel", option.value)}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5">{option.description}</span>
                </button>
              ))}
            </div>
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/30 px-4 py-4 transition-colors hover:bg-secondary/60">
            <Checkbox
              checked={form.active}
              onCheckedChange={(checked) => updateField("active", checked === true)}
              className="mt-0.5"
            />
            <span className="grid gap-1">
              <span className="text-sm font-medium text-foreground">Rol activo</span>
              <span className="text-xs leading-5 text-muted-foreground">
                Los roles activos pueden asignarse al personal del estudio.
              </span>
            </span>
          </label>
        </div>

        <div className="px-6 pb-6">
          <PermissionSelector
            hierarchyLevel={form.hierarchyLevel}
            onChange={updatePermissions}
            permissions={permissions}
            selectedPermissions={form.permissions}
          />
        </div>
      </div>

      <div className="grid shrink-0 gap-3 border-t border-border/30 bg-background px-6 pb-5 pt-5">
        {errors.permissions ? (
          <p className="text-xs font-medium text-destructive">{errors.permissions}</p>
        ) : null}
        {mutation.error ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {mutation.error.message}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={mutation.isPending}
          className={`h-12 font-semibold ${adminPrimaryActionButtonClassName}`}
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : mode === "create" ? (
            <Plus className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{mode === "create" ? "Crear rol" : "Actualizar rol"}</span>
        </Button>
      </div>
    </form>
  );
}

function withAdminAccess(permissionCodes: string[]) {
  return [...new Set([adminAccessPermission, ...permissionCodes])];
}

const hierarchyOptions = [
  {
    value: 3,
    label: "3 - Propietario",
    description: "Acceso completo al sistema."
  },
  {
    value: 2,
    label: "2 - Administrador",
    description: "Acceso moderado a Staff y Caja."
  },
  {
    value: 1,
    label: "1 - Operativo",
    description: "Opera clientes, casos y tareas."
  }
] as const;

function normalizePermissionsForHierarchy(permissionCodes: string[], hierarchyLevel: number) {
  if (hierarchyLevel === 3) {
    return withoutOwnerOnlyPermissions(withAdminAccess(allPermissionCodes));
  }

  const basePermissions = withoutOwnerOnlyPermissions(withAdminAccess(permissionCodes));

  if (hierarchyLevel === 2) {
    return uniquePermissionCodes([
      ...basePermissions.filter((permissionCode) => !isBlockedModeratePermission(permissionCode)),
      "staff:read",
      "staff:update",
      "categories:read",
      "categories:create",
      "categories:update",
      "categories:delete",
      "finance:read",
      "finance:update"
    ]);
  }

  return uniquePermissionCodes(
    basePermissions.filter(
      (permissionCode) =>
        permissionCode === adminAccessPermission || isAllowedOperationalPermission(permissionCode)
    )
  );
}

function withoutOwnerOnlyPermissions(permissionCodes: string[]) {
  return permissionCodes.filter((permissionCode) => !permissionCode.startsWith("roles:"));
}

function isAllowedOperationalPermission(permissionCode: string) {
  return (
    permissionCode === "clients:read" ||
    permissionCode === "clients:create" ||
    permissionCode === "clients:update" ||
    permissionCode === "cases:read" ||
    permissionCode === "cases:create" ||
    permissionCode === "cases:update" ||
    permissionCode === "cases:delete" ||
    permissionCode === "forums:read" ||
    permissionCode === "provinces:read" ||
    permissionCode === "tasks:read" ||
    permissionCode === "tasks:create" ||
    permissionCode === "tasks:update" ||
    permissionCode === "tasks:delete" ||
    permissionCode === "expenses:read" ||
    permissionCode === "expenses:create" ||
    permissionCode === "expenses:update" ||
    permissionCode === "expenses:delete" ||
    permissionCode === "hearings:read" ||
    permissionCode === "hearings:create" ||
    permissionCode === "hearings:update" ||
    permissionCode === "hearings:delete" ||
    permissionCode === "documents:read" ||
    permissionCode === "documents:write"
  );
}

function isBlockedModeratePermission(permissionCode: string) {
  return (
    permissionCode === "staff:create" ||
    permissionCode === "staff:delete" ||
    permissionCode === "staff:manage" ||
    permissionCode === "finance:create" ||
    permissionCode === "finance:delete"
  );
}

function uniquePermissionCodes(permissionCodes: string[]) {
  return [...new Set(permissionCodes)];
}

function getRoleHierarchyLevel(role?: RoleDto) {
  if (!role || !("hierarchyLevel" in role)) {
    return 1;
  }

  const hierarchyLevel = (role as { hierarchyLevel?: unknown }).hierarchyLevel;
  return hierarchyLevel === 1 || hierarchyLevel === 2 || hierarchyLevel === 3 ? hierarchyLevel : 1;
}

function Field({ children, error, label }: { children: ReactNode; error?: string; label: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
