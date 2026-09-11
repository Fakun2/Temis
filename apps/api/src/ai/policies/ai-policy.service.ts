import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { canUseAiTool, isReadOnlyTool } from "@temis/ai-core";
import type { PermissionCode } from "../../rbac/rbac.constants";
import { PrismaService } from "../../database/prisma.service";
import { aiTools, type AiToolDefinition } from "../ai.catalog";
import type { AiTenantAccess } from "../types/ai-access.types";

const aiPermission = "ai:case_chat" satisfies PermissionCode;

@Injectable()
export class AiPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async validateTenantUserAccess(tenantId: string, userId: string): Promise<AiTenantAccess> {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        status: "active",
        tenantId,
        userId,
        tenant: { status: "active" },
        user: { status: "active" }
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!membership) {
      throw new UnauthorizedException("No hay una membresia activa para el tenant.");
    }

    if (!membership.role?.active) {
      throw new ForbiddenException("El rol del usuario no esta activo para usar IA.");
    }

    const permissions = new Set(
      membership.role.rolePermissions.map((rolePermission) => rolePermission.permission.code)
    );

    if (!permissions.has(aiPermission)) {
      throw new ForbiddenException("No tenes permisos para usar el asistente de IA.");
    }

    return {
      permissions,
      roleCode: membership.role.code
    };
  }

  filterAllowedTools(access: AiTenantAccess) {
    return aiTools.filter((tool) => this.canUseTool(access, tool));
  }

  assertCanUseTool(access: AiTenantAccess, tool: AiToolDefinition) {
    this.assertReadOnlyTool(tool);

    if (!this.canUseTool(access, tool)) {
      throw new ForbiddenException("La herramienta seleccionada requiere permisos de lectura.");
    }
  }

  private canUseTool(access: AiTenantAccess, tool: AiToolDefinition) {
    return canUseAiTool(access.permissions, tool);
  }

  private assertReadOnlyTool(tool: AiToolDefinition) {
    if (!isReadOnlyTool(tool)) {
      throw new ForbiddenException("La herramienta seleccionada no cumple el modo solo lectura.");
    }
  }
}
