import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService, type TenantPrismaClient } from "../../database/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { GoogleCalendarService } from "../../integrations/google-calendar.service";
import type {
  CreateCaseHearingInput,
  ListCaseHearingsQuery,
  UpdateCaseHearingInput
} from "../cases.schemas";

@Injectable()
export class CaseHearingsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly googleCalendar: GoogleCalendarService
  ) {}

  async list(tenantId: string, caseId: string, query: ListCaseHearingsQuery) {
    return this.prisma.runWithTenant(tenantId, (tx) =>
      this.listWithClient(tx, tenantId, caseId, query)
    );
  }

  private async listWithClient(
    prisma: TenantPrismaClient,
    tenantId: string,
    caseId: string,
    query: ListCaseHearingsQuery
  ) {
    const cursor = decodeHearingsCursor(query.cursor);
    await this.findTenantCaseOrThrow(prisma, tenantId, caseId);
    const hearings = await prisma.caseHearing.findMany({
      where: {
        caseId,
        tenantId,
        ...(cursor ? { OR: getHearingCursorWhere(cursor) } : {})
      },
      orderBy: [{ date: "asc" }, { time: "asc" }, { id: "asc" }],
      take: query.limit + 1,
      select: caseHearingSelect
    });
    const pageItems = hearings.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = hearings.length > query.limit;

    const reminderConfigs = await this.notifications.getReminderConfigs(
      tenantId,
      "case_hearing",
      pageItems.map((hearing) => hearing.id),
      prisma
    );

    return {
      items: pageItems.map((hearing) => toCaseHearingDto(hearing, reminderConfigs.get(hearing.id))),
      pageInfo: {
        limit: query.limit,
        offset: 0,
        nextCursor:
          hasNextPage && lastItem
            ? encodeHearingsCursor({ date: lastItem.date, id: lastItem.id, time: lastItem.time })
            : null,
        hasNextPage,
        total: pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async create(
    tenantId: string,
    caseId: string,
    actorUserId: string,
    input: CreateCaseHearingInput
  ) {
    return this.prisma.runWithTenant(tenantId, (tx) =>
      this.createWithClient(tx, tenantId, caseId, actorUserId, input)
    );
  }

  private async createWithClient(
    prisma: TenantPrismaClient,
    tenantId: string,
    caseId: string,
    actorUserId: string,
    input: CreateCaseHearingInput
  ) {
    await this.findTenantCaseOrThrow(prisma, tenantId, caseId);
    const createdHearing = await prisma.caseHearing.create({
      data: {
        ...toCaseHearingWriteData(input),
        caseId,
        tenantId
      },
      select: caseHearingSelect
    });
    await syncHearingParticipants(prisma, tenantId, createdHearing.id, input.participantMembershipIds);
    await this.syncReminder(prisma, tenantId, caseId, actorUserId, createdHearing, input);
    await this.googleCalendar.enqueueResource(prisma, tenantId, "case_hearing", createdHearing.id, "upsert");

    const reminderConfig = await this.getReminderConfig(prisma, tenantId, createdHearing.id);
    return toCaseHearingDto(createdHearing, reminderConfig);
  }

  async update(
    tenantId: string,
    caseId: string,
    hearingId: string,
    actorUserId: string,
    input: UpdateCaseHearingInput
  ) {
    return this.prisma.runWithTenant(tenantId, (tx) =>
      this.updateWithClient(tx, tenantId, caseId, hearingId, actorUserId, input)
    );
  }

  private async updateWithClient(
    prisma: TenantPrismaClient,
    tenantId: string,
    caseId: string,
    hearingId: string,
    actorUserId: string,
    input: UpdateCaseHearingInput
  ) {
    await this.findTenantHearingOrThrow(prisma, tenantId, caseId, hearingId);
    const updatedHearing = await prisma.caseHearing.update({
      where: { id: hearingId },
      data: toCaseHearingWriteData(input),
      select: caseHearingSelect
    });
    await syncHearingParticipants(prisma, tenantId, updatedHearing.id, input.participantMembershipIds);
    await this.syncReminder(prisma, tenantId, caseId, actorUserId, updatedHearing, input);
    await this.googleCalendar.enqueueResource(prisma, tenantId, "case_hearing", updatedHearing.id, "upsert");

    const reminderConfig = await this.getReminderConfig(prisma, tenantId, updatedHearing.id);
    return toCaseHearingDto(updatedHearing, reminderConfig);
  }

  async delete(tenantId: string, caseId: string, hearingId: string) {
    return this.prisma.runWithTenant(tenantId, (tx) =>
      this.deleteWithClient(tx, tenantId, caseId, hearingId)
    );
  }

  private async deleteWithClient(
    prisma: TenantPrismaClient,
    tenantId: string,
    caseId: string,
    hearingId: string
  ) {
    await this.findTenantHearingOrThrow(prisma, tenantId, caseId, hearingId);
    await this.notifications.cancelForResource(tenantId, "case_hearing", hearingId, prisma);
    await this.googleCalendar.enqueueResource(prisma, tenantId, "case_hearing", hearingId, "delete");
    await prisma.caseHearing.delete({ where: { id: hearingId } });

    return { status: "ok" as const };
  }

  async calendar(tenantId: string, caseId: string, options: CaseHearingsCalendarOptions) {
    return this.prisma.runWithTenant(tenantId, (tx) =>
      this.calendarWithClient(tx, tenantId, caseId, options)
    );
  }

  private async calendarWithClient(
    prisma: TenantPrismaClient,
    tenantId: string,
    caseId: string,
    options: CaseHearingsCalendarOptions
  ) {
    await this.findTenantCaseOrThrow(prisma, tenantId, caseId);
    const hearings = await prisma.caseHearing.findMany({
      orderBy: [{ date: "asc" }, { time: "asc" }, { id: "asc" }],
      select: {
        date: true,
        description: true,
        id: true,
        time: true,
        type: true
      },
      where: {
        caseId,
        tenantId,
        date: {
          gte: options.startDate,
          lt: options.endDate
        },
        ...(options.search
          ? { description: { contains: options.search, mode: Prisma.QueryMode.insensitive } }
          : {})
      }
    });

    return hearings.map(toHearingCalendarEvent);
  }

  private async findTenantCaseOrThrow(
    prisma: TenantPrismaClient,
    tenantId: string,
    caseId: string
  ) {
    const existingCase = await prisma.case.findFirst({
      where: { id: caseId, tenantId },
      select: { id: true }
    });

    if (!existingCase) {
      throw new NotFoundException("El expediente no existe en el estudio activo.");
    }

    return existingCase;
  }

  private async findTenantHearingOrThrow(
    prisma: TenantPrismaClient,
    tenantId: string,
    caseId: string,
    hearingId: string
  ) {
    const hearing = await prisma.caseHearing.findFirst({
      where: { caseId, id: hearingId, tenantId },
      select: { id: true }
    });

    if (!hearing) {
      throw new NotFoundException("La audiencia no existe en el expediente activo.");
    }

    return hearing;
  }

  private async syncReminder(
    prisma: TenantPrismaClient,
    tenantId: string,
    caseId: string,
    actorUserId: string,
    hearing: CaseHearingWithSelect,
    input: CreateCaseHearingInput | UpdateCaseHearingInput
  ) {
    await this.notifications.scheduleForResource(
      {
        actorUserId,
        body: hearing.description,
        caseId,
        resourceId: hearing.id,
        resourceType: "case_hearing",
        settings: input,
        tenantId,
        title: `Audiencia: ${hearing.description}`
      },
      prisma
    );
  }

  private async getReminderConfig(
    prisma: TenantPrismaClient,
    tenantId: string,
    hearingId: string
  ) {
    const configs = await this.notifications.getReminderConfigs(
      tenantId,
      "case_hearing",
      [hearingId],
      prisma
    );
    return configs.get(hearingId);
  }
}

const caseHearingSelect = {
  caseId: true,
  createdAt: true,
  date: true,
  description: true,
  id: true,
  notificationsEnabled: true,
  participants: { select: { tenantMembershipId: true } },
  time: true,
  type: true,
  updatedAt: true
} satisfies Prisma.CaseHearingSelect;

type CaseHearingWithSelect = Prisma.CaseHearingGetPayload<{ select: typeof caseHearingSelect }>;

type HearingCursor = {
  date: Date;
  id: string;
  time: string;
};

type CaseHearingsCalendarOptions = {
  endDate: Date;
  search?: string;
  startDate: Date;
};

export type CaseHearingCalendarEvent = ReturnType<typeof toHearingCalendarEvent>;

function toCaseHearingWriteData(input: CreateCaseHearingInput | UpdateCaseHearingInput) {
  return {
    date: new Date(`${input.date}T00:00:00.000Z`),
    description: input.description,
    notificationsEnabled: input.notificationEnabled || input.notificationsEnabled === true,
    time: input.time,
    type: input.type
  };
}

async function syncHearingParticipants(
  prisma: TenantPrismaClient,
  tenantId: string,
  hearingId: string,
  membershipIds: string[]
) {
  const uniqueIds = [...new Set(membershipIds)];
  if (uniqueIds.length > 0) {
    const count = await prisma.tenantMembership.count({
      where: { tenantId, id: { in: uniqueIds }, status: "active" }
    });
    if (count !== uniqueIds.length) throw new NotFoundException("Uno o mas participantes no pertenecen al estudio.");
  }
  await prisma.caseHearingParticipant.deleteMany({ where: { tenantId, hearingId } });
  if (uniqueIds.length > 0) {
    await prisma.caseHearingParticipant.createMany({
      data: uniqueIds.map((tenantMembershipId) => ({ tenantId, hearingId, tenantMembershipId }))
    });
  }
}

function toCaseHearingDto(item: CaseHearingWithSelect, reminderConfig?: ReminderConfig) {
  return {
    id: item.id,
    caseId: item.caseId,
    type: item.type,
    date: item.date.toISOString().slice(0, 10),
    time: item.time,
    description: item.description,
    notificationsEnabled: item.notificationsEnabled,
    participantMembershipIds: item.participants.map((participant) => participant.tenantMembershipId),
    ...toNotificationSettingsDto(reminderConfig),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

type ReminderConfig =
  Awaited<ReturnType<NotificationsService["getReminderConfigs"]>> extends Map<string, infer T>
    ? T
    : never;

function toNotificationSettingsDto(config?: ReminderConfig) {
  return {
    notificationEnabled: config?.notificationEnabled ?? false,
    notificationDate: config?.notificationDate ?? null,
    notificationTime: config?.notificationTime ?? null,
    notificationRecipientMode: config?.notificationRecipientMode ?? "self",
    notificationPracticeAreaId: config?.notificationPracticeAreaId ?? null,
    notificationMembershipIds: config?.notificationMembershipIds ?? []
  };
}

function toHearingCalendarEvent(hearing: {
  date: Date;
  description: string;
  id: string;
  time: string;
  type: CaseHearingWithSelect["type"];
}) {
  return {
    type: "hearing" as const,
    id: hearing.id,
    title: `Audiencia: ${hearing.description}`,
    date: hearing.date.toISOString().slice(0, 10),
    hearingType: hearing.type,
    time: hearing.time
  };
}

function encodeHearingsCursor(cursor: HearingCursor) {
  return Buffer.from(
    JSON.stringify({
      date: cursor.date.toISOString(),
      id: cursor.id,
      time: cursor.time
    })
  ).toString("base64url");
}

function decodeHearingsCursor(cursor?: string): HearingCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      date?: string;
      id?: string;
      time?: string;
    };

    if (!parsed.date || !parsed.id || !parsed.time) {
      return null;
    }

    return {
      date: new Date(parsed.date),
      id: parsed.id,
      time: parsed.time
    };
  } catch {
    return null;
  }
}

function getHearingCursorWhere(cursor: HearingCursor): Prisma.CaseHearingWhereInput[] {
  return [
    { date: { gt: cursor.date } },
    { date: cursor.date, time: { gt: cursor.time } },
    { date: cursor.date, time: cursor.time, id: { gt: cursor.id } }
  ];
}
