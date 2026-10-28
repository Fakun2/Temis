import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { listPlatformNewsletters } from "./platform-newsletters-list";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { ObjectStorageService } from "../storage/object-storage.service";
import { newsletterContentSchema, type NewsletterInput } from "./platform-newsletters.schemas";

import { validateNewsletterImage, type NewsletterUpload } from "./platform-newsletter-assets";
export { maxNewsletterImageBytes } from "./platform-newsletter-assets";
export const maxNewsletterContentBytes = 512 * 1024;
@Injectable()
export class PlatformNewslettersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService
  ) {}

  list(cursor?: string, filter = "all") {
    return listPlatformNewsletters(this.prisma, cursor, filter);
  }

  async detail(id: string) {
    const item = await this.prisma.platformAnnouncement.findFirst({
      where: { id, channel: "newsletter", deletedAt: null },
      include: { targets: { select: { tenantId: true } }, assets: { select: { id: true } } }
    });
    if (!item) throw new NotFoundException("La newsletter no existe.");
    return item;
  }

  async asset(id: string, poster = false) {
    const asset = await this.prisma.platformAnnouncementAsset.findFirst({
      where: { id, announcement: { channel: "newsletter", deletedAt: null } }
    });
    if (!asset) throw new NotFoundException("La imagen no existe.");
    const servePoster = poster && asset.mimeType === "image/gif";
    return {
      object: await this.storage.getObject(
        servePoster ? `${asset.storageKey}.poster.webp` : asset.storageKey
      ),
      mimeType: servePoster ? "image/webp" : asset.mimeType
    };
  }

  async create(actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.platformAnnouncement.create({
        data: {
          channel: "newsletter",
          title: "Newsletter sin título",
          body: "Borrador",
          excerpt: "",
          newsletterCategory: "general",
          content: {
            version: 2,
            theme: {
              width: "standard",
              fontFamily: "sans",
              backgroundColor: "#ffffff",
              textColor: "#071827",
              accentColor: "#073061"
            },
            blocks: []
          },
          createdById: actorUserId
        }
      });
      await tx.platformAnnouncementEvent.create({
        data: { announcementId: item.id, actorUserId, action: "created", revision: item.revision }
      });
      return item;
    });
  }

  async update(id: string, actorUserId: string, input: NewsletterInput) {
    const current = await this.detail(id);
    if (current.status !== "draft")
      throw new BadRequestException("Solo se pueden editar borradores.");
    if (Buffer.byteLength(JSON.stringify(input.content), "utf8") > maxNewsletterContentBytes)
      throw new BadRequestException("El contenido de la newsletter supera los 512 KB.");
    const ids = input.audience === "selected_tenants" ? [...new Set(input.targetTenantIds)] : [];
    if (
      ids.length &&
      (await this.prisma.tenant.count({
        where: {
          id: { in: ids },
          OR: [{ status: "active" }, { announcementTargets: { some: { announcementId: id } } }]
        }
      })) !== ids.length
    )
      throw new BadRequestException("Uno o más estudios no están disponibles.");
    const assetIds = [
      ...new Set(
        input.content.blocks.flatMap((block) =>
          block.type === "image" || block.type === "gif" ? [block.assetId] : []
        )
      )
    ];
    if (assetIds.length) {
      const assets = await this.prisma.platformAnnouncementAsset.findMany({
        where: { announcementId: id, id: { in: assetIds } },
        select: { id: true, mimeType: true }
      });
      const mimeById = new Map(assets.map((asset) => [asset.id, asset.mimeType]));
      if (
        assets.length !== assetIds.length ||
        input.content.blocks.some(
          (block) =>
            (block.type === "gif" && mimeById.get(block.assetId) !== "image/gif") ||
            (block.type === "image" && mimeById.get(block.assetId) === "image/gif")
        )
      )
        throw new BadRequestException(
          "Una imagen no pertenece al borrador o no coincide con su tipo."
        );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.platformAnnouncement.updateMany({
        where: {
          id,
          channel: "newsletter",
          deletedAt: null,
          status: "draft",
          revision: current.revision
        },
        data: {
          title: input.title,
          body: input.excerpt,
          excerpt: input.excerpt,
          newsletterCategory: input.newsletterCategory,
          audience: input.audience,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          content: input.content as Prisma.InputJsonValue,
          revision: { increment: 1 }
        }
      });
      if (!updated.count) throw new BadRequestException("El borrador cambió. Actualizá la página.");
      await tx.platformAnnouncementTarget.deleteMany({ where: { announcementId: id } });
      if (ids.length)
        await tx.platformAnnouncementTarget.createMany({
          data: ids.map((tenantId) => ({ announcementId: id, tenantId }))
        });
      await tx.platformAnnouncementEvent.create({
        data: { announcementId: id, actorUserId, action: "updated", revision: current.revision + 1 }
      });
      return tx.platformAnnouncement.findUniqueOrThrow({ where: { id } });
    });
  }

  async publish(id: string, actorUserId: string, scheduled: boolean) {
    const item = await this.detail(id);
    const now = new Date();
    const content = newsletterContentSchema.safeParse(item.content);
    if (item.status !== "draft" || !item.excerpt || !content.success || !content.data.blocks.length)
      throw new BadRequestException("Completá el borrador antes de publicarlo.");
    const start = scheduled ? item.startsAt : now;
    if (!start || (scheduled && start <= now) || (item.endsAt && item.endsAt <= start))
      throw new BadRequestException("Revisá las fechas de publicación.");
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.platformAnnouncement.updateMany({
        where: { id, deletedAt: null, status: "draft", revision: item.revision },
        data: { status: "published", startsAt: start }
      });
      if (!changed.count) throw new BadRequestException("El borrador cambió. Actualizá la página.");
      await tx.platformAnnouncementEvent.create({
        data: {
          announcementId: id,
          actorUserId,
          action: scheduled ? "scheduled" : "published",
          revision: item.revision
        }
      });
      return tx.platformAnnouncement.findUniqueOrThrow({ where: { id } });
    });
  }

  async cancel(id: string, actorUserId: string) {
    const item = await this.detail(id);
    if (item.status === "cancelled")
      throw new BadRequestException("La newsletter ya está cancelada.");
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.platformAnnouncement.updateMany({
        where: { id, deletedAt: null, status: item.status, revision: item.revision },
        data: { status: "cancelled" }
      });
      if (!changed.count)
        throw new BadRequestException("La newsletter cambió. Actualizá la página.");
      await tx.platformAnnouncementEvent.create({
        data: { announcementId: id, actorUserId, action: "cancelled", revision: item.revision }
      });
      return { status: "ok" };
    });
  }

  async remove(id: string, actorUserId: string) {
    const item = await this.detail(id);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.platformAnnouncement.updateMany({
        where: {
          id,
          channel: "newsletter",
          deletedAt: null,
          status: item.status,
          revision: item.revision
        },
        data: { deletedAt: new Date() }
      });
      if (!changed.count)
        throw new BadRequestException("La newsletter cambió. Actualizá la página.");
      await tx.platformAnnouncementEvent.create({
        data: { announcementId: id, actorUserId, action: "deleted", revision: item.revision }
      });
      return { status: "ok" };
    });
  }

  async upload(id: string, actorUserId: string, input?: NewsletterUpload) {
    const item = await this.detail(id);
    if (item.status !== "draft")
      throw new BadRequestException("Solo se pueden agregar imágenes a borradores.");
    const { file, poster } = await validateNewsletterImage(input);
    const assetId = randomUUID();
    const key = `platform/newsletters/${id}/${assetId}`;
    await this.storage.putObject({
      key,
      body: file.buffer,
      contentLength: file.size,
      contentType: file.mimetype
    });
    if (poster)
      try {
        await this.storage.putObject({
          key: `${key}.poster.webp`,
          body: poster,
          contentLength: poster.length,
          contentType: "image/webp"
        });
      } catch (error) {
        await this.storage.deleteObject(key);
        throw error;
      }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const draft = await tx.platformAnnouncement.findFirst({
          where: { id, status: "draft", channel: "newsletter", deletedAt: null }
        });
        if (!draft) throw new BadRequestException("El borrador ya no está disponible.");
        const asset = await tx.platformAnnouncementAsset.create({
          data: {
            id: assetId,
            announcementId: id,
            storageKey: key,
            mimeType: file.mimetype,
            size: file.size
          }
        });
        await tx.platformAnnouncementEvent.create({
          data: {
            announcementId: id,
            actorUserId,
            action: file.mimetype === "image/gif" ? "gif_uploaded" : "image_uploaded",
            revision: draft.revision
          }
        });
        return { id: asset.id };
      });
    } catch (error) {
      await this.storage.deleteObject(key);
      if (poster) await this.storage.deleteObject(`${key}.poster.webp`);
      throw error;
    }
  }
}
