import {
  getRbacControllerCreateRoleUrl,
  getRbacControllerDeleteRoleUrl,
  getRbacControllerPermissionsUrl,
  getRbacControllerRolesUrl,
  getRbacControllerUpdateRoleUrl,
  type PermissionDto,
  type RoleDto
} from "@temis/api-client";
import { dashboardHttpClient } from "@/lib/http";
import type { CreateRoleFormValues, UpdateRoleFormValues } from "@/lib/validation/roles";
import type { TemisSession } from "@/lib/auth/session";

export type RolesAccessResponse = {
  permissions: PermissionDto[];
  roles: RoleDto[];
};

export const roleKeys = {
  all: ["roles"] as const,
  access: () => [...roleKeys.all, "access"] as const
};

export async function listRolesAccess(): Promise<RolesAccessResponse> {
  const [permissions, roles] = await Promise.all([
    dashboardHttpClient.request<PermissionDto[]>({
      path: getRbacControllerPermissionsUrl()
    }),
    dashboardHttpClient.request<RoleDto[]>({
      path: getRbacControllerRolesUrl()
    })
  ]);

  return { permissions, roles };
}

export async function createRole({
  input
}: {
  input: CreateRoleFormValues;
  session: TemisSession;
  tenantId: string;
}) {
  return dashboardHttpClient.request<RoleDto>({
    body: input,
    method: "POST",
    path: getRbacControllerCreateRoleUrl()
  });
}

export async function updateRole({
  input,
  roleId
}: {
  input: UpdateRoleFormValues;
  roleId: string;
  session: TemisSession;
  tenantId: string;
}) {
  return dashboardHttpClient.request<RoleDto>({
    body: input,
    method: "PATCH",
    path: getRbacControllerUpdateRoleUrl(roleId)
  });
}

export async function deleteRole({
  roleId
}: {
  roleId: string;
  session: TemisSession;
  tenantId: string;
}) {
  return dashboardHttpClient.request<{ deleted: boolean }>({
    method: "DELETE",
    path: getRbacControllerDeleteRoleUrl(roleId)
  });
}
