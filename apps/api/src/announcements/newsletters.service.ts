import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { ObjectStorageService } from "../storage/object-storage.service";

@Injectable()
export class NewslettersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService
  ) {}

  private visible(tenantId: string): Prisma.PlatformAnnouncementWhereInput {
    const now = new Date();
    return {
      channel: "newsletter",
      deletedAt: null,
      status: "published",
      startsAt: { lte: now },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        {
          OR: [
            { audience: "all_tenants" },
            { audience: "selected_tenants", targets: { some: { tenantId } } }
          ]
        }
      ]
    };
  }

  async summary(tenantId: string, userId: string) {
    const rows = await this.prisma.platformAnnouncement.findMany({
      where: this.visible(tenantId),
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: { id: true, revision: true, reads: { where: { userId }, select: { revision: true } } }
    });
    const unread = rows.filter((row) => !row.reads.some((read) => read.revision === row.revision));
    return {
      unreadCount: unread.length,
      oldestUnreadId: unread[0]?.id ?? null,
      latestId: rows.at(-1)?.id ?? null
    };
  }

  async list(tenantId: string, userId: string, cursor?: string) {
    if (cursor) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor) ||
        !(await this.prisma.platformAnnouncement.findFirst({
          where: { AND: [this.visible(tenantId), { id: cursor }] },
          select: { id: true }
        }))
      )
        throw new BadRequestException("El cursor no es válido.");
    }
    const rows = await this.prisma.platformAnnouncement.findMany({
      where: this.visible(tenantId),
      orderBy: [{ startsAt: "desc" }, { id: "desc" }],
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        excerpt: true,
        newsletterCategory: true,
        startsAt: true,
        revision: true,
        reads: { where: { userId }, select: { revision: true } }
      }
    });
    const hasMore = rows.length > 20;
    const page = rows.slice(0, 20);
    return {
      items: page.map(({ reads, ...row }) => ({
        ...row,
        isRead: reads.some((read) => read.revision === row.revision)
      })),
      nextCursor: hasMore ? page.at(-1)?.id : null
    };
  }

  async detail(tenantId: string, id: string) {
    const item = await this.prisma.platformAnnouncement.findFirst({
      where: { AND: [this.visible(tenantId), { id }] },
      select: {
        id: true,
        title: true,
        excerpt: true,
        newsletterCategory: true,
        content: true,
        startsAt: true,
        revision: true
      }
    });
    if (!item) throw new NotFoundException("La newsletter no está disponible.");
    return item;
  }

  async read(tenantId: string, userId: string, id: string) {
    const item = await this.detail(tenantId, id);
    await this.prisma.platformAnnouncementRead.upsert({
      where: {
        announcementId_userId_revision: { announcementId: id, userId, revision: item.revision }
      },
      create: { announcementId: id, userId, revision: item.revision },
      update: {}
    });
    return { status: "ok" };
  }

  async asset(tenantId: string, assetId: string, poster = false) {
    const asset = await this.prisma.platformAnnouncementAsset.findUnique({
      where: { id: assetId }
    });
    if (!asset) throw new NotFoundException("La imagen no está disponible.");
    const item = await this.detail(tenantId, asset.announcementId);
    const content = item.content as { blocks?: Array<{ type?: string; assetId?: string }> } | null;
    if (
      !content?.blocks?.some(
        (block) => (block.type === "image" || block.type === "gif") && block.assetId === assetId
      )
    )
      throw new NotFoundException("La imagen no está disponible.");
    const servePoster = poster && asset.mimeType === "image/gif";
    return {
      object: await this.storage.getObject(
        servePoster ? `${asset.storageKey}.poster.webp` : asset.storageKey
      ),
      mimeType: servePoster ? "image/webp" : asset.mimeType
    };
  }
}
