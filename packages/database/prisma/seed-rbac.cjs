const { loadRootEnv } = require("./load-root-env.cjs");
const { randomUUID } = require("node:crypto");

loadRootEnv();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const adminAccessPermission = "admin:access";

const permissions = [
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
];

const allPermissionCodes = permissions.map((permission) => permission.code);
const tenantBlockedPermissionCodes = [
  "currencies:create",
  "currencies:update",
  "currencies:delete"
];
const stalePermissionCodes = ["clients:write", "tasks:write"];

const systemRoles = [
  {
    active: true,
    code: "owner",
    description: "Tiene control completo del estudio, permisos, facturacion y administracion.",
    hierarchyLevel: 3,
    name: "Owner",
    permissions: allPermissionCodes.filter(isTenantAssignablePermission)
  },
  {
    active: true,
    code: "admin",
    description: "Administra el estudio, equipo, roles y configuracion operativa.",
    hierarchyLevel: 2,
    name: "Admin",
    permissions: allPermissionCodes.filter(
      (permissionCode) =>
        permissionCode !== "billing:manage" &&
        !permissionCode.startsWith("roles:") &&
        !permissionCode.startsWith("cases:") &&
        !permissionCode.startsWith("ai:") &&
        !permissionCode.startsWith("expenses:") &&
        !permissionCode.startsWith("hearings:") &&
        !permissionCode.startsWith("integrations:") &&
        isTenantAssignablePermission(permissionCode)
    )
  },
  {
    active: true,
    code: "lawyer",
    description: "Gestiona clientes, expedientes, documentos, tareas y seguimiento legal.",
    hierarchyLevel: 1,
    name: "Abogado",
    permissions: [
      adminAccessPermission,
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
    active: true,
    code: "paralegal",
    description: "Colabora en expedientes, documentos y tareas sin administrar permisos.",
    hierarchyLevel: 1,
    name: "Paralegal",
    permissions: [
      adminAccessPermission,
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
    active: true,
    code: "accounting",
    description: "Opera los permisos de caja del estudio.",
    hierarchyLevel: 1,
    name: "Contabilidad",
    permissions: [
      adminAccessPermission,
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
    active: true,
    code: "viewer",
    description: "Consulta informacion del estudio sin modificar datos operativos.",
    hierarchyLevel: 1,
    name: "Lectura",
    permissions: [
      adminAccessPermission,
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
];

function isTenantAssignablePermission(permissionCode) {
  return !tenantBlockedPermissionCodes.includes(permissionCode);
}

async function seedRbac() {
  await prisma.$transaction(async (tx) => {
    for (const permission of permissions) {
      await tx.permission.upsert({
        where: { code: permission.code },
        update: {
          action: permission.action,
          resource: permission.resource
        },
        create: permission
      });
    }

    const permissionsByCode = new Map(
      (
        await tx.permission.findMany({
          where: { code: { in: allPermissionCodes } },
          select: { code: true, id: true }
        })
      ).map((permission) => [permission.code, permission.id])
    );

    for (const role of systemRoles) {
      const savedRole = await tx.role.upsert({
        where: { code: role.code },
        update: {
          active: role.active,
          description: role.description,
          hierarchyLevel: role.hierarchyLevel,
          isSystem: true,
          name: role.name,
          tenantId: null
        },
        create: {
          active: role.active,
          code: role.code,
          description: role.description,
          hierarchyLevel: role.hierarchyLevel,
          isSystem: true,
          name: role.name,
          tenantId: null
        },
        select: { id: true }
      });

      await tx.rolePermission.deleteMany({ where: { roleId: savedRole.id } });
      await tx.rolePermission.createMany({
        data: role.permissions.map((permissionCode) => {
          const permissionId = permissionsByCode.get(permissionCode);

          if (!permissionId) {
            throw new Error(`No se encontro el permiso ${permissionCode}.`);
          }

          return {
            id: randomUUID(),
            permissionId,
            roleId: savedRole.id
          };
        }),
        skipDuplicates: true
      });
    }

    const stalePermissions = await tx.permission.findMany({
      where: { code: { in: stalePermissionCodes } },
      select: { id: true }
    });
    const stalePermissionIds = stalePermissions.map((permission) => permission.id);

    if (stalePermissionIds.length > 0) {
      await tx.rolePermission.deleteMany({
        where: { permissionId: { in: stalePermissionIds } }
      });
      await tx.permission.deleteMany({
        where: { id: { in: stalePermissionIds } }
      });
    }
  });
}

seedRbac()
  .then(() => {
    console.log("RBAC seed completed.");
  })
  .catch((error) => {
    console.error("RBAC seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
