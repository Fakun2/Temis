import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

export async function listPlatformNewsletters(
  prisma: PrismaService,
  cursor?: string,
  filter = "all"
) {
  if (!["all", "active", "inactive", "scheduled"].includes(filter))
    throw new BadRequestException("El filtro no es válido.");
  const now = new Date();
  const base: Prisma.PlatformAnnouncementWhereInput = { channel: "newsletter", deletedAt: null };
  const active: Prisma.PlatformAnnouncementWhereInput = {
    status: "published",
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gt: now } }]
  };
  const scheduled: Prisma.PlatformAnnouncementWhereInput = {
    status: "published",
    startsAt: { gt: now }
  };
  const inactive: Prisma.PlatformAnnouncementWhereInput = {
    OR: [
      { status: { not: "published" } },
      { status: "published", startsAt: null },
      { status: "published", endsAt: { lte: now }, startsAt: { lte: now } }
    ]
  };
  const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:\d{3})?Z$/;
  let seek = Prisma.empty;
  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
        createdAt: string;
        id: string;
        filter: string;
      };
      const date = new Date(decoded.createdAt);
      if (
        typeof decoded.createdAt !== "string" ||
        !timestampPattern.test(decoded.createdAt) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString() !== decoded.createdAt.slice(0, 23) + "Z" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded.id) ||
        decoded.filter !== filter
      )
        throw new Error();
      seek = Prisma.sql`AND (created_at, id) < (${decoded.createdAt}::timestamptz, ${decoded.id}::uuid)`;
    } catch {
      throw new BadRequestException("El cursor no es válido.");
    }
  }
  const status =
    filter === "active"
      ? Prisma.sql`AND status = 'published' AND starts_at <= ${now} AND (ends_at IS NULL OR ends_at > ${now})`
      : filter === "scheduled"
        ? Prisma.sql`AND status = 'published' AND starts_at > ${now}`
        : filter === "inactive"
          ? Prisma.sql`AND (status <> 'published' OR starts_at IS NULL OR (ends_at <= ${now} AND starts_at <= ${now}))`
          : Prisma.empty;
  const [rows, total, activeCount, inactiveCount, scheduledCount] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        excerpt: string | null;
        newsletterCategory: string | null;
        audience: string;
        status: string;
        startsAt: Date | null;
        endsAt: Date | null;
        revision: number;
        createdAt: Date;
        cursorCreatedAt: string;
      }>
    >(Prisma.sql`
      SELECT id, title, excerpt, newsletter_category AS "newsletterCategory", audience, status,
        starts_at AS "startsAt", ends_at AS "endsAt", revision, created_at AS "createdAt",
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursorCreatedAt"
      FROM platform_announcements
      WHERE channel = 'newsletter' AND deleted_at IS NULL ${status} ${seek}
      ORDER BY created_at DESC, id DESC LIMIT 21
    `),
    prisma.platformAnnouncement.count({ where: base }),
    prisma.platformAnnouncement.count({ where: { AND: [base, active] } }),
    prisma.platformAnnouncement.count({ where: { AND: [base, inactive] } }),
    prisma.platformAnnouncement.count({ where: { AND: [base, scheduled] } })
  ]);
  const page = rows.slice(0, 20);
  const last = page.at(-1);
  const items = page.map(({ cursorCreatedAt, ...item }) => {
    void cursorCreatedAt;
    return item;
  });
  return {
    items,
    metrics: { total, active: activeCount, inactive: inactiveCount, scheduled: scheduledCount },
    nextCursor:
      rows.length > 20 && last
        ? Buffer.from(
            JSON.stringify({ createdAt: last.cursorCreatedAt, id: last.id, filter })
          ).toString("base64url")
        : null
  };
}
