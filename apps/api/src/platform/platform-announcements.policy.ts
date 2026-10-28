import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  CreatePlatformAnnouncementInput,
  ListPlatformAnnouncementsQuery,
  UpdatePlatformAnnouncementInput
} from "./platform-announcements.schemas";

export type AnnouncementFilters = {
  activity: ListPlatformAnnouncementsQuery["activity"] | null;
  audience: ListPlatformAnnouncementsQuery["audience"] | null;
  category: ListPlatformAnnouncementsQuery["category"] | null;
  search: string | null;
  severity: ListPlatformAnnouncementsQuery["severity"] | null;
  status: ListPlatformAnnouncementsQuery["status"] | null;
};

export type AnnouncementCursor = {
  createdAt: string;
  evaluatedAt: string;
  filters: AnnouncementFilters;
  id: string;
};

export type TenantCursor = { id: string; name: string; search: string | null };

export function announcementFilters(query: ListPlatformAnnouncementsQuery): AnnouncementFilters {
  return {
    activity: query.activity ?? null,
    audience: query.audience ?? null,
    category: query.category ?? null,
    search: query.search ?? null,
    severity: query.severity ?? null,
    status: query.status ?? null
  };
}

export function announcementWhere(
  filters: AnnouncementFilters,
  evaluatedAt: Date,
  cursor: AnnouncementCursor | null
): Prisma.PlatformAnnouncementWhereInput {
  const active = activeAnnouncementWhere(evaluatedAt);
  const base: Prisma.PlatformAnnouncementWhereInput = {
    channel: "banner",
    ...(filters.activity === "active" ? active : {}),
    ...(filters.activity === "inactive" ? { NOT: active } : {}),
    ...(filters.audience ? { audience: filters.audience } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
            { body: { contains: filters.search, mode: Prisma.QueryMode.insensitive } }
          ]
        }
      : {})
  };
  if (!cursor) return base;
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    throw new BadRequestException("El cursor de comunicados no es válido.");
  }
  return {
    AND: [base, { OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: cursor.id } }] }]
  };
}

export function activeAnnouncementWhere(now: Date): Prisma.PlatformAnnouncementWhereInput {
  return { endsAt: { gt: now }, startsAt: { lte: now }, status: "published" };
}

export function announcementLifecycle(
  item: { endsAt: Date | null; startsAt: Date | null; status: string },
  now: Date
) {
  if (item.status === "cancelled") return "cancelled" as const;
  if (item.status === "draft") return "draft" as const;
  if (item.startsAt && item.startsAt > now) return "scheduled" as const;
  if (!item.startsAt || !item.endsAt || item.endsAt <= now) return "expired" as const;
  return "active" as const;
}

export function creationDates(input: CreatePlatformAnnouncementInput, now: Date) {
  if (input.deliveryMode === "publish_now") {
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (!endsAt || endsAt <= now) {
      throw new BadRequestException("Definí una finalización futura para emitir el comunicado.");
    }
    return { endsAt, startsAt: now };
  }
  if (input.deliveryMode === "schedule") {
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (!startsAt || startsAt <= now || !endsAt || endsAt <= startsAt) {
      throw new BadRequestException(
        "La programación requiere un inicio futuro y un final posterior."
      );
    }
    return { endsAt, startsAt };
  }
  return {
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    startsAt: input.startsAt ? new Date(input.startsAt) : null
  };
}

export function announcementData(input: UpdatePlatformAnnouncementInput) {
  return {
    audience: input.audience,
    body: input.body,
    category: input.category,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    linkLabel: input.linkLabel ?? null,
    linkUrl: input.linkUrl ?? null,
    severity: input.severity,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    title: input.title
  };
}

export function encodeAnnouncementCursor(value: object) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeAnnouncementCursor<T>(value?: string): T | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    throw new BadRequestException("El cursor no es válido.");
  }
}
