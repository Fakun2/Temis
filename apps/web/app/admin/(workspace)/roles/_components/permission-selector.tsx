"use client";

import type { PermissionDto } from "@temis/api-client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const scopeModules = [
  {
    resource: "staff",
    label: "Staff",
    description: "Gestion de personal, roles operativos y colaboradores."
  },
  {
    resource: "clients",
    label: "Clientes",
    description: "Administracion de clientes y datos de contacto."
  },
  {
    resource: "cases",
    label: "Casos",
    description: "Trabajo sobre expedientes, seguimiento y actividad legal."
  },
  {
    resource: "forums",
    label: "Fueros",
    description: "Configuracion de fueros y centros judiciales del estudio."
  },
  {
    resource: "provinces",
    label: "Provincias",
    description: "Consulta del catalogo global de provincias."
  },
  {
    resource: "tasks",
    label: "Tareas",
    description: "Organizacion de tareas, vencimientos y pendientes."
  },
  {
    resource: "expenses",
    label: "Gastos",
    description: "Gastos asociados a tareas y expedientes."
  },
  {
    resource: "hearings",
    label: "Audiencias",
    description: "Agenda de audiencias, tipos y notificaciones."
  },
  {
    resource: "finance",
    label: "Caja",
    description: "Operacion financiera y movimientos de caja."
  },
  {
    resource: "categories",
    label: "Categorias",
    description: "Configuracion de categorias financieras del estudio."
  }
] as const;

const scopeActions = [
  { action: "read", label: "Lectura", description: "Puede ver informacion del modulo." },
  { action: "create", label: "Escritura", description: "Puede cargar nuevos registros." },
  { action: "update", label: "Modificacion", description: "Puede editar informacion existente." },
  { action: "delete", label: "Eliminacion", description: "Puede eliminar registros." }
] as const;

export function PermissionSelector({
  hierarchyLevel,
  onChange,
  permissions,
  selectedPermissions
}: {
  hierarchyLevel: number;
  onChange: (permissionCodes: string[]) => void;
  permissions: PermissionDto[];
  selectedPermissions: string[];
}) {
  const availablePermissionCodes = new Set(permissions.map((permission) => permission.code));

  function getModuleCodes(resource: string) {
    return scopeActions
      .map(({ action }) => `${resource}:${action}`)
      .filter(
        (permissionCode) =>
          availablePermissionCodes.has(permissionCode) &&
          isPermissionAllowedForHierarchy(permissionCode, hierarchyLevel)
      );
  }

  function toggleModule(resource: string, active: boolean) {
    const moduleCodes = getModuleCodes(resource);
    const nextPermissions = active
      ? selectedPermissions.filter((permissionCode) => !moduleCodes.includes(permissionCode))
      : [...selectedPermissions, ...moduleCodes];

    onChange(uniquePermissionCodes(nextPermissions));
  }

  function toggleAction(permissionCode: string, checked: boolean) {
    if (!isPermissionAllowedForHierarchy(permissionCode, hierarchyLevel)) {
      return;
    }

    const nextPermissions = checked
      ? [...selectedPermissions, permissionCode]
      : selectedPermissions.filter((selectedPermission) => selectedPermission !== permissionCode);

    onChange(uniquePermissionCodes(nextPermissions));
  }

  return (
    <div className="grid h-[clamp(240px,38svh,380px)] max-h-full min-h-0 gap-3">
      <Label>Alcance del sistema *</Label>
      <div className="grid min-h-0 gap-3 overflow-y-auto rounded-2xl border border-border/30 p-3">
        {scopeModules.map((module) => {
          const moduleCodes = getModuleCodes(module.resource);
          const moduleDisabled =
            hierarchyLevel === 1 && ["staff", "finance"].includes(module.resource);
          const selectedModuleCodes = moduleCodes.filter((permissionCode) =>
            selectedPermissions.includes(permissionCode)
          );
          const moduleActive = selectedModuleCodes.length > 0;
          const moduleChecked =
            selectedModuleCodes.length === moduleCodes.length
              ? true
              : moduleActive
                ? "indeterminate"
                : false;

          if (moduleCodes.length === 0) {
            return null;
          }

          return (
            <section
              key={module.resource}
              className="grid gap-3 rounded-2xl border border-border/25 p-3"
            >
              <label
                className={`flex items-start gap-3 ${moduleDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              >
                <Checkbox
                  checked={moduleChecked}
                  disabled={moduleDisabled}
                  onCheckedChange={() => {
                    if (!moduleDisabled) {
                      toggleModule(module.resource, moduleActive);
                    }
                  }}
                  className="mt-0.5"
                />
                <span className="grid gap-1">
                  <span className="text-sm font-semibold text-foreground">{module.label}</span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {module.description}
                  </span>
                </span>
              </label>

              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  moduleActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="grid gap-2 pl-7 pt-1 sm:grid-cols-2">
                    {scopeActions.map((scopeAction) => {
                      const permissionCode = `${module.resource}:${scopeAction.action}`;
                      const disabled =
                        !availablePermissionCodes.has(permissionCode) ||
                        !isPermissionAllowedForHierarchy(permissionCode, hierarchyLevel);

                      if (disabled) {
                        return null;
                      }

                      return (
                        <label
                          key={permissionCode}
                          className={`flex items-start gap-3 rounded-2xl border border-border/30 px-3 py-3 transition-colors ${
                            disabled
                              ? "cursor-not-allowed bg-muted/20 opacity-45"
                              : "cursor-pointer hover:bg-secondary/60"
                          }`}
                        >
                          <Checkbox
                            checked={selectedPermissions.includes(permissionCode)}
                            disabled={disabled}
                            onCheckedChange={(checked) =>
                              toggleAction(permissionCode, checked === true)
                            }
                            className="mt-0.5"
                          />
                          <span className="grid gap-1">
                            <span className="text-sm font-medium text-foreground">
                              {scopeAction.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {scopeAction.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function uniquePermissionCodes(permissionCodes: string[]) {
  return [...new Set(permissionCodes)].sort((left, right) => left.localeCompare(right, "es"));
}

function isPermissionAllowedForHierarchy(permissionCode: string, hierarchyLevel: number) {
  if (hierarchyLevel === 3) {
    return true;
  }

  if (hierarchyLevel === 2) {
    return ![
      "staff:create",
      "staff:delete",
      "staff:manage",
      "finance:create",
      "finance:delete"
    ].includes(permissionCode);
  }

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
    permissionCode === "hearings:delete"
  );
}
