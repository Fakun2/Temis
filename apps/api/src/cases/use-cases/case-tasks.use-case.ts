import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";
import type {
  CreateCaseTaskInput,
  ListCaseTasksQuery,
  UpdateCaseTaskInput
} from "../cases.schemas";

@Injectable()
export class CaseTasksUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async list(tenantId: string, caseId: string, query: ListCaseTasksQuery) {
    const cursor = decodeTasksCursor(query.cursor);
    await this.findTenantCaseOrThrow(tenantId, caseId);
    const tasks = await this.prisma.caseTask.findMany({
      where: {
        caseId,
        tenantId,
        ...(cursor ? { OR: getTaskCursorWhere(cursor) } : {})
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: query.limit + 1,
      select: caseTaskSelect
    });
    const pageItems = tasks.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = tasks.length > query.limit;

    const reminderConfigs = await this.notifications.getReminderConfigs(
      tenantId,
      "case_task",
      pageItems.map((task) => task.id)
    );

    return {
      items: pageItems.map((task) => toCaseTaskDto(task, reminderConfigs.get(task.id))),
      pageInfo: {
        limit: query.limit,
        offset: 0,
        nextCursor:
          hasNextPage && lastItem
            ? encodeTasksCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
            : null,
        hasNextPage,
        total: pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async create(tenantId: string, caseId: string, actorUserId: string, input: CreateCaseTaskInput) {
    await this.findTenantCaseOrThrow(tenantId, caseId);
    await this.assertAssignableMembership(tenantId, input.assignedMembershipId);
    const createdTask = await this.prisma.caseTask.create({
      data: {
        ...toCaseTaskWriteData(input),
        caseId,
        tenantId
      },
      select: caseTaskSelect
    });
    await this.syncReminder(tenantId, caseId, actorUserId, createdTask, input);

    const reminderConfig = await this.getReminderConfig(tenantId, createdTask.id);
    return toCaseTaskDto(createdTask, reminderConfig);
  }

  async update(
    tenantId: string,
    caseId: string,
    taskId: string,
    actorUserId: string,
    input: UpdateCaseTaskInput
  ) {
    await this.findTenantTaskOrThrow(tenantId, caseId, taskId);
    await this.assertAssignableMembership(tenantId, input.assignedMembershipId);
    const updatedTask = await this.prisma.caseTask.update({
      where: { id: taskId },
      data: toCaseTaskWriteData(input, { includeMissingAssignment: false }),
      select: caseTaskSelect
    });
    await this.syncReminder(tenantId, caseId, actorUserId, updatedTask, input);

    const reminderConfig = await this.getReminderConfig(tenantId, updatedTask.id);
    return toCaseTaskDto(updatedTask, reminderConfig);
  }

  async markSeen(tenantId: string, caseId: string, taskId: string) {
    await this.findTenantTaskOrThrow(tenantId, caseId, taskId);
    const updatedTask = await this.prisma.caseTask.update({
      where: { id: taskId },
      data: { lastSeenAt: new Date() },
      select: caseTaskSelect
    });

    const reminderConfig = await this.getReminderConfig(tenantId, updatedTask.id);
    return toCaseTaskDto(updatedTask, reminderConfig);
  }

  async delete(tenantId: string, caseId: string, taskId: string) {
    await this.findTenantTaskOrThrow(tenantId, caseId, taskId);
    await this.notifications.cancelForResource(tenantId, "case_task", taskId);
    await this.prisma.caseTask.delete({ where: { id: taskId } });

    return { status: "ok" as const };
  }

  private async findTenantCaseOrThrow(tenantId: string, caseId: string) {
    const existingCase = await this.prisma.case.findFirst({
      where: { id: caseId, tenantId },
      select: { id: true }
    });

    if (!existingCase) {
      throw new NotFoundException("El expediente no existe en el estudio activo.");
    }

    return existingCase;
  }

  private async findTenantTaskOrThrow(tenantId: string, caseId: string, taskId: string) {
    const task = await this.prisma.caseTask.findFirst({
      where: { caseId, id: taskId, tenantId },
      select: { id: true }
    });

    if (!task) {
      throw new NotFoundException("La tarea no existe en el expediente activo.");
    }

    return task;
  }

  private async assertAssignableMembership(tenantId: string, assignedMembershipId?: string | null) {
    if (!assignedMembershipId) {
      return;
    }

    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: assignedMembershipId, status: "active", tenantId },
      select: { id: true }
    });

    if (!membership) {
      throw new BadRequestException("El asignado no pertenece al staff activo del workspace.");
    }
  }

  private async syncReminder(
    tenantId: string,
    caseId: string,
    actorUserId: string,
    task: CaseTaskWithSelect,
    input: CreateCaseTaskInput | UpdateCaseTaskInput
  ) {
    if (task.status === "completed" || task.status === "cancelled") {
      await this.notifications.cancelForResource(tenantId, "case_task", task.id);
      return;
    }

    await this.notifications.scheduleForResource({
      actorUserId,
      body: task.notes,
      caseId,
      resourceId: task.id,
      resourceType: "case_task",
      settings: input,
      tenantId,
      title: `Tarea: ${task.name}`
    });
  }

  private async getReminderConfig(tenantId: string, taskId: string) {
    const configs = await this.notifications.getReminderConfigs(tenantId, "case_task", [taskId]);
    return configs.get(taskId);
  }
}

const caseTaskSelect = {
  assignedMembershipId: true,
  assignedTo: {
    select: {
      id: true,
      role: {
        select: {
          name: true
        }
      },
      user: {
        select: {
          email: true,
          fullName: true
        }
      },
      userId: true
    }
  },
  caseId: true,
  createdAt: true,
  endDate: true,
  id: true,
  lastSeenAt: true,
  name: true,
  notes: true,
  startDate: true,
  status: true,
  updatedAt: true
} satisfies Prisma.CaseTaskSelect;

type CaseTaskWithSelect = Prisma.CaseTaskGetPayload<{ select: typeof caseTaskSelect }>;

function toCaseTaskWriteData(
  input: CreateCaseTaskInput | UpdateCaseTaskInput,
  options: { includeMissingAssignment?: boolean } = {}
) {
  const data = {
    endDate: input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null,
    name: input.name,
    notes: input.notes ?? null,
    startDate: input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : null,
    status: input.status
  };

  if (
    options.includeMissingAssignment !== false ||
    Object.prototype.hasOwnProperty.call(input, "assignedMembershipId")
  ) {
    return {
      ...data,
      assignedMembershipId: input.assignedMembershipId ?? null
    };
  }

  return data;
}

function toCaseTaskDto(item: CaseTaskWithSelect, reminderConfig?: ReminderConfig) {
  return {
    id: item.id,
    caseId: item.caseId,
    assignedMembershipId: item.assignedMembershipId,
    assignedTo: item.assignedTo
      ? {
          id: item.assignedTo.id,
          userId: item.assignedTo.userId,
          fullName: item.assignedTo.user.fullName,
          email: item.assignedTo.user.email,
          roleName: item.assignedTo.role?.name ?? null
        }
      : null,
    name: item.name,
    startDate: item.startDate ? item.startDate.toISOString().slice(0, 10) : null,
    endDate: item.endDate ? item.endDate.toISOString().slice(0, 10) : null,
    status: item.status,
    notes: item.notes,
    ...toNotificationSettingsDto(reminderConfig),
    lastSeenAt: item.lastSeenAt ? item.lastSeenAt.toISOString() : null,
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

type TasksCursor = {
  createdAt: Date;
  id: string;
};

function encodeTasksCursor(cursor: TasksCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id
    })
  ).toString("base64url");
}

function decodeTasksCursor(cursor?: string): TasksCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt?: string;
      id?: string;
    };

    if (!parsed.createdAt || !parsed.id) {
      return null;
    }

    return {
      createdAt: new Date(parsed.createdAt),
      id: parsed.id
    };
  } catch {
    return null;
  }
}

function getTaskCursorWhere(cursor: TasksCursor): Prisma.CaseTaskWhereInput[] {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { gt: cursor.id } }
  ];
}
