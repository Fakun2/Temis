import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type {
  ListPlatformUsersQuery,
  UpdatePlatformAccountPasswordInput,
  UpdatePlatformAccountProfileInput
} from "./platform.schemas";

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary() {
    const founderUsers: Prisma.UserWhereInput = {
      platformRoleAssignment: null,
      createdTenants: { some: {} }
    };
    const [total, active, inactive] = await this.prisma.$transaction([
      this.prisma.user.count({ where: founderUsers }),
      this.prisma.user.count({ where: { ...founderUsers, status: "active" } }),
      this.prisma.user.count({ where: { ...founderUsers, status: "inactive" } })
    ]);

    return { generatedAt: new Date().toISOString(), users: { active, inactive, total } };
  }

  async listUsers(query: ListPlatformUsersQuery) {
    const cursor = decodePlatformUsersCursor(query.cursor);
    const filters = {
      search: query.search ?? null,
      status: query.status ?? null
    };

    if (cursor && !samePlatformUsersCursor(cursor, { ...filters, ...sortConfig(query) })) {
      throw new BadRequestException("El cursor no corresponde a la consulta de usuarios.");
    }

    const where = platformUsersWhere(filters, cursor);

    const users = await this.prisma.user.findMany({
      where,
      orderBy: platformUsersOrderBy(query.sortBy, query.sortDirection),
      take: query.limit + 1,
      select: {
        createdAt: true,
        createdTenants: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            _count: { select: { memberships: true } },
            id: true,
            name: true,
            status: true
          }
        },
        email: true,
        fullName: true,
        id: true,
        lastLoginAt: true,
        status: true
      }
    });

    const hasNextPage = users.length > query.limit;
    const items = hasNextPage ? users.slice(0, query.limit) : users;
    const lastItem = items.at(-1);

    return {
      items: items.map((user) => {
        const foundedTenants = user.createdTenants.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          peopleCount: tenant._count.memberships,
          status: tenant.status
        }));
        return {
          createdAt: user.createdAt,
          email: user.email,
          foundedTenants,
          fullName: user.fullName,
          id: user.id,
          lastLoginAt: user.lastLoginAt,
          peopleCount: foundedTenants.reduce((total, tenant) => total + tenant.peopleCount, 0),
          status: user.status
        };
      }),
      pageInfo: {
        hasNextPage,
        limit: query.limit,
        nextCursor:
          hasNextPage && lastItem
            ? encodePlatformUsersCursor({
                id: lastItem.id,
                sortValue: platformUserSortValue(lastItem, query.sortBy),
                ...filters,
                ...sortConfig(query)
              })
            : null
      }
    };
  }

  async getAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarUrl: true,
        email: true,
        fullName: true,
        id: true,
        passwordHash: true,
        phone: true
      }
    });

    if (!user) {
      throw new NotFoundException("No se encontro el usuario autenticado.");
    }

    return toPlatformAccount(user);
  }

  async updateAccountProfile(userId: string, input: UpdatePlatformAccountProfileInput) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: toFullName(input.firstName, input.lastName),
        phone: input.phone ?? null
      },
      select: {
        avatarUrl: true,
        email: true,
        fullName: true,
        id: true,
        passwordHash: true,
        phone: true
      }
    });

    return toPlatformAccount(user);
  }

  async updateAccountPassword(userId: string, input: UpdatePlatformAccountPasswordInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });

    if (!user) {
      throw new NotFoundException("No se encontro el usuario autenticado.");
    }

    if (user.passwordHash) {
      if (!input.currentPassword) {
        throw new BadRequestException("Ingresa tu contrasena actual.");
      }
      if (!(await compare(input.currentPassword, user.passwordHash))) {
        throw new UnauthorizedException("La contrasena actual no es correcta.");
      }
      if (await compare(input.newPassword, user.passwordHash)) {
        throw new BadRequestException("La nueva contrasena no puede ser igual a la actual.");
      }
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: await hash(input.newPassword, 12),
          sessionVersion: { increment: 1 }
        }
      }),
      this.prisma.platformSession.updateMany({
        where: { userId, status: "active" },
        data: { revokedAt: new Date(), status: "revoked" }
      })
    ]);

    return { status: "ok" as const };
  }

  async getSecurity(userId: string, currentSessionId?: string) {
    const [authenticators, devices, sessions] = await this.prisma.$transaction([
      this.prisma.platformAuthenticator.findMany({
        where: { userId, status: "active" },
        orderBy: { createdAt: "asc" },
        select: { aaguid: true, createdAt: true, id: true, lastUsedAt: true, name: true }
      }),
      this.prisma.platformDevice.findMany({
        where: { userId, status: "active" },
        orderBy: { createdAt: "asc" },
        select: { id: true, lastCompliantAt: true, lastSeenAt: true, name: true, platform: true }
      }),
      this.prisma.platformSession.findMany({
        where: { userId, status: "active" },
        orderBy: { lastActivityAt: "desc" },
        select: {
          authenticatedAt: true,
          device: { select: { name: true } },
          id: true,
          lastActivityAt: true
        }
      })
    ]);
    return {
      authenticators,
      devices,
      sessions: sessions.map((session) => ({
        ...session,
        current: session.id === currentSessionId,
        deviceName: session.device?.name ?? "Acceso por contrasena",
        device: undefined
      }))
    };
  }

  async revokeSession(userId: string, id: string) {
    await this.prisma.platformSession.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date(), status: "revoked" }
    });
    return { status: "ok" as const };
  }

  async revokeAuthenticator(userId: string, id: string) {
    const active = await this.prisma.platformAuthenticator.count({
      where: { userId, status: "active" }
    });
    if (active <= 2) {
      throw new BadRequestException("Deben quedar al menos dos llaves de seguridad activas.");
    }
    await this.prisma.$transaction([
      this.prisma.platformAuthenticator.updateMany({
        where: { id, userId },
        data: { revokedAt: new Date(), status: "revoked" }
      }),
      this.prisma.platformSession.updateMany({
        where: { userId, status: "active" },
        data: { revokedAt: new Date(), status: "revoked" }
      })
    ]);
    return { status: "ok" as const };
  }

  async revokeDevice(userId: string, id: string) {
    await this.prisma.$transaction([
      this.prisma.platformDevice.updateMany({
        where: { id, userId },
        data: { revokedAt: new Date(), status: "revoked" }
      }),
      this.prisma.platformSession.updateMany({
        where: { deviceId: id, userId, status: "active" },
        data: { revokedAt: new Date(), status: "revoked" }
      })
    ]);
    return { status: "ok" as const };
  }
}

function toPlatformAccount(user: {
  avatarUrl: string | null;
  email: string;
  fullName: string;
  id: string;
  passwordHash: string | null;
  phone: string | null;
}) {
  const { firstName, lastName } = splitFullName(user.fullName);

  return {
    avatarUrl: user.avatarUrl,
    email: user.email,
    firstName,
    fullName: user.fullName,
    hasPassword: Boolean(user.passwordHash),
    id: user.id,
    lastName,
    phone: user.phone
  };
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? fullName;
  const lastName = parts.slice(1).join(" ");

  return { firstName, lastName: lastName || firstName };
}

function toFullName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

type PlatformUsersCursor = {
  id: string;
  search: string | null;
  sortValue: string | null;
  sortBy: ListPlatformUsersQuery["sortBy"];
  sortDirection: ListPlatformUsersQuery["sortDirection"];
  status: ListPlatformUsersQuery["status"] | null;
};

function platformUsersWhere(
  filters: Pick<PlatformUsersCursor, "search" | "status">,
  cursor: PlatformUsersCursor | null
): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = {
    platformRoleAssignment: null,
    createdTenants: { some: {} },
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { email: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
            { fullName: { contains: filters.search, mode: Prisma.QueryMode.insensitive } }
          ]
        }
      : {})
  };

  return cursor ? { AND: [base, platformUsersSeekWhere(cursor)] } : base;
}

function platformUsersOrderBy(
  sortBy: ListPlatformUsersQuery["sortBy"],
  sortDirection: ListPlatformUsersQuery["sortDirection"]
): Prisma.UserOrderByWithRelationInput[] {
  const tieBreaker = { id: sortDirection } as const;

  if (sortBy === "name") return [{ fullName: sortDirection }, tieBreaker];
  if (sortBy === "status") return [{ status: sortDirection }, tieBreaker];
  if (sortBy === "lastLoginAt") {
    return [{ lastLoginAt: { sort: sortDirection, nulls: "last" } }, tieBreaker];
  }

  return [{ createdAt: sortDirection }, tieBreaker];
}

function sortConfig(query: ListPlatformUsersQuery) {
  return { sortBy: query.sortBy, sortDirection: query.sortDirection };
}

function encodePlatformUsersCursor(cursor: PlatformUsersCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodePlatformUsersCursor(value?: string): PlatformUsersCursor | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as Partial<PlatformUsersCursor>;
    if (
      typeof parsed.id !== "string" ||
      !isNullableString(parsed.search) ||
      !isNullableString(parsed.sortValue) ||
      !isNullableString(parsed.status) ||
      !isPlatformUserSortBy(parsed.sortBy) ||
      !isSortDirection(parsed.sortDirection)
    ) {
      throw new Error("invalid cursor");
    }

    if (
      (parsed.status !== null && parsed.status !== "active" && parsed.status !== "inactive") ||
      !isValidPlatformUserSortValue(parsed.sortBy, parsed.sortValue)
    ) {
      throw new Error("invalid cursor");
    }

    return parsed as PlatformUsersCursor;
  } catch {
    throw new BadRequestException("El cursor de usuarios es invalido.");
  }
}

function samePlatformUsersCursor(
  cursor: PlatformUsersCursor,
  input: Omit<PlatformUsersCursor, "id" | "sortValue">
) {
  return (
    cursor.search === input.search &&
    cursor.status === input.status &&
    cursor.sortBy === input.sortBy &&
    cursor.sortDirection === input.sortDirection
  );
}

function platformUserSortValue(
  user: { createdAt: Date; fullName: string; lastLoginAt: Date | null; status: string },
  sortBy: ListPlatformUsersQuery["sortBy"]
) {
  if (sortBy === "name") return user.fullName;
  if (sortBy === "status") return user.status;
  if (sortBy === "lastLoginAt") return user.lastLoginAt?.toISOString() ?? null;
  return user.createdAt.toISOString();
}

function platformUsersSeekWhere(cursor: PlatformUsersCursor): Prisma.UserWhereInput {
  const comparison = cursor.sortDirection === "asc" ? "gt" : "lt";
  const idComparison = { [comparison]: cursor.id };

  if (cursor.sortBy === "name") {
    return {
      OR: [
        { fullName: { [comparison]: cursor.sortValue as string } },
        { fullName: cursor.sortValue as string, id: idComparison }
      ]
    };
  }
  if (cursor.sortBy === "status") {
    const status = cursor.sortValue as "active" | "inactive";
    const followingStatus: "active" | "inactive" | null =
      cursor.sortDirection === "asc"
        ? status === "active"
          ? "inactive"
          : null
        : status === "inactive"
          ? "active"
          : null;
    return {
      OR: [{ status, id: idComparison }, ...(followingStatus ? [{ status: followingStatus }] : [])]
    };
  }
  if (cursor.sortBy === "lastLoginAt") {
    if (cursor.sortValue === null) return { lastLoginAt: null, id: idComparison };
    const value = new Date(cursor.sortValue);
    return {
      OR: [
        { lastLoginAt: { [comparison]: value } },
        { lastLoginAt: value, id: idComparison },
        { lastLoginAt: null }
      ]
    };
  }

  const value = new Date(cursor.sortValue as string);
  return {
    OR: [{ createdAt: { [comparison]: value } }, { createdAt: value, id: idComparison }]
  };
}

function isValidPlatformUserSortValue(sortBy: PlatformUsersCursor["sortBy"], value: string | null) {
  if (sortBy === "lastLoginAt") return value === null || !Number.isNaN(Date.parse(value));
  if (value === null) return false;
  if (sortBy === "createdAt") return !Number.isNaN(Date.parse(value));
  if (sortBy === "status") return value === "active" || value === "inactive";
  return true;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isPlatformUserSortBy(value: unknown): value is PlatformUsersCursor["sortBy"] {
  return value === "name" || value === "status" || value === "lastLoginAt" || value === "createdAt";
}

function isSortDirection(value: unknown): value is PlatformUsersCursor["sortDirection"] {
  return value === "asc" || value === "desc";
}
