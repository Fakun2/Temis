export const ADMIN_ACCESS_PERMISSION = "admin:access";

export const RBAC_PERMISSIONS = [
  { code: "admin:access", resource: "admin", action: "access" },
  { code: "staff:read", resource: "staff", action: "read" },
  { code: "staff:create", resource: "staff", action: "create" },
  { code: "staff:update", resource: "staff", action: "update" },
  { code: "staff:delete", resource: "staff", action: "delete" },
  { code: "staff:manage", resource: "staff", action: "manage" },
  { code: "tenants:manage", resource: "tenants", action: "manage" },
  { code: "users:manage", resource: "users", action: "manage" },
  { code: "roles:read", resource: "roles", action: "read" },
  { code: "roles:create", resource: "roles", action: "create" },
  { code: "roles:update", resource: "roles", action: "update" },
  { code: "roles:delete", resource: "roles", action: "delete" },
  { code: "roles:manage", resource: "roles", action: "manage" },
  { code: "clients:read", resource: "clients", action: "read" },
  { code: "clients:create", resource: "clients", action: "create" },
  { code: "clients:update", resource: "clients", action: "update" },
  { code: "clients:delete", resource: "clients", action: "delete" },
  { code: "cases:read", resource: "cases", action: "read" },
  { code: "cases:create", resource: "cases", action: "create" },
  { code: "cases:update", resource: "cases", action: "update" },
  { code: "cases:delete", resource: "cases", action: "delete" },
  { code: "forums:read", resource: "forums", action: "read" },
  { code: "provinces:read", resource: "provinces", action: "read" },
  { code: "documents:read", resource: "documents", action: "read" },
  { code: "documents:write", resource: "documents", action: "write" },
  { code: "tasks:read", resource: "tasks", action: "read" },
  { code: "tasks:create", resource: "tasks", action: "create" },
  { code: "tasks:update", resource: "tasks", action: "update" },
  { code: "tasks:delete", resource: "tasks", action: "delete" },
  { code: "expenses:read", resource: "expenses", action: "read" },
  { code: "expenses:create", resource: "expenses", action: "create" },
  { code: "expenses:update", resource: "expenses", action: "update" },
  { code: "expenses:delete", resource: "expenses", action: "delete" },
  { code: "hearings:read", resource: "hearings", action: "read" },
  { code: "hearings:create", resource: "hearings", action: "create" },
  { code: "hearings:update", resource: "hearings", action: "update" },
  { code: "hearings:delete", resource: "hearings", action: "delete" },
  { code: "ai:case_chat", resource: "ai", action: "case_chat" },
  { code: "currencies:read", resource: "currencies", action: "read" },
  { code: "currencies:create", resource: "currencies", action: "create" },
  { code: "currencies:update", resource: "currencies", action: "update" },
  { code: "currencies:delete", resource: "currencies", action: "delete" },
  { code: "categories:read", resource: "categories", action: "read" },
  { code: "categories:create", resource: "categories", action: "create" },
  { code: "categories:update", resource: "categories", action: "update" },
  { code: "categories:delete", resource: "categories", action: "delete" },
  { code: "finance:read", resource: "finance", action: "read" },
  { code: "finance:create", resource: "finance", action: "create" },
  { code: "finance:update", resource: "finance", action: "update" },
  { code: "finance:delete", resource: "finance", action: "delete" },
  { code: "integrations:sae_import", resource: "integrations", action: "sae_import" },
  { code: "billing:manage", resource: "billing", action: "manage" }
] as const;

export const TENANT_BLOCKED_PERMISSION_CODES = [
  "currencies:create",
  "currencies:update",
  "currencies:delete"
] as const;

export function isTenantAssignablePermission(permissionCode: string) {
  return !TENANT_BLOCKED_PERMISSION_CODES.some((blockedCode) => blockedCode === permissionCode);
}

export const RBAC_ROLES = [
  {
    code: "owner",
    name: "Owner",
    description: "Tiene control completo del estudio, permisos, facturacion y administracion.",
    hierarchyLevel: 3,
    permissions: RBAC_PERMISSIONS.map((permission) => permission.code).filter(
      isTenantAssignablePermission
    )
  },
  {
    code: "admin",
    name: "Admin",
    description: "Administra el estudio, equipo, roles y configuracion operativa.",
    hierarchyLevel: 2,
    permissions: RBAC_PERMISSIONS.filter(
      (permission) =>
        permission.code !== "billing:manage" &&
        permission.resource !== "roles" &&
        permission.resource !== "cases" &&
        permission.resource !== "ai" &&
        permission.resource !== "expenses" &&
        permission.resource !== "integrations" &&
        isTenantAssignablePermission(permission.code)
    ).map((permission) => permission.code)
  },
  {
    code: "lawyer",
    name: "Abogado",
    description: "Gestiona clientes, expedientes, documentos, tareas y seguimiento legal.",
    hierarchyLevel: 1,
    permissions: [
      ADMIN_ACCESS_PERMISSION,
      "clients:read",
      "clients:create",
      "clients:update",
      "cases:read",
      "cases:create",
      "cases:update",
      "forums:read",
      "provinces:read",
      "currencies:read",
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
      "hearings:delete"
    ]
  },
  {
    code: "paralegal",
    name: "Paralegal",
    description: "Colabora en expedientes, documentos y tareas sin administrar permisos.",
    hierarchyLevel: 1,
    permissions: [
      ADMIN_ACCESS_PERMISSION,
      "cases:read",
      "forums:read",
      "provinces:read",
      "currencies:read",
      "tasks:read",
      "tasks:create",
      "tasks:update",
      "expenses:read",
      "expenses:create",
      "expenses:update",
      "hearings:read",
      "hearings:create",
      "hearings:update"
    ]
  },
  {
    code: "accounting",
    name: "Contabilidad",
    description: "Opera los permisos de caja del estudio.",
    hierarchyLevel: 1,
    permissions: [
      ADMIN_ACCESS_PERMISSION,
      "currencies:read",
      "categories:read",
      "categories:create",
      "categories:update",
      "categories:delete",
      "finance:read",
      "finance:create",
      "finance:update",
      "finance:delete"
    ]
  },
  {
    code: "viewer",
    name: "Lectura",
    description: "Consulta informacion del estudio sin modificar datos operativos.",
    hierarchyLevel: 1,
    permissions: [
      ADMIN_ACCESS_PERMISSION,
      "clients:read",
      "forums:read",
      "provinces:read",
      "currencies:read",
      "documents:read",
      "tasks:read",
      "hearings:read",
      "finance:read"
    ]
  }
] as const;

export type PermissionCode = (typeof RBAC_PERMISSIONS)[number]["code"];
export type RoleCode = (typeof RBAC_ROLES)[number]["code"];
