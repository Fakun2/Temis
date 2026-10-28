import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type {
  CreatePlatformAnnouncementInput,
  ListPlatformAnnouncementsQuery,
  ListPlatformAnnouncementTenantOptionsQuery,
  UpdatePlatformAnnouncementInput
} from "./platform-announcements.schemas";
import {
  activeAnnouncementWhere,
  announcementData,
  announcementFilters,
  announcementLifecycle,
  announcementWhere,
  creationDates,
  decodeAnnouncementCursor,
  encodeAnnouncementCursor,
  type AnnouncementCursor,
  type TenantCursor
} from "./platform-announcements.policy";

@Injectable()
export class PlatformAnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPlatformAnnouncementsQuery) {
    const cursor = decodeAnnouncementCursor<AnnouncementCursor>(query.cursor);
    const filters = announcementFilters(query);
    if (cursor && JSON.stringify(cursor.filters) !== JSON.stringify(filters)) {
      throw new BadRequestException("El cursor no corresponde a la consulta de comunicados.");
    }
    const evaluatedAt = cursor ? new Date(cursor.evaluatedAt) : new Date();
    if (Number.isNaN(evaluatedAt.getTime()))
      throw new BadRequestException("El cursor de comunicados no es válido.");

    const rows = await this.prisma.platformAnnouncement.findMany({
      where: announcementWhere(filters, evaluatedAt, cursor),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      select: {
        _count: { select: { targets: true } },
        audience: true,
        body: true,
        category: true,
        createdAt: true,
        createdBy: { select: { fullName: true } },
        endsAt: true,
        id: true,
        linkLabel: true,
        linkUrl: true,
        revision: true,
        severity: true,
        startsAt: true,
        status: true,
        title: true,
        updatedAt: true
      }
    });
    const hasNextPage = rows.length > query.limit;
    const pageRows = hasNextPage ? rows.slice(0, query.limit) : rows;
    const last = pageRows.at(-1);
    return {
      evaluatedAt: evaluatedAt.toISOString(),
      items: pageRows.map((row) => ({
        audience: row.audience,
        body: row.body,
        category: row.category,
        createdAt: row.createdAt,
        createdByName: row.createdBy.fullName,
        endsAt: row.endsAt,
        id: row.id,
        lifecycle: announcementLifecycle(row, evaluatedAt),
        linkLabel: row.linkLabel,
        linkUrl: row.linkUrl,
        revision: row.revision,
        severity: row.severity,
        startsAt: row.startsAt,
        status: row.status,
        targetCount: row._count.targets,
        title: row.title,
        updatedAt: row.updatedAt
      })),
      pageInfo: {
        hasNextPage,
        limit: query.limit,
        nextCursor:
          hasNextPage && last
            ? encodeAnnouncementCursor({
                createdAt: last.createdAt.toISOString(),
                evaluatedAt: evaluatedAt.toISOString(),
                filters,
                id: last.id
              })
            : null
      }
    };
  }

  async summary() {
    const now = new Date();
    const [total, active, general] = await this.prisma.$transaction([
      this.prisma.platformAnnouncement.count({ where: { channel: "banner" } }),
      this.prisma.platformAnnouncement.count({ where: { channel: "banner", ...activeAnnouncementWhere(now) } }),
      this.prisma.platformAnnouncement.count({ where: { channel: "banner", category: "general" } })
    ]);
    return { active, general, generatedAt: now.toISOString(), inactive: total - active, total };
  }

  async detail(id: string) {
    const item = await this.prisma.platformAnnouncement.findFirst({
      where: { id, channel: "banner" },
      include: {
        createdBy: { select: { fullName: true } },
        targets: { include: { tenant: { select: { id: true, name: true, status: true } } } }
      }
    });
    if (!item) throw new NotFoundException("El comunicado no existe.");
    const { createdBy, targets, ...announcement } = item;
    return {
      ...announcement,
      createdByName: createdBy.fullName,
      lifecycle: announcementLifecycle(item, new Date()),
      targetTenants: targets.map(({ tenant }) => tenant)
    };
  }

  async listTenantOptions(query: ListPlatformAnnouncementTenantOptionsQuery) {
    const search = query.search ?? null;
    const cursor = decodeAnnouncementCursor<TenantCursor>(query.cursor);
    if (cursor && cursor.search !== search)
      throw new BadRequestException("El cursor no corresponde a la búsqueda de estudios.");
    const base: Prisma.TenantWhereInput = {
      status: "active",
      ...(search ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } } : {})
    };
    const where: Prisma.TenantWhereInput = cursor
      ? {
          AND: [
            base,
            { OR: [{ name: { gt: cursor.name } }, { name: cursor.name, id: { gt: cursor.id } }] }
          ]
        }
      : base;
    const rows = await this.prisma.tenant.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: query.limit + 1,
      select: { id: true, name: true, status: true }
    });
    const hasNextPage = rows.length > query.limit;
    const items = hasNextPage ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);
    return {
      items,
      pageInfo: {
        hasNextPage,
        limit: query.limit,
        nextCursor:
          hasNextPage && last
            ? encodeAnnouncementCursor({ id: last.id, name: last.name, search })
            : null
      }
    };
  }

  async create(actorUserId: string, input: CreatePlatformAnnouncementInput) {
    const now = new Date();
    const targetIds = await this.validateTargets(input);
    const dates = creationDates(input, now);
    return this.prisma.$transaction(async (tx) => {
      const published = input.deliveryMode !== "draft";
      const announcement = await tx.platformAnnouncement.create({
        data: {
          ...announcementData(input),
          ...dates,
          createdById: actorUserId,
          status: published ? "published" : "draft",
          targets: targetIds.length
            ? { createMany: { data: targetIds.map((tenantId) => ({ tenantId })) } }
            : undefined
        }
      });
      await tx.platformAnnouncementEvent.createMany({
        data: [
          { action: "created", actorUserId, announcementId: announcement.id, revision: 1 },
          ...(published
            ? [
                {
                  action: input.deliveryMode === "schedule" ? "scheduled" : "published",
                  actorUserId,
                  announcementId: announcement.id,
                  revision: 1
                }
              ]
            : [])
        ]
      });
      return announcement;
    });
  }

  async update(id: string, actorUserId: string, input: UpdatePlatformAnnouncementInput) {
    const current = await this.find(id);
    if (current.status !== "draft")
      throw new BadRequestException("Solo se pueden editar comunicados en borrador.");
    const targetIds = await this.validateTargets(input, id);
    const revision = current.revision + 1;
    return this.prisma.$transaction(async (tx) => {
      const announcement = await tx.platformAnnouncement.update({
        where: { id },
        data: {
          ...announcementData(input),
          revision,
          targets: {
            deleteMany: {},
            ...(targetIds.length
              ? { createMany: { data: targetIds.map((tenantId) => ({ tenantId })) } }
              : {})
          }
        }
      });
      await tx.platformAnnouncementEvent.create({
        data: { action: "updated", actorUserId, announcementId: id, revision }
      });
      return announcement;
    });
  }

  async publish(id: string, actorUserId: string, scheduled: boolean) {
    const current = await this.find(id);
    if (current.status !== "draft")
      throw new BadRequestException("Solo se pueden publicar comunicados en borrador.");
    const now = new Date();
    if (!current.endsAt || current.endsAt <= now)
      throw new BadRequestException("Definí una finalización futura antes de publicar.");
    if (scheduled && (!current.startsAt || current.startsAt <= now))
      throw new BadRequestException("La fecha programada debe ser futura.");
    return this.prisma.$transaction(async (tx) => {
      const announcement = await tx.platformAnnouncement.update({
        where: { id },
        data: { startsAt: scheduled ? current.startsAt : now, status: "published" }
      });
      await tx.platformAnnouncementEvent.create({
        data: {
          action: scheduled ? "scheduled" : "published",
          actorUserId,
          announcementId: id,
          revision: announcement.revision
        }
      });
      return announcement;
    });
  }

  async cancel(id: string, actorUserId: string) {
    const current = await this.find(id);
    if (current.status === "cancelled")
      throw new BadRequestException("El comunicado ya está cancelado.");
    return this.prisma.$transaction(async (tx) => {
      const announcement = await tx.platformAnnouncement.update({
        where: { id },
        data: { status: "cancelled" }
      });
      await tx.platformAnnouncementEvent.create({
        data: {
          action: "cancelled",
          actorUserId,
          announcementId: id,
          revision: announcement.revision
        }
      });
      return announcement;
    });
  }

  private async find(id: string) {
    const item = await this.prisma.platformAnnouncement.findFirst({ where: { id, channel: "banner" } });
    if (!item) throw new NotFoundException("El comunicado no existe.");
    return item;
  }

  private async validateTargets(
    input: Pick<UpdatePlatformAnnouncementInput, "audience" | "targetTenantIds">,
    announcementId?: string
  ) {
    if (input.audience === "all_tenants") return [];
    const ids = [...new Set(input.targetTenantIds ?? [])];
    if (!ids.length) throw new BadRequestException("Seleccioná al menos un estudio.");
    const available = await this.prisma.tenant.count({
      where: {
        id: { in: ids },
        OR: [
          { status: "active" },
          ...(announcementId ? [{ announcementTargets: { some: { announcementId } } }] : [])
        ]
      }
    });
    if (available !== ids.length)
      throw new BadRequestException("Uno o más estudios seleccionados no están disponibles.");
    return ids;
  }
}
