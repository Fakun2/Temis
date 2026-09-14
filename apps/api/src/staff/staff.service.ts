import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { PrismaService } from "../database/prisma.service";
import type {
  CreateStaffInput,
  ListParticipantOptionsQuery,
  ListStaffQuery,
  UpdateStaffInput
} from "./staff.schemas";

const statusOptions = [
  { value: "active", label: "Activo" },
  { value: "invited", label: "Invitado" },
  { value: "suspended", label: "Suspendido" }
] as const;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, actorUserId: string, input: CreateStaffInput) {
    const email = input.email.toLowerCase();
    const dni = input.dni ?? null;
    const practiceAreaIds = input.practiceAreaIds ?? [];
    const fullName = toFullName(input.firstName, input.lastName);

    const [
      actorRole,
      existingTenantEmail,
      existingTenantDni,
      existingTenantName,
      existingUser,
      role,
      practiceAreas
    ] = await Promise.all([
      findActorRole(this.prisma, tenantId, actorUserId),
      this.prisma.tenantMembership.findFirst({
        where: {
          tenantId,
          user: { email }
        },
        select: { id: true }
      }),
      input.dni ? findTenantMembershipByUserDni(this.prisma, tenantId, input.dni) : null,
      findTenantMembershipByFullName(this.prisma, tenantId, fullName),
      this.prisma.user.findUnique({ where: { email } }),
      findAssignableRole(this.prisma, tenantId, input.role),
      practiceAreaIds.length
        ? this.prisma.practiceArea.findMany({
            where: {
              active: true,
              id: { in: practiceAreaIds },
              tenantId
            },
            select: { id: true }
          })
        : Promise.resolve([])
    ]);

    if (existingTenantEmail || existingTenantDni) {
      throw new ConflictException("Ese email o DNI ya estan asignados a alguien mas.");
    }

    if (existingTenantName) {
      throw new ConflictException("Ya existe un empleado con ese nombre y apellido.");
    }

    if (!role) {
      throw new BadRequestException("El rol seleccionado no existe.");
    }

    assertCanAssignRole(actorRole, role);

    if (practiceAreas.length !== new Set(practiceAreaIds).size) {
      throw new BadRequestException("Una o mas areas de trabajo no pertenecen al estudio activo.");
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            dni,
            email,
            fullName,
            passwordHash: await hash(input.password, 12),
            phone: input.phone,
            status: "active"
          } as Prisma.UserCreateInput & { dni: string | null }
        }));

      const createdMembership = await tx.tenantMembership.create({
        data: {
          joinedAt: new Date(),
          roleId: role.id,
          status: input.status,
          tenantId,
          userId: user.id
        }
      });

      if (practiceAreaIds.length > 0) {
        await tx.tenantMembershipPracticeArea.createMany({
          data: practiceAreaIds.map((practiceAreaId) => ({
            practiceAreaId,
            tenantMembershipId: createdMembership.id
          })),
          skipDuplicates: true
        });
      }

      return tx.tenantMembership.findUniqueOrThrow({
        where: { id: createdMembership.id },
        select: staffMembershipSelect
      });
    });

    return toWorkerDto(membership);
  }

  async update(
    tenantId: string,
    actorUserId: string,
    membershipId: string,
    input: UpdateStaffInput
  ) {
    const email = input.email.toLowerCase();
    const dni = input.dni ?? null;
    const practiceAreaIds = input.practiceAreaIds ?? [];
    const fullName = toFullName(input.firstName, input.lastName);

    const currentMembership = await this.prisma.tenantMembership.findFirst({
      where: { id: membershipId, tenantId },
      select: {
        id: true,
        role: { select: roleAccessSelect },
        status: true,
        userId: true
      }
    });

    if (!currentMembership) {
      throw new NotFoundException("El empleado no existe en el estudio activo.");
    }

    const [
      actorRole,
      existingTenantEmail,
      existingTenantDni,
      existingTenantName,
      existingGlobalEmail,
      role,
      practiceAreas
    ] = await Promise.all([
      findActorRole(this.prisma, tenantId, actorUserId),
      this.prisma.tenantMembership.findFirst({
        where: {
          id: { not: membershipId },
          tenantId,
          user: { email }
        },
        select: { id: true }
      }),
      input.dni
        ? findTenantMembershipByUserDni(this.prisma, tenantId, input.dni, membershipId)
        : null,
      findTenantMembershipByFullName(this.prisma, tenantId, fullName, membershipId),
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      findAssignableRole(this.prisma, tenantId, input.role),
      practiceAreaIds.length
        ? this.prisma.practiceArea.findMany({
            where: {
              active: true,
              id: { in: practiceAreaIds },
              tenantId
            },
            select: { id: true }
          })
        : Promise.resolve([])
    ]);

    if (existingTenantEmail || existingTenantDni) {
      throw new ConflictException("Ese email o DNI ya estan asignados a alguien mas.");
    }

    if (existingTenantName) {
      throw new ConflictException("Ya existe un empleado con ese nombre y apellido.");
    }

    if (existingGlobalEmail && existingGlobalEmail.id !== currentMembership.userId) {
      throw new ConflictException("Ese email ya pertenece a otro usuario del sistema.");
    }

    if (!role) {
      throw new BadRequestException("El rol seleccionado no existe.");
    }

    const currentRole = normalizeRoleAccess(currentMembership.role);
    assertCanManageStaffMember(actorRole, currentRole, {
      actorUserId,
      targetUserId: currentMembership.userId
    });

    const roleChanged = currentMembership.role?.code !== role.code;
    if (roleChanged) {
      assertCanChangeRole(actorRole, currentRole, role, {
        actorUserId,
        targetUserId: currentMembership.userId
      });
    }

    if (practiceAreas.length !== new Set(practiceAreaIds).size) {
      throw new BadRequestException("Una o mas areas de trabajo no pertenecen al estudio activo.");
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const shouldInvalidateUserSessions =
        Boolean(input.password) ||
        roleChanged ||
        (currentMembership.status !== "suspended" && input.status === "suspended");

      await tx.user.update({
        where: { id: currentMembership.userId },
        data: {
          dni,
          email,
          fullName,
          ...(input.password ? { passwordHash: await hash(input.password, 12) } : {}),
          phone: input.phone
        } as Prisma.UserUpdateInput & { dni: string | null }
      });

      if (shouldInvalidateUserSessions) {
        await tx.$executeRaw`
          UPDATE "users"
          SET "session_version" = "session_version" + 1
          WHERE "id" = ${currentMembership.userId}::uuid
        `;
      }

      await tx.tenantMembership.update({
        where: { id: membershipId },
        data: { roleId: role.id, status: input.status }
      });

      await tx.tenantMembershipPracticeArea.deleteMany({
        where: { tenantMembershipId: membershipId }
      });

      if (practiceAreaIds.length > 0) {
        await tx.tenantMembershipPracticeArea.createMany({
          data: practiceAreaIds.map((practiceAreaId) => ({
            practiceAreaId,
            tenantMembershipId: membershipId
          })),
          skipDuplicates: true
        });
      }

      return tx.tenantMembership.findUniqueOrThrow({
        where: { id: membershipId },
        select: staffMembershipSelect
      });
    });

    return toWorkerDto(membership);
  }

  async delete(tenantId: string, actorUserId: string, membershipId: string) {
    const [actorRole, membership] = await Promise.all([
      findActorRole(this.prisma, tenantId, actorUserId),
      this.prisma.tenantMembership.findFirst({
        where: { id: membershipId, tenantId },
        select: { id: true, role: { select: roleAccessSelect }, userId: true }
      })
    ]);

    if (!membership) {
      throw new NotFoundException("El empleado no existe en el estudio activo.");
    }

    const targetRole = normalizeRoleAccess(membership.role);

    if (targetRole?.code === "owner") {
      throw new ForbiddenException("No se puede eliminar al dueño del tenant.");
    }

    assertCanManageStaffMember(actorRole, targetRole, {
      actorUserId,
      targetUserId: membership.userId
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.tenantMembership.delete({
        where: { id: membership.id }
      });

      const remainingMemberships = await tx.tenantMembership.count({
        where: { userId: membership.userId }
      });

      if (remainingMemberships === 0) {
        await tx.user.delete({
          where: { id: membership.userId }
        });
      }
    });

    return { status: "ok" as const };
  }

  async list(tenantId: string, actorUserId: string, query: ListStaffQuery) {
    const nameFilters: Prisma.TenantMembershipWhereInput[] = [
      ...(query.firstName
        ? [
            {
              user: {
                fullName: { contains: query.firstName, mode: Prisma.QueryMode.insensitive }
              }
            }
          ]
        : []),
      ...(query.lastName
        ? [
            {
              user: {
                fullName: { contains: query.lastName, mode: Prisma.QueryMode.insensitive }
              }
            }
          ]
        : [])
    ];

    const where: Prisma.TenantMembershipWhereInput = {
      tenantId,
      ...(nameFilters.length ? { AND: nameFilters } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { role: { code: query.role } } : {}),
      ...(query.practiceAreaId
        ? {
            practiceAreas: {
              some: {
                practiceArea: {
                  id: query.practiceAreaId,
                  tenantId
                }
              }
            }
          }
        : {})
    };

    const [actorRole, memberships, totalWorkers, activeWorkers, tenantPracticeAreas, roles] =
      await this.prisma.$transaction([
        this.prisma.tenantMembership.findFirst({
          where: { status: "active", tenantId, userId: actorUserId },
          select: { role: { select: roleAccessSelect } }
        }),
        this.prisma.tenantMembership.findMany({
          cursor: query.cursor ? { id: query.cursor } : undefined,
          where,
          orderBy: getOrderBy(query.sortBy, query.sortDirection),
          skip: query.cursor ? 1 : 0,
          take: query.limit + 1,
          select: staffMembershipSelect
        }),
        this.prisma.tenantMembership.count({ where: { tenantId } }),
        this.prisma.tenantMembership.count({ where: { tenantId, status: "active" } }),
        this.prisma.practiceArea.findMany({
          where: { tenantId, active: true },
          select: practiceAreaSelect,
          orderBy: [{ name: "asc" }]
        }),
        this.prisma.role.findMany({
          where: {
            active: true,
            OR: [{ isSystem: true, tenantId: null }, { tenantId }]
          },
          select: {
            code: true,
            description: true,
            hierarchyLevel: true,
            isSystem: true,
            tenantId: true,
            name: true
          },
          orderBy: [{ name: "asc" }]
        })
      ]);

    const actorRoleAccess = actorRole?.role ? normalizeRoleAccess(actorRole.role) : null;
    const hasNextPage = memberships.length > query.limit;
    const pageMemberships = hasNextPage ? memberships.slice(0, query.limit) : memberships;
    const workers: Worker[] = pageMemberships.map(toWorkerDto);

    return {
      workers,
      metrics: {
        totalWorkers,
        activeWorkers,
        practiceAreasCount: tenantPracticeAreas.length
      },
      filterOptions: {
        practiceAreas: tenantPracticeAreas.map(toPracticeAreaDto),
        roles: roles
          .map((role) => ({
            code: role.code,
            name: role.name,
            description: role.description,
            hierarchyLevel: normalizeHierarchyLevel(role.hierarchyLevel),
            isSystem: role.isSystem,
            tenantId: role.tenantId
          }))
          .map((role) => ({
            code: role.code,
            name: role.name,
            description: role.description,
            assignable: canAssignRole(actorRoleAccess, role),
            hierarchyLevel: role.hierarchyLevel
          })),
        statuses: statusOptions
      },
      pageInfo: {
        limit: query.limit,
        nextCursor: hasNextPage ? (pageMemberships.at(-1)?.id ?? null) : null,
        hasNextPage
      }
    };
  }

  async listParticipantOptions(tenantId: string, query: ListParticipantOptionsQuery) {
    const search = query.search?.trim() || undefined;
    const cursor = decodeParticipantOptionsCursor(query.cursor);
    const filters = {
      practiceAreaId: query.practiceAreaId ?? null,
      role: query.role ?? null,
      search: search ?? null
    };

    if (cursor && !sameParticipantFilters(cursor, filters)) {
      throw new BadRequestException("El cursor no corresponde a la busqueda actual.");
    }

    const where: Prisma.TenantMembershipWhereInput = {
      tenantId,
      status: "active",
      ...(query.role ? { role: { code: query.role } } : {}),
      ...(query.practiceAreaId
        ? {
            practiceAreas: {
              some: { practiceArea: { id: query.practiceAreaId, tenantId } }
            }
          }
        : {}),
      ...(search
        ? {
            OR: [
              { user: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
              { user: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } }
            ]
          }
        : {}),
      ...(cursor
        ? {
            AND: [
              {
                OR: [
                  { user: { fullName: { gt: cursor.fullName } } },
                  { id: { gt: cursor.id }, user: { fullName: cursor.fullName } }
                ]
              }
            ]
          }
        : {})
    };

    const [memberships, practiceAreas, roles] = await this.prisma.$transaction([
      this.prisma.tenantMembership.findMany({
        where,
        orderBy: [{ user: { fullName: "asc" } }, { id: "asc" }],
        take: query.limit + 1,
        select: participantOptionSelect
      }),
      this.prisma.practiceArea.findMany({
        where: { tenantId, active: true },
        select: practiceAreaSelect,
        orderBy: [{ name: "asc" }]
      }),
      this.prisma.role.findMany({
        where: { active: true, OR: [{ isSystem: true, tenantId: null }, { tenantId }] },
        select: { code: true, description: true, hierarchyLevel: true, name: true },
        orderBy: [{ name: "asc" }]
      })
    ]);

    const hasNextPage = memberships.length > query.limit;
    const items = memberships.slice(0, query.limit);
    const lastItem = items.at(-1);

    return {
      items: items.map(toParticipantOptionDto),
      filterOptions: {
        practiceAreas: practiceAreas.map(toPracticeAreaDto),
        roles: roles.map((role) => ({
          code: role.code,
          name: role.name,
          description: role.description,
          hierarchyLevel: normalizeHierarchyLevel(role.hierarchyLevel),
          assignable: true
        }))
      },
      pageInfo: {
        limit: query.limit,
        nextCursor:
          hasNextPage && lastItem
            ? encodeParticipantOptionsCursor({
                ...filters,
                fullName: lastItem.user.fullName,
                id: lastItem.id
              })
            : null,
        hasNextPage
      }
    };
  }
}

const practiceAreaSelect = {
  id: true,
  name: true,
  description: true,
  templateId: true,
  template: {
    select: {
      code: true,
      description: true
    }
  }
} satisfies Prisma.PracticeAreaSelect;

const staffMembershipSelect = {
  id: true,
  userId: true,
  status: true,
  user: {
    select: {
      dni: true,
      email: true,
      fullName: true,
      phone: true
    }
  },
  role: {
    select: {
      code: true,
      description: true,
      hierarchyLevel: true,
      name: true
    }
  },
  practiceAreas: {
    select: {
      practiceArea: {
        select: practiceAreaSelect
      }
    }
  }
} satisfies Prisma.TenantMembershipSelect;

const participantOptionSelect = {
  id: true,
  user: { select: { email: true, fullName: true } },
  role: { select: { code: true, description: true, hierarchyLevel: true, name: true } },
  practiceAreas: { select: { practiceArea: { select: practiceAreaSelect } } }
} satisfies Prisma.TenantMembershipSelect;

const roleAccessSelect = {
  code: true,
  hierarchyLevel: true,
  isSystem: true,
  tenantId: true
} satisfies Prisma.RoleSelect;

type Worker = {
  id: string;
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  dni: string | null;
  phone: string | null;
  role: {
    code: string;
    name: string;
    description: string | null;
    hierarchyLevel?: number;
  } | null;
  status: "active" | "invited" | "suspended";
  practiceAreas: ReturnType<typeof toPracticeAreaDto>[];
};

type StaffMembership = Prisma.TenantMembershipGetPayload<{
  select: typeof staffMembershipSelect;
}>;

type ParticipantOptionMembership = Prisma.TenantMembershipGetPayload<{
  select: typeof participantOptionSelect;
}>;

type PracticeAreaWithTemplate = Prisma.PracticeAreaGetPayload<{
  select: typeof practiceAreaSelect;
}>;

function toWorkerDto(membership: StaffMembership): Worker {
  const { firstName, lastName } = splitFullName(membership.user.fullName);
  const user = membership.user as StaffMembership["user"] & { dni: string | null };

  return {
    id: membership.id,
    userId: membership.userId,
    fullName: membership.user.fullName,
    firstName,
    lastName,
    email: membership.user.email,
    dni: user.dni,
    phone: membership.user.phone,
    role: membership.role
      ? {
          code: membership.role.code,
          name: membership.role.name,
          description: membership.role.description,
          hierarchyLevel: normalizeHierarchyLevel(membership.role.hierarchyLevel)
        }
      : null,
    status: membership.status,
    practiceAreas: membership.practiceAreas
      .map(({ practiceArea }) => toPracticeAreaDto(practiceArea))
      .sort((left, right) => left.name.localeCompare(right.name, "es"))
  };
}

function findTenantMembershipByUserDni(
  prisma: PrismaService,
  tenantId: string,
  dni: string,
  excludedMembershipId?: string
) {
  const findFirst = prisma.tenantMembership.findFirst as unknown as (args: {
    where: { id?: { not: string }; tenantId: string; user: { dni: string } };
    select: { id: true };
  }) => Promise<{ id: string } | null>;

  return findFirst({
    where: {
      ...(excludedMembershipId ? { id: { not: excludedMembershipId } } : {}),
      tenantId,
      user: { dni }
    },
    select: { id: true }
  });
}

function findAssignableRole(prisma: PrismaService, tenantId: string, code: string) {
  if (typeof prisma.role.findFirst !== "function") {
    return prisma.role
      .findUnique({
        where: { code },
        select: { id: true, ...roleAccessSelect }
      })
      .then(normalizeRoleAccess);
  }

  return prisma.role
    .findFirst({
      where: {
        active: true,
        code,
        OR: [{ isSystem: true, tenantId: null }, { tenantId }]
      },
      select: { id: true, ...roleAccessSelect }
    })
    .then(normalizeRoleAccess);
}

async function findActorRole(
  prisma: PrismaService,
  tenantId: string,
  actorUserId: string
): Promise<{ role: RoleAccess | null } | null> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      status: "active",
      tenantId,
      userId: actorUserId
    },
    select: { role: { select: roleAccessSelect } }
  });

  if (!membership) {
    return null;
  }

  return {
    role: normalizeRoleAccess(membership.role)
  };
}

function normalizeRoleAccess<T extends { code: string }>(
  role: (T & { hierarchyLevel?: number | null }) | null
) {
  if (!role) {
    return null;
  }

  return {
    ...role,
    hierarchyLevel: normalizeHierarchyLevel(role.hierarchyLevel)
  };
}

type RoleAccess = {
  code: string;
  hierarchyLevel: number;
  isSystem: boolean;
  tenantId: string | null;
};

type AssignableRole = RoleAccess & {
  description?: string | null;
  id?: string;
  name?: string;
};

function assertCanAssignRole(
  actorMembership: { role: RoleAccess | null } | null,
  targetRole: RoleAccess
) {
  if (!canAssignRole(actorMembership?.role ?? null, targetRole)) {
    throw new ForbiddenException("No tenes permisos para asignar ese rol.");
  }
}

function assertCanChangeRole(
  actorMembership: { role: RoleAccess | null } | null,
  currentRole: RoleAccess | null,
  targetRole: RoleAccess,
  context: { actorUserId: string; targetUserId: string }
) {
  const actorRole = actorMembership?.role ?? null;

  if (context.actorUserId === context.targetUserId) {
    throw new ForbiddenException("No podes cambiar tu propio rol.");
  }

  if (!canManageStaffMemberRole(actorRole, currentRole) || !canAssignRole(actorRole, targetRole)) {
    throw new ForbiddenException("No tenes permisos para cambiar ese rol.");
  }
}

function assertCanManageStaffMember(
  actorMembership: { role: RoleAccess | null } | null,
  targetRole: RoleAccess | null,
  context: { actorUserId: string; targetUserId: string }
) {
  const actorRole = actorMembership?.role ?? null;

  if (actorRole?.hierarchyLevel !== 3 && context.actorUserId === context.targetUserId) {
    throw new ForbiddenException("No podes modificar tus propios datos desde Staff.");
  }

  if (!canManageStaffMemberRole(actorRole, targetRole)) {
    throw new ForbiddenException("No tenes permisos para modificar ese empleado.");
  }
}

function canAssignRole(actorRole: RoleAccess | null, targetRole: AssignableRole) {
  if (!actorRole) {
    return false;
  }

  if (actorRole.hierarchyLevel === 3) {
    return true;
  }

  return isStrictlyLowerHierarchy(actorRole, targetRole);
}

function canManageStaffMemberRole(actorRole: RoleAccess | null, currentRole: RoleAccess | null) {
  if (!actorRole) {
    return false;
  }

  if (actorRole.hierarchyLevel === 3) {
    return true;
  }

  if (!currentRole) {
    return true;
  }

  return getRoleRank(currentRole) < getRoleRank(actorRole);
}

function getRoleRank(role: RoleAccess | AssignableRole) {
  return normalizeHierarchyLevel(role.hierarchyLevel);
}

function isStrictlyLowerHierarchy(actorRole: RoleAccess, targetRole: AssignableRole) {
  return getRoleRank(targetRole) < getRoleRank(actorRole);
}

function normalizeHierarchyLevel(hierarchyLevel: number | null | undefined) {
  return hierarchyLevel === 1 || hierarchyLevel === 2 || hierarchyLevel === 3 ? hierarchyLevel : 1;
}

function findTenantMembershipByFullName(
  prisma: PrismaService,
  tenantId: string,
  fullName: string,
  excludedMembershipId?: string
) {
  return prisma.tenantMembership.findFirst({
    where: {
      ...(excludedMembershipId ? { id: { not: excludedMembershipId } } : {}),
      tenantId,
      user: {
        fullName: { equals: fullName, mode: Prisma.QueryMode.insensitive }
      }
    },
    select: { id: true }
  });
}

function toPracticeAreaDto(practiceArea: PracticeAreaWithTemplate) {
  return {
    id: practiceArea.id,
    name: practiceArea.name,
    description: practiceArea.description ?? practiceArea.template?.description ?? null,
    templateCode: practiceArea.template?.code ?? null,
    custom: practiceArea.templateId === null
  };
}

function toParticipantOptionDto(membership: ParticipantOptionMembership) {
  return {
    id: membership.id,
    fullName: membership.user.fullName,
    email: membership.user.email,
    role: membership.role
      ? {
          code: membership.role.code,
          name: membership.role.name,
          description: membership.role.description,
          hierarchyLevel: normalizeHierarchyLevel(membership.role.hierarchyLevel)
        }
      : null,
    practiceAreas: membership.practiceAreas.map(({ practiceArea }) => toPracticeAreaDto(practiceArea))
  };
}

type ParticipantOptionsCursor = {
  fullName: string;
  id: string;
  practiceAreaId: string | null;
  role: string | null;
  search: string | null;
};

function encodeParticipantOptionsCursor(cursor: ParticipantOptionsCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeParticipantOptionsCursor(cursor?: string): ParticipantOptionsCursor | null {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<ParticipantOptionsCursor>;
    if (
      typeof parsed.fullName !== "string" ||
      typeof parsed.id !== "string" ||
      !isNullableString(parsed.practiceAreaId) ||
      !isNullableString(parsed.role) ||
      !isNullableString(parsed.search)
    ) {
      throw new Error("invalid cursor");
    }

    return parsed as ParticipantOptionsCursor;
  } catch {
    throw new BadRequestException("El cursor de participantes es invalido.");
  }
}

function sameParticipantFilters(
  cursor: ParticipantOptionsCursor,
  filters: Pick<ParticipantOptionsCursor, "practiceAreaId" | "role" | "search">
) {
  return (
    cursor.practiceAreaId === filters.practiceAreaId &&
    cursor.role === filters.role &&
    cursor.search === filters.search
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.slice(1).join(" ");

  return {
    firstName,
    lastName: lastName || firstName
  };
}

function toFullName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

function getOrderBy(sortBy: ListStaffQuery["sortBy"], direction: "asc" | "desc") {
  const tieBreaker = { id: direction } as const;

  if (sortBy === "role") {
    return [{ role: { name: direction } }, tieBreaker];
  }

  if (sortBy === "status") {
    return [{ status: direction }, tieBreaker];
  }

  return [{ user: { fullName: direction } }, tieBreaker];
}
