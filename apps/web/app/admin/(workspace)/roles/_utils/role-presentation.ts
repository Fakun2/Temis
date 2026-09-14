import type { PermissionDto } from "@temis/api-client";

const resourceLabels: Record<string, string> = {
  admin: "Administracion",
  cases: "Casos",
  categories: "Categorias",
  clients: "Clientes",
  expenses: "Gastos",
  hearings: "Audiencias",
  finance: "Caja",
  forums: "Fueros",
  provinces: "Provincias",
  roles: "Roles",
  staff: "Personal",
  tasks: "Tareas",
  tenants: "Configuracion"
};

const actionLabels: Record<string, string> = {
  access: "Acceder",
  create: "Crear",
  delete: "Eliminar",
  manage: "Administrar",
  read: "Ver",
  update: "Editar"
};

const resourceDescriptions: Record<string, string> = {
  admin: "Acceso general al panel administrativo.",
  cases: "Gestion de expedientes, seguimiento y trabajo legal.",
  categories: "Configuracion de categorias financieras del estudio.",
  clients: "Administracion de clientes y datos de contacto.",
  expenses: "Gestion de gastos asociados a tareas y expedientes.",
  hearings: "Gestion de audiencias y notificaciones del expediente.",
  finance: "Consulta y control de caja del estudio.",
  forums: "Consulta de fueros y centros judiciales.",
  provinces: "Consulta del catalogo global de provincias.",
  roles: "Configuracion de roles y alcances del sistema.",
  staff: "Gestion del personal del estudio.",
  tasks: "Gestion de tareas y vencimientos operativos.",
  tenants: "Configuracion operativa del estudio."
};

export function getPermissionModule(permission: PermissionDto) {
  return resourceLabels[permission.resource] ?? toTitle(permission.resource);
}

export function getPermissionAction(permission: PermissionDto) {
  return actionLabels[permission.action] ?? toTitle(permission.action);
}

export function getPermissionDescription(permission: PermissionDto) {
  const action = getPermissionAction(permission).toLowerCase();
  const module = getPermissionModule(permission).toLowerCase();

  return `${toTitle(action)} informacion y acciones de ${module}.`;
}

export function getResourceDescription(resource: string) {
  return resourceDescriptions[resource] ?? "Permite operar dentro de este modulo.";
}

export function getRoleScopeSummary(permissionCodes: string[]) {
  const modules = unique(
    permissionCodes
      .map((permissionCode) => permissionCode.split(":")[0] ?? "")
      .filter((resource) => resource !== "admin")
      .map((resource) => resourceLabels[resource] ?? toTitle(resource))
  );

  if (modules.length === 0) {
    return "Sin alcance configurado.";
  }

  if (modules.length === 1) {
    return `Gestiona ${modules[0]!.toLowerCase()}.`;
  }

  if (modules.length === 2) {
    return `Gestiona ${modules[0]!.toLowerCase()} y ${modules[1]!.toLowerCase()}.`;
  }

  return `Gestiona ${modules
    .slice(0, -1)
    .map((module) => module.toLowerCase())
    .join(", ")} y ${modules[modules.length - 1]!.toLowerCase()}.`;
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "es"));
}

function toTitle(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
