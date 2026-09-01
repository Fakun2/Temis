import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import type { JwtPayload } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { ObjectStorageService } from "../storage/object-storage.service";
import type {
  UpdateAccountMembershipInput,
  UpdateAccountNotificationsInput,
  UpdateAccountPasswordInput,
  UpdateAccountProfileInput,
  UpdateAccountStudioInput
} from "./account.schemas";

const studioManagePermissions = ["tenants:manage"];
const membershipManagePermissions = ["tenants:manage", "billing:manage"];
const saeImportPermissions = ["integrations:sae_import"];
const accountAvatarUrl = "/api/account/avatar";
const allowedAccountAvatarMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp"
]);
export const maxAccountAvatarSizeBytes = 5 * 1024 * 1024;

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly storage?: ObjectStorageService
  ) {}

  async getAccount(tenantId: string, user: JwtPayload) {
    const context = await this.getAccountContext(tenantId, user.sub);
    return this.toAccountResponse(context, user);
  }

  async getAiUsage(tenantId: string, user: JwtPayload) {
    const context = await this.getAiUsageContext(tenantId, user.sub);
    return this.toAiUsageResponse(context);
  }

  async updateProfile(tenantId: string, user: JwtPayload, input: UpdateAccountProfileInput) {
    const fullName = toFullName(input.firstName, input.lastName);

    await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        avatarUrl: input.avatarUrl ?? null,
        fullName,
        phone: input.phone ?? null
      }
    });

    return this.getAccount(tenantId, user);
  }

  async uploadAvatar(
    tenantId: string,
    user: JwtPayload,
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined
  ) {
    const avatarFile = validateAccountAvatarFile(file);
    await this.findActiveMembershipOrThrow(tenantId, user.sub);

    await this.getStorage().putObject({
      body: avatarFile.buffer,
      contentLength: avatarFile.size,
      contentType: avatarFile.mimetype,
      key: getAccountAvatarObjectKey(tenantId, user.sub)
    });

    const avatarUrl = getAccountAvatarUrl();

    await this.prisma.user.update({
      where: { id: user.sub },
      data: { avatarUrl }
    });

    return { avatarUrl };
  }

  async getAvatar(tenantId: string, user: JwtPayload) {
    await this.findActiveMembershipOrThrow(tenantId, user.sub);

    const accountUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { avatarUrl: true }
    });

    if (
      accountUser?.avatarUrl !== accountAvatarUrl &&
      !accountUser?.avatarUrl?.startsWith(`${accountAvatarUrl}?`)
    ) {
      throw new NotFoundException("El usuario no tiene un avatar cargado.");
    }

    return this.getStorage().getObject(getAccountAvatarObjectKey(tenantId, user.sub));
  }

  async updateStudio(tenantId: string, user: JwtPayload, input: UpdateAccountStudioInput) {
    assertAnyPermission(user, tenantId, studioManagePermissions);

    await this.prisma.runWithTenant(tenantId, async (tx) => {
      await assertUniqueStudioIdentity(tx, tenantId, input);

      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          legalName: input.legalName ?? null,
          name: input.name,
          taxId: input.taxId ?? null
        }
      });

      await tx.tenantProfile.upsert({
        where: { tenantId },
        create: {
          address: input.address ?? null,
          city: input.city,
          country: input.country,
          logoUrl: input.logoUrl ?? null,
          province: input.province,
          tenantId,
          website: input.website ?? null
        },
        update: {
          address: input.address ?? null,
          city: input.city,
          country: input.country,
          logoUrl: input.logoUrl ?? null,
          province: input.province,
          website: input.website ?? null
        }
      });
    });

    return this.getAccount(tenantId, user);
  }

  async updateNotifications(
    tenantId: string,
    user: JwtPayload,
    input: UpdateAccountNotificationsInput
  ) {
    const membership = await this.findActiveMembershipOrThrow(tenantId, user.sub);

    await this.prisma.tenantMembershipSettings.upsert({
      where: { tenantMembershipId: membership.id },
      create: {
        browserNotifications: input.browserNotifications,
        dailyDigest: input.dailyDigest,
        emailReminders: input.emailReminders,
        inAppReminders: input.inAppReminders,
        reminderLeadTime: input.reminderLeadTime,
        tenantMembershipId: membership.id
      },
      update: {
        browserNotifications: input.browserNotifications,
        dailyDigest: input.dailyDigest,
        emailReminders: input.emailReminders,
        inAppReminders: input.inAppReminders,
        reminderLeadTime: input.reminderLeadTime
      }
    });

    return this.getAccount(tenantId, user);
  }

  async updateMembership(tenantId: string, user: JwtPayload, input: UpdateAccountMembershipInput) {
    assertAnyPermission(user, tenantId, membershipManagePermissions);

    await this.prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        accountPlan: input.accountPlan,
        accountPlanStatus: input.accountPlanStatus,
        monthlyTokenLimit: input.monthlyTokenLimit
      }
    });

    return this.getAccount(tenantId, user);
  }

  async updatePassword(tenantId: string, user: JwtPayload, input: UpdateAccountPasswordInput) {
    await this.assertValidPasswordChange(tenantId, user.sub, input);

    await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        passwordHash: await hash(input.newPassword, 12),
        sessionVersion: { increment: 1 }
      }
    });

    return { status: "ok" as const };
  }

  async validatePasswordChange(
    tenantId: string,
    user: JwtPayload,
    input: UpdateAccountPasswordInput
  ) {
    await this.assertValidPasswordChange(tenantId, user.sub, input);
    return { status: "ok" as const };
  }

  private async getAccountContext(tenantId: string, userId: string) {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [tenant, membership, tokenUsage] = await this.prisma.runWithTenant(tenantId, async (tx) =>
      Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            legalName: true,
            name: true,
            profile: {
              select: {
                address: true,
                city: true,
                country: true,
                logoUrl: true,
                province: true,
                website: true
              }
            },
            settings: {
              select: {
                accountPlan: true,
                accountPlanStatus: true,
                monthlyTokenLimit: true
              }
            },
            taxId: true
          }
        }),
        tx.tenantMembership.findFirst({
          where: { status: "active", tenantId, userId },
          select: accountMembershipSelect
        }),
        tx.aiChatRun.aggregate({
          _sum: {
            inputTokens: true,
            outputTokens: true
          },
          where: {
            createdAt: {
              gte: periodStart,
              lt: periodEnd
            },
            tenantId
          }
        })
      ])
    );

    if (!tenant) {
      throw new NotFoundException("El estudio activo no existe.");
    }

    if (!membership) {
      throw new NotFoundException("No se encontro una membresia activa para este estudio.");
    }

    return {
      membership,
      periodEnd,
      periodStart,
      tenant,
      tokenUsage
    };
  }

  private async getAiUsageContext(tenantId: string, userId: string) {
    const now = new Date();
    const periodStart = getUtcMonthStart(now);
    const periodEnd = getNextUtcMonthStart(periodStart);
    const historyPeriodStart = getUtcMonthStart(now);
    historyPeriodStart.setUTCMonth(historyPeriodStart.getUTCMonth() - 11);
    const historyPeriodEnd = getNextUtcDayStart(now);

    const [tenant, membership, runs] = await this.prisma.runWithTenant(tenantId, async (tx) =>
      Promise.all([
        tx.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            settings: {
              select: {
                accountPlan: true,
                accountPlanStatus: true,
                monthlyTokenLimit: true
              }
            }
          }
        }),
        tx.tenantMembership.findFirst({
          where: { status: "active", tenantId, userId },
          select: accountMembershipSelect
        }),
        tx.aiChatRun.findMany({
          orderBy: { createdAt: "asc" },
          select: {
            createdAt: true,
            inputTokens: true,
            outputTokens: true
          },
          where: {
            createdAt: {
              gte: historyPeriodStart,
              lt: historyPeriodEnd
            },
            tenantId
          }
        })
      ])
    );

    if (!tenant) {
      throw new NotFoundException("El estudio activo no existe.");
    }

    if (!membership) {
      throw new NotFoundException("No se encontro una membresia activa para este estudio.");
    }

    const dailyUsage = buildDailyUsageSeries(historyPeriodStart, historyPeriodEnd, runs);
    const usedTokens = dailyUsage
      .filter((day) => {
        const date = new Date(`${day.date}T00:00:00.000Z`);
        return date >= periodStart && date < periodEnd;
      })
      .reduce((sum, day) => sum + day.totalTokens, 0);
    const monthlyTokenLimit = tenant.settings?.monthlyTokenLimit ?? 100000;

    return {
      dailyUsage,
      historyPeriodEnd,
      historyPeriodStart,
      membership,
      metrics: buildAiUsageMetrics(dailyUsage),
      periodEnd,
      periodStart,
      tenant,
      tokenUsage: {
        periodEnd: periodEnd.toISOString(),
        periodStart: periodStart.toISOString(),
        remainingTokens: Math.max(monthlyTokenLimit - usedTokens, 0),
        usedTokens
      }
    };
  }

  private findActiveMembershipOrThrow(tenantId: string, userId: string) {
    return this.prisma.tenantMembership
      .findFirst({
        where: { status: "active", tenantId, userId },
        select: { id: true }
      })
      .then((membership) => {
        if (!membership) {
          throw new NotFoundException("No se encontro una membresia activa para este estudio.");
        }

        return membership;
      });
  }

  private async assertValidPasswordChange(
    tenantId: string,
    userId: string,
    input: UpdateAccountPasswordInput
  ) {
    await this.findActiveMembershipOrThrow(tenantId, userId);

    const accountUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });

    if (!accountUser) {
      throw new NotFoundException("No se encontro el usuario autenticado.");
    }

    if (!accountUser.passwordHash) {
      return;
    }

    if (!input.currentPassword) {
      throw new BadRequestException("Ingresa tu contrasena actual.");
    }

    const currentPasswordMatches = await compare(input.currentPassword, accountUser.passwordHash);
    if (!currentPasswordMatches) {
      throw new UnauthorizedException("La contrasena actual no es correcta.");
    }

    const samePassword = await compare(input.newPassword, accountUser.passwordHash);
    if (samePassword) {
      throw new BadRequestException("La nueva contrasena no puede ser igual a la actual.");
    }
  }

  private getStorage() {
    if (!this.storage) {
      throw new Error("El almacenamiento de objetos no esta configurado.");
    }

    return this.storage;
  }

  private toAccountResponse(context: AccountContext, user: JwtPayload) {
    const { firstName, lastName } = splitFullName(context.membership.user.fullName);
    const settings = context.membership.settings;
    const tenantSettings = context.tenant.settings;
    const monthlyTokenLimit = tenantSettings?.monthlyTokenLimit ?? 100000;
    const usedTokens =
      (context.tokenUsage._sum.inputTokens ?? 0) + (context.tokenUsage._sum.outputTokens ?? 0);

    return {
      membership: {
        accountPlan: tenantSettings?.accountPlan ?? "trial",
        accountPlanStatus: tenantSettings?.accountPlanStatus ?? "active",
        id: context.membership.id,
        monthlyTokenLimit,
        roleCode: context.membership.role?.code ?? null,
        roleName: context.membership.role?.name ?? null,
        status: context.membership.status
      },
      notifications: {
        browserNotifications: settings?.browserNotifications ?? false,
        dailyDigest: settings?.dailyDigest ?? false,
        emailReminders: settings?.emailReminders ?? false,
        inAppReminders: settings?.inAppReminders ?? true,
        reminderLeadTime: settings?.reminderLeadTime ?? 24
      },
      permissions: {
        canImportSae: hasAnyPermission(user, context.tenant.id, saeImportPermissions),
        canManageMembership: hasAnyPermission(user, context.tenant.id, membershipManagePermissions),
        canManageStudio: hasAnyPermission(user, context.tenant.id, studioManagePermissions)
      },
      profile: {
        avatarUrl: context.membership.user.avatarUrl,
        email: context.membership.user.email,
        firstName,
        fullName: context.membership.user.fullName,
        hasPassword: Boolean(context.membership.user.passwordHash),
        id: context.membership.user.id,
        lastName,
        phone: context.membership.user.phone
      },
      studio: {
        address: context.tenant.profile?.address ?? null,
        city: context.tenant.profile?.city ?? "",
        country: context.tenant.profile?.country ?? "",
        id: context.tenant.id,
        legalName: context.tenant.legalName,
        logoUrl: context.tenant.profile?.logoUrl ?? null,
        name: context.tenant.name,
        province: context.tenant.profile?.province ?? "",
        taxId: context.tenant.taxId,
        website: context.tenant.profile?.website ?? null
      },
      tokenUsage: {
        periodEnd: context.periodEnd.toISOString(),
        periodStart: context.periodStart.toISOString(),
        remainingTokens: Math.max(monthlyTokenLimit - usedTokens, 0),
        usedTokens
      }
    };
  }

  private toAiUsageResponse(context: AccountAiUsageContext) {
    const { firstName, lastName } = splitFullName(context.membership.user.fullName);
    const tenantSettings = context.tenant.settings;
    const monthlyTokenLimit = tenantSettings?.monthlyTokenLimit ?? 100000;

    return {
      dailyUsage: context.dailyUsage,
      historyPeriodEnd: context.historyPeriodEnd.toISOString(),
      historyPeriodStart: context.historyPeriodStart.toISOString(),
      membership: {
        accountPlan: tenantSettings?.accountPlan ?? "trial",
        accountPlanStatus: tenantSettings?.accountPlanStatus ?? "active",
        id: context.membership.id,
        monthlyTokenLimit,
        roleCode: context.membership.role?.code ?? null,
        roleName: context.membership.role?.name ?? null,
        status: context.membership.status
      },
      metrics: context.metrics,
      profile: {
        avatarUrl: context.membership.user.avatarUrl,
        email: context.membership.user.email,
        firstName,
        fullName: context.membership.user.fullName,
        hasPassword: Boolean(context.membership.user.passwordHash),
        id: context.membership.user.id,
        lastName,
        phone: context.membership.user.phone
      },
      tokenUsage: context.tokenUsage
    };
  }
}

const accountMembershipSelect = {
  id: true,
  role: {
    select: {
      code: true,
      name: true
    }
  },
  settings: {
    select: {
      dailyDigest: true,
      browserNotifications: true,
      emailReminders: true,
      inAppReminders: true,
      reminderLeadTime: true
    }
  },
  status: true,
  user: {
    select: {
      avatarUrl: true,
      email: true,
      fullName: true,
      id: true,
      passwordHash: true,
      phone: true
    }
  }
} satisfies Prisma.TenantMembershipSelect;

type AccountContext = {
  membership: Prisma.TenantMembershipGetPayload<{ select: typeof accountMembershipSelect }>;
  periodEnd: Date;
  periodStart: Date;
  tenant: {
    id: string;
    legalName: string | null;
    name: string;
    profile: {
      address: string | null;
      city: string;
      country: string;
      logoUrl: string | null;
      province: string;
      website: string | null;
    } | null;
    settings: {
      accountPlan: string;
      accountPlanStatus: string;
      monthlyTokenLimit: number;
    } | null;
    taxId: string | null;
  };
  tokenUsage: {
    _sum: {
      inputTokens: number | null;
      outputTokens: number | null;
    };
  };
};

type AccountAiUsageContext = {
  dailyUsage: AiUsageDay[];
  historyPeriodEnd: Date;
  historyPeriodStart: Date;
  membership: Prisma.TenantMembershipGetPayload<{ select: typeof accountMembershipSelect }>;
  metrics: AiUsageMetrics;
  periodEnd: Date;
  periodStart: Date;
  tenant: {
    id: string;
    settings: {
      accountPlan: string;
      accountPlanStatus: string;
      monthlyTokenLimit: number;
    } | null;
  };
  tokenUsage: {
    periodEnd: string;
    periodStart: string;
    remainingTokens: number;
    usedTokens: number;
  };
};

type AiUsageRun = {
  createdAt: Date;
  inputTokens: number | null;
  outputTokens: number | null;
};

type AiUsageDay = {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type AiUsageMetrics = {
  currentStreak: number;
  longestStreak: number;
  maxDailyTokens: number;
  totalTokens: number;
};

function assertAnyPermission(user: JwtPayload, tenantId: string, permissions: string[]) {
  if (!hasAnyPermission(user, tenantId, permissions)) {
    throw new ForbiddenException("No tenes permisos para actualizar esta seccion de cuenta.");
  }
}

function hasAnyPermission(user: JwtPayload, tenantId: string, permissions: string[]) {
  const access = user.tenantAccess.find((tenantAccess) => tenantAccess.tenantId === tenantId);
  return Boolean(
    access && permissions.some((permission) => access.permissions.includes(permission))
  );
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

async function assertUniqueStudioIdentity(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input: UpdateAccountStudioInput
) {
  const nameConflict = await tx.tenant.findFirst({
    where: {
      id: { not: tenantId },
      name: {
        equals: input.name.trim(),
        mode: "insensitive"
      }
    },
    select: { id: true }
  });

  if (nameConflict) {
    throw new ConflictException("Ya existe un estudio juridico con ese nombre.");
  }

  const normalizedTaxId = normalizeTaxId(input.taxId);
  if (!normalizedTaxId) {
    return;
  }

  const tenantsWithTaxId = await tx.tenant.findMany({
    where: {
      id: { not: tenantId },
      taxId: { not: null }
    },
    select: {
      memberships: {
        where: {
          role: { code: "owner" },
          status: "active"
        },
        select: { id: true },
        take: 1
      },
      taxId: true
    }
  });

  const taxIdOwnerConflict = tenantsWithTaxId.some(
    (tenant) => normalizeTaxId(tenant.taxId) === normalizedTaxId && tenant.memberships.length > 0
  );

  if (taxIdOwnerConflict) {
    throw new ConflictException("Ese CUIT/CUIL ya esta asociado a un owner de otro estudio.");
  }
}

function normalizeTaxId(taxId?: string | null) {
  return taxId?.replace(/\D/g, "") ?? "";
}

function validateAccountAvatarFile(
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined
) {
  if (!file?.buffer?.length) {
    throw new BadRequestException("Selecciona una imagen para usar como avatar.");
  }

  if (!allowedAccountAvatarMimeTypes.has(file.mimetype)) {
    throw new BadRequestException("El avatar debe ser una imagen JPG, PNG, WebP o SVG.");
  }

  if (file.size > maxAccountAvatarSizeBytes) {
    throw new BadRequestException("El avatar no puede superar 5 MB.");
  }

  return file;
}

function getAccountAvatarObjectKey(tenantId: string, userId: string) {
  return `avatars/${tenantId}/${userId}/avatar`;
}

function getAccountAvatarUrl() {
  return `${accountAvatarUrl}?v=${Date.now()}`;
}

function buildDailyUsageSeries(start: Date, endExclusive: Date, runs: AiUsageRun[]) {
  const usageByDate = new Map<string, AiUsageDay>();
  const cursor = new Date(start);

  while (cursor < endExclusive) {
    const date = toDateKey(cursor);
    usageByDate.set(date, {
      date,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const run of runs) {
    const date = toDateKey(run.createdAt);
    const existing = usageByDate.get(date);

    if (!existing) {
      continue;
    }

    const inputTokens = run.inputTokens ?? 0;
    const outputTokens = run.outputTokens ?? 0;
    existing.inputTokens += inputTokens;
    existing.outputTokens += outputTokens;
    existing.totalTokens += inputTokens + outputTokens;
  }

  return [...usageByDate.values()];
}

function buildAiUsageMetrics(dailyUsage: AiUsageDay[]) {
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let maxDailyTokens = 0;
  let totalTokens = 0;

  for (const day of dailyUsage) {
    totalTokens += day.totalTokens;
    maxDailyTokens = Math.max(maxDailyTokens, day.totalTokens);

    if (day.totalTokens > 0) {
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  for (const day of [...dailyUsage].reverse()) {
    if (day.totalTokens <= 0) {
      break;
    }
    currentStreak += 1;
  }

  return {
    currentStreak,
    longestStreak,
    maxDailyTokens,
    totalTokens
  };
}

function getUtcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getNextUtcMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function getNextUtcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
