import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuthService } from "../auth/auth.service";
import { JwtPayload } from "../auth/auth.types";
import { RBAC_PERMISSIONS, RBAC_ROLES } from "../rbac/rbac.constants";
import { RbacService } from "../rbac/rbac.service";
import {
  OnboardingChecklistStepId,
  StartOnboardingDto,
  UpdateOnboardingChecklistStepDto
} from "./onboarding.schemas";

type OnboardingChecklistDefinition = {
  actionLabel: string;
  description: string;
  id: OnboardingChecklistStepId;
  permissionMode?: "all" | "any";
  permissions: string[];
  title: string;
};

const onboardingChecklistSteps: OnboardingChecklistDefinition[] = [
  {
    actionLabel: "Importar expedientes",
    description: "Trae tus expedientes desde SAE Tucuman u otro sistema judicial disponible.",
    id: "import_cases",
    permissionMode: "any",
    permissions: ["integrations:sae_import"],
    title: "Importar expedientes"
  },
  {
    actionLabel: "Configurar caja",
    description: "Activa monedas, categorias financieras y un saldo inicial opcional.",
    id: "configure_finance",
    permissions: ["finance:update", "categories:create", "finance:create"],
    title: "Configurar caja"
  },
  {
    actionLabel: "Configurar notificaciones",
    description: "Define recordatorios in-app, browser local, email y anticipacion.",
    id: "configure_notifications",
    permissions: [],
    title: "Configurar notificaciones"
  },
  {
    actionLabel: "Ver calendario",
    description: "Prepara la futura conexion con Google Calendar o salta este paso.",
    id: "connect_calendar",
    permissions: [],
    title: "Conectar calendario"
  }
];

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly rbacService: RbacService
  ) {}

  async start(userId: string, input: StartOnboardingDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    if (existingUser.status !== "active") {
      throw new ConflictException("El usuario no está activo.");
    }

    const requestedEmail = input.owner?.email?.toLowerCase();
    if (requestedEmail && requestedEmail !== existingUser.email) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email: requestedEmail }
      });

      if (emailOwner && emailOwner.id !== existingUser.id) {
        throw new ConflictException("Ya existe un usuario con ese email.");
      }
    }

    await this.ensureRbacCatalog();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.currency.upsert({
        where: { code: input.tenant.defaultCurrency },
        update: {
          active: true,
          name: getCurrencyName(input.tenant.defaultCurrency),
          symbol: getCurrencySymbol(input.tenant.defaultCurrency)
        },
        create: {
          code: input.tenant.defaultCurrency,
          name: getCurrencyName(input.tenant.defaultCurrency),
          symbol: getCurrencySymbol(input.tenant.defaultCurrency),
          active: true
        }
      });

      const ownerRole = await tx.role.findUniqueOrThrow({
        where: { code: "owner" }
      });

      const user = input.owner
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              fullName: input.owner.fullName,
              email: input.owner.email.toLowerCase()
            }
          })
        : existingUser;

      const tenant = await tx.tenant.create({
        data: {
          name: input.tenant.name,
          legalName: input.tenant.legalName,
          taxId: input.tenant.taxId,
          status: "active"
        }
      });

      await tx.tenantProfile.create({
        data: {
          tenantId: tenant.id,
          country: input.tenant.country,
          province: input.tenant.province,
          city: input.tenant.city,
          address: input.tenant.address,
          website: input.tenant.website,
          logoUrl: input.tenant.logoUrl,
          size: input.tenant.size,
          mainPracticeAreas: input.tenant.mainPracticeAreas ?? [],
          referralSource: input.tenant.referralSource
        }
      });

      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          timezone: input.tenant.timezone,
          defaultCurrencyCode: input.tenant.defaultCurrency,
          defaultRoleForInvites: input.workspace.defaultRoleForInvites,
          caseNumberingMode: input.workspace.caseNumberingMode,
          documentStorageMode: input.workspace.documentStorageMode
        }
      });

      await tx.tenantCurrency.create({
        data: {
          currencyCode: input.tenant.defaultCurrency,
          tenantId: tenant.id
        }
      });

      const selectedPracticeAreaCodes = [...new Set(input.workspace.practiceAreaCodes)];

      if (selectedPracticeAreaCodes.length > 0) {
        const templates = await tx.practiceAreaTemplate.findMany({
          where: {
            active: true,
            code: { in: selectedPracticeAreaCodes }
          }
        });
        const foundCodes = new Set(templates.map((template) => template.code));
        const missingCodes = selectedPracticeAreaCodes.filter((code) => !foundCodes.has(code));

        if (missingCodes.length > 0) {
          throw new BadRequestException(`Areas de practica invalidas: ${missingCodes.join(", ")}.`);
        }

        await tx.practiceArea.createMany({
          data: templates.map((template) => ({
            tenantId: tenant.id,
            templateId: template.id,
            name: template.name,
            description: template.description
          })),
          skipDuplicates: true
        });
      } else if (input.workspace.practiceAreas.length > 0) {
        await tx.practiceArea.createMany({
          data: input.workspace.practiceAreas.map((name) => ({
            tenantId: tenant.id,
            name
          })),
          skipDuplicates: true
        });
      }

      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: ownerRole.id,
          status: "active",
          joinedAt: new Date()
        }
      });

      return { user, tenant };
    });

    const payload: JwtPayload = {
      sub: result.user.id,
      email: result.user.email,
      sessionVersion: await this.getUserSessionVersion(result.user.id),
      tenantAccess: [
        {
          tenantId: result.tenant.id,
          role: "owner",
          permissions: await this.rbacService.getPermissionsForRole("owner")
        }
      ]
    };

    return {
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: "owner",
      tokens: await this.authService.issueTokens(payload)
    };
  }

  async status(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        profile: true,
        settings: true,
        practiceAreas: true,
        memberships: true
      }
    });

    if (!tenant) {
      throw new NotFoundException("Tenant no encontrado.");
    }

    const hasProfile = Boolean(tenant.profile);
    const hasSettings = Boolean(tenant.settings);
    const hasPracticeAreas = tenant.practiceAreas.length > 0;
    const hasInvitedTeam = tenant.memberships.some((membership) => membership.status === "invited");
    const missingSteps = [
      !hasProfile && "profile",
      !hasSettings && "settings",
      !hasPracticeAreas && "practice_areas",
      !hasInvitedTeam && "team_invites",
      "first_client",
      "first_case",
      "first_document"
    ].filter(Boolean) as string[];

    return {
      tenantId,
      hasProfile,
      hasSettings,
      hasPracticeAreas,
      hasInvitedTeam,
      hasFirstClient: false,
      hasFirstCase: false,
      hasFirstDocument: false,
      missingSteps
    };
  }

  async checklist(tenantId: string, user: JwtPayload) {
    const membership = await this.findActiveMembershipOrThrow(tenantId, user.sub);
    const visibleSteps = onboardingChecklistSteps.filter((step) =>
      hasPermissions(user, tenantId, step.permissions, step.permissionMode ?? "all")
    );

    if (visibleSteps.length === 0) {
      return {
        completedCount: 0,
        hidden: true,
        progress: 100,
        steps: [],
        totalCount: 0
      };
    }

    const savedSteps = await this.prisma.tenantOnboardingChecklistItem.findMany({
      where: {
        step: { in: visibleSteps.map((step) => step.id) },
        tenantId,
        tenantMembershipId: membership.id
      }
    });
    const statusByStep = new Map(savedSteps.map((step) => [step.step, step.status]));
    const steps = visibleSteps.map((step) => ({
      actionLabel: step.actionLabel,
      description: step.description,
      enabled: true,
      id: step.id,
      requiredPermission: step.permissions[0] ?? null,
      status: statusByStep.get(step.id) ?? "pending",
      title: step.title
    }));
    const completedCount = steps.filter((step) => step.status !== "pending").length;

    return {
      completedCount,
      hidden: completedCount === steps.length,
      progress: Math.round((completedCount / steps.length) * 100),
      steps,
      totalCount: steps.length
    };
  }

  async updateChecklistStep(
    tenantId: string,
    user: JwtPayload,
    stepId: OnboardingChecklistStepId,
    input: UpdateOnboardingChecklistStepDto
  ) {
    const definition = onboardingChecklistSteps.find((step) => step.id === stepId);

    if (
      !definition ||
      !hasPermissions(user, tenantId, definition.permissions, definition.permissionMode ?? "all")
    ) {
      throw new ForbiddenException("No tenes permisos para actualizar este paso.");
    }

    const membership = await this.findActiveMembershipOrThrow(tenantId, user.sub);
    const now = new Date();

    await this.prisma.tenantOnboardingChecklistItem.upsert({
      where: {
        tenantId_tenantMembershipId_step: {
          step: stepId,
          tenantId,
          tenantMembershipId: membership.id
        }
      },
      create: {
        completedAt: input.status === "completed" ? now : null,
        skippedAt: input.status === "skipped" ? now : null,
        status: input.status,
        step: stepId,
        tenantId,
        tenantMembershipId: membership.id
      },
      update: {
        completedAt: input.status === "completed" ? now : null,
        skippedAt: input.status === "skipped" ? now : null,
        status: input.status
      }
    });

    return this.checklist(tenantId, user);
  }

  private async ensureRbacCatalog() {
    await Promise.all(
      RBAC_PERMISSIONS.map((permission) =>
        this.prisma.permission.upsert({
          where: { code: permission.code },
          update: {
            resource: permission.resource,
            action: permission.action
          },
          create: {
            code: permission.code,
            resource: permission.resource,
            action: permission.action
          }
        })
      )
    );

    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: RBAC_PERMISSIONS.map((permission) => permission.code) }
      },
      select: {
        code: true,
        id: true
      }
    });
    const permissionIdsByCode = new Map(
      permissions.map((permission) => [permission.code, permission.id])
    );

    await Promise.all(
      RBAC_ROLES.map(async (role) => {
        const savedRole = await this.prisma.role.upsert({
          where: { code: role.code },
          update: {
            description: role.description,
            hierarchyLevel: role.hierarchyLevel,
            name: role.name,
            isSystem: true
          },
          create: {
            code: role.code,
            description: role.description,
            hierarchyLevel: role.hierarchyLevel,
            name: role.name,
            isSystem: true
          }
        });

        await Promise.all(
          role.permissions.map((permissionCode) => {
            const permissionId = permissionIdsByCode.get(permissionCode);

            if (!permissionId) {
              throw new BadRequestException(`Permiso RBAC inexistente: ${permissionCode}.`);
            }

            return this.prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: savedRole.id,
                  permissionId
                }
              },
              update: {},
              create: {
                roleId: savedRole.id,
                permissionId
              }
            });
          })
        );
      })
    );
  }

  private async getUserSessionVersion(userId: string) {
    const [user] = await this.prisma.$queryRaw<Array<{ sessionVersion: number }>>`
      SELECT "session_version" AS "sessionVersion"
      FROM "users"
      WHERE "id" = ${userId}::uuid
      LIMIT 1
    `;

    return user?.sessionVersion ?? 0;
  }

  private async findActiveMembershipOrThrow(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        status: "active",
        tenantId,
        userId
      },
      select: { id: true }
    });

    if (!membership) {
      throw new NotFoundException("No se encontro una membresia activa para este estudio.");
    }

    return membership;
  }
}

function getCurrencyName(code: string) {
  const names: Record<string, string> = {
    ARS: "Peso argentino",
    BRL: "Real brasileno",
    USD: "Dolar estadounidense"
  };

  return names[code] ?? code;
}

function getCurrencySymbol(code: string) {
  const symbols: Record<string, string> = {
    ARS: "$",
    BRL: "R$",
    USD: "US$"
  };

  return symbols[code] ?? code;
}

function hasPermissions(
  user: JwtPayload,
  tenantId: string,
  permissions: string[],
  mode: "all" | "any"
) {
  if (permissions.length === 0) {
    return true;
  }

  const access = user.tenantAccess.find((tenantAccess) => tenantAccess.tenantId === tenantId);
  if (!access) {
    return false;
  }

  return mode === "any"
    ? permissions.some((permission) => access.permissions.includes(permission))
    : permissions.every((permission) => access.permissions.includes(permission));
}
