import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { GoogleCalendarService } from "../../integrations/google-calendar.service";
import type {
  CreateTaskBoardViewInput,
  CreateCaseTaskInput,
  ListCaseTasksQuery,
  ListTenantCaseTasksQuery,
  TaskBoardFiltersInput,
  UpdateCaseTaskLocalContextInput,
  UpdateTaskBoardViewInput,
  UpdateCaseTaskInput
} from "../cases.schemas";
import { taskBoardFiltersSchema, taskBoardSettingsSchema } from "../cases.schemas";

@Injectable()
export class CaseTasksUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly googleCalendar: GoogleCalendarService
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

  async listTenant(tenantId: string, query: ListTenantCaseTasksQuery) {
    const cursor = decodeTenantTasksCursor(query.cursor);
    if (cursor?.sortBy !== undefined && cursor.sortBy !== query.sortBy) {
      throw new BadRequestException("El cursor no corresponde al orden seleccionado.");
    }
    if (cursor?.sortDirection !== undefined && cursor.sortDirection !== query.sortDirection) {
      throw new BadRequestException("El cursor no corresponde a la direccion de orden seleccionada.");
    }

    const where = getTenantTasksWhere(tenantId, query);
    const tasks = await this.prisma.caseTask.findMany({
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      where,
      orderBy: getTenantTasksOrderBy(query),
      take: query.limit + 1,
      select: globalCaseTaskSelect
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
      items: pageItems.map((task) => toGlobalCaseTaskDto(task, reminderConfigs.get(task.id))),
      pageInfo: {
        limit: query.limit,
        offset: query.offset,
        nextCursor:
          hasNextPage && lastItem
            ? encodeTenantTasksCursor({
                id: lastItem.id,
                sortBy: query.sortBy,
                sortDirection: query.sortDirection
              })
            : null,
        hasNextPage,
        total: query.offset + pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async getTenantMetrics(tenantId: string) {
    const { dueSoonEndDate, today } = getTaskMetricsDates();
    const actionableStatuses = ["pending", "in_progress"] as const;
    const [todo, done, dueSoon, overdue] = await Promise.all([
      this.prisma.caseTask.count({
        where: { status: { in: [...actionableStatuses] }, tenantId }
      }),
      this.prisma.caseTask.count({
        where: { status: "completed", tenantId }
      }),
      this.prisma.caseTask.count({
        where: {
          endDate: { gte: today, lte: dueSoonEndDate },
          status: { in: [...actionableStatuses] },
          tenantId
        }
      }),
      this.prisma.caseTask.count({
        where: {
          endDate: { lt: today },
          status: { in: [...actionableStatuses] },
          tenantId
        }
      })
    ]);

    return { done, dueSoon, overdue, todo };
  }

  async listBoards(tenantId: string) {
    const boards = await this.prisma.taskBoardView.findMany({
      where: { tenantId },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }]
    });

    return { items: boards.map(toTaskBoardViewDto) };
  }

  async createBoard(tenantId: string, actorUserId: string, input: CreateTaskBoardViewInput) {
    const createdByMembershipId = await this.findActorMembershipIdOrThrow(tenantId, actorUserId);
    await this.assertBoardFilters(tenantId, input.filters);
    const board = await this.prisma.taskBoardView.create({
      data: {
        createdByMembershipId,
        filters: toInputJson(input.filters),
        name: input.name,
        settings: toInputJson(taskBoardSettingsSchema.parse(input.settings ?? {})),
        tenantId
      } as Prisma.TaskBoardViewUncheckedCreateInput & { settings: Prisma.InputJsonValue }
    });

    return toTaskBoardViewDto(board);
  }

  async updateBoard(tenantId: string, boardId: string, input: UpdateTaskBoardViewInput) {
    await this.findTenantBoardOrThrow(tenantId, boardId);
    if (input.filters) {
      await this.assertBoardFilters(tenantId, input.filters);
    }

    const board = await this.prisma.taskBoardView.update({
      where: { id: boardId },
      data: {
        ...(input.filters ? { filters: toInputJson(input.filters) } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.settings
          ? { settings: toInputJson(taskBoardSettingsSchema.parse(input.settings)) }
          : {})
      } as Prisma.TaskBoardViewUncheckedUpdateInput & { settings?: Prisma.InputJsonValue }
    });

    return toTaskBoardViewDto(board);
  }

  async deleteBoard(tenantId: string, boardId: string) {
    await this.findTenantBoardOrThrow(tenantId, boardId);
    await this.prisma.taskBoardView.delete({ where: { id: boardId } });

    return { status: "ok" as const };
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
    await this.enqueueCalendarResource(tenantId, "case_task", createdTask.id, "upsert");

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
    await this.markNotionLinkPendingPush(tenantId, taskId);
    await this.syncReminder(tenantId, caseId, actorUserId, updatedTask, input);
    await this.enqueueCalendarResource(tenantId, "case_task", updatedTask.id, "upsert");

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

  async updateTenantTask(
    tenantId: string,
    taskId: string,
    input: UpdateCaseTaskInput
  ) {
    await this.findTenantTaskByIdOrThrow(tenantId, taskId);
    await this.assertAssignableMembership(tenantId, input.assignedMembershipId);
    const updatedTask = await this.prisma.caseTask.update({
      where: { id: taskId },
      data: toCaseTaskWriteData(input, { includeMissingAssignment: false }),
      select: globalCaseTaskSelect
    });
    await this.markNotionLinkPendingPush(tenantId, taskId);
    await this.enqueueCalendarResource(tenantId, "case_task", updatedTask.id, "upsert");

    const reminderConfig = await this.getReminderConfig(tenantId, updatedTask.id);
    return toGlobalCaseTaskDto(updatedTask, reminderConfig);
  }

  async updateTenantTaskLocalContext(
    tenantId: string,
    taskId: string,
    input: UpdateCaseTaskLocalContextInput
  ) {
    await this.findTenantTaskByIdOrThrow(tenantId, taskId);

    if (input.caseId) {
      await this.findTenantCaseOrThrow(tenantId, input.caseId);
    }

    const updatedTask = await this.prisma.caseTask.update({
      where: { id: taskId },
      data: { caseId: input.caseId ?? null },
      select: globalCaseTaskSelect
    });

    await this.syncNotionLocalContext(tenantId, taskId, updatedTask.updatedAt);

    const reminderConfig = await this.getReminderConfig(tenantId, updatedTask.id);
    return toGlobalCaseTaskDto(updatedTask, reminderConfig);
  }

  async delete(tenantId: string, caseId: string, taskId: string) {
    await this.findTenantTaskOrThrow(tenantId, caseId, taskId);
    await this.notifications.cancelForResource(tenantId, "case_task", taskId);
    await this.prisma.caseTask.delete({ where: { id: taskId } });
    await this.enqueueCalendarResource(tenantId, "case_task", taskId, "delete");

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

  private async findTenantTaskByIdOrThrow(tenantId: string, taskId: string) {
    const task = await this.prisma.caseTask.findFirst({
      where: { id: taskId, tenantId },
      select: { id: true }
    });

    if (!task) {
      throw new NotFoundException("La tarea no existe en el estudio activo.");
    }

    return task;
  }

  private async markNotionLinkPendingPush(tenantId: string, taskId: string) {
    await this.prisma.notionTaskLink.updateMany({
      where: { syncState: { not: "conflict" }, taskId, tenantId },
      data: { syncState: "pending_push" }
    });
  }

  private async syncNotionLocalContext(tenantId: string, taskId: string, updatedAt: Date) {
    const links = await this.prisma.notionTaskLink.findMany({
      where: { taskId, tenantId },
      include: { mapping: { select: { propertyMapping: true } } }
    });

    for (const link of links) {
      const propertyMapping = link.mapping.propertyMapping as Record<string, unknown>;
      const hasCaseMapping =
        typeof propertyMapping.case === "string" && propertyMapping.case.trim().length > 0;

      await this.prisma.notionTaskLink.update({
        where: { id: link.id },
        data: hasCaseMapping
          ? { syncState: link.syncState === "conflict" ? "conflict" : "pending_push" }
          : { lastBogAppUpdatedAt: updatedAt }
      });
    }
  }

  private async findTenantBoardOrThrow(tenantId: string, boardId: string) {
    const board = await this.prisma.taskBoardView.findFirst({
      where: { id: boardId, tenantId },
      select: { id: true }
    });

    if (!board) {
      throw new NotFoundException("El tablero no existe en el estudio activo.");
    }

    return board;
  }

  private async findActorMembershipIdOrThrow(tenantId: string, actorUserId: string) {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { status: "active", tenantId, userId: actorUserId },
      select: { id: true }
    });

    if (!membership) {
      throw new BadRequestException("No se pudo identificar tu membresia activa en el workspace.");
    }

    return membership.id;
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

  private async assertBoardFilters(tenantId: string, filters: TaskBoardFiltersInput) {
    if (filters.endDateFrom && filters.endDateTo && filters.endDateFrom > filters.endDateTo) {
      throw new BadRequestException("El rango de vencimiento del tablero es invalido.");
    }

    const [caseItem, client, assignedMembership] = await Promise.all([
      filters.caseId
        ? this.prisma.case.findFirst({
            where: { id: filters.caseId, tenantId },
            select: { id: true }
          })
        : Promise.resolve(null),
      filters.clientId
        ? this.prisma.client.findFirst({
            where: { id: filters.clientId, tenantId },
            select: { id: true }
          })
        : Promise.resolve(null),
      filters.assignedMembershipId
        ? this.prisma.tenantMembership.findFirst({
            where: { id: filters.assignedMembershipId, status: "active", tenantId },
            select: { id: true }
          })
        : Promise.resolve(null)
    ]);

    if (filters.caseId && !caseItem) {
      throw new BadRequestException("El expediente del tablero no pertenece al estudio activo.");
    }

    if (filters.clientId && !client) {
      throw new BadRequestException("El cliente del tablero no pertenece al estudio activo.");
    }

    if (filters.assignedMembershipId && !assignedMembership) {
      throw new BadRequestException("El asignado del tablero no pertenece al staff activo.");
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

  private async enqueueCalendarResource(
    tenantId: string,
    resourceType: "case_task" | "case_hearing",
    resourceId: string,
    operation: "upsert" | "delete"
  ) {
    await this.prisma.$transaction((tx) =>
      this.googleCalendar.enqueueResource(tx, tenantId, resourceType, resourceId, operation)
    );
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

const globalCaseTaskSelect = {
  ...caseTaskSelect,
  case: {
    select: {
      caption: true,
      caseNumber: true,
      id: true,
      participants: {
        orderBy: { createdAt: "asc" },
        select: {
          client: {
            select: {
              businessName: true,
              firstName: true,
              id: true,
              lastName: true,
              type: true
            }
          },
          clientId: true
        },
        take: 1,
        where: { clientId: { not: null } }
      },
      primaryClient: {
        select: {
          businessName: true,
          firstName: true,
          id: true,
          lastName: true,
          type: true
        }
      }
    }
  }
} satisfies Prisma.CaseTaskSelect;

type CaseTaskWithSelect = Prisma.CaseTaskGetPayload<{ select: typeof caseTaskSelect }>;
type GlobalCaseTaskWithSelect = Prisma.CaseTaskGetPayload<{ select: typeof globalCaseTaskSelect }>;

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

function toGlobalCaseTaskDto(item: GlobalCaseTaskWithSelect, reminderConfig?: ReminderConfig) {
  const baseTask = toCaseTaskDto(item, reminderConfig);
  const client = item.case?.primaryClient ?? item.case?.participants[0]?.client ?? null;

  return {
    ...baseTask,
    case: item.case
      ? {
          caption: item.case.caption,
          caseNumber: item.case.caseNumber,
          id: item.case.id
        }
      : null,
    client: client
      ? {
          displayName: getClientDisplayName(client),
          id: client.id
        }
      : null
  };
}

function toTaskBoardViewDto(item: {
  createdAt: Date;
  createdByMembershipId: string;
  filters: Prisma.JsonValue;
  id: string;
  name: string;
  settings?: Prisma.JsonValue;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    name: item.name,
    filters: taskBoardFiltersSchema.parse(item.filters),
    settings: taskBoardSettingsSchema.parse(item.settings ?? {}),
    createdByMembershipId: item.createdByMembershipId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

type TenantTasksCursor = {
  id: string;
  sortBy: ListTenantCaseTasksQuery["sortBy"];
  sortDirection: ListTenantCaseTasksQuery["sortDirection"];
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

function encodeTenantTasksCursor(cursor: TenantTasksCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeTenantTasksCursor(cursor?: string): TenantTasksCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      id?: string;
      sortBy?: ListTenantCaseTasksQuery["sortBy"];
      sortDirection?: ListTenantCaseTasksQuery["sortDirection"];
    };

    if (!parsed.id || !parsed.sortBy || !parsed.sortDirection) {
      return null;
    }

    return {
      id: parsed.id,
      sortBy: parsed.sortBy,
      sortDirection: parsed.sortDirection
    };
  } catch {
    throw new BadRequestException("El cursor de tareas es invalido.");
  }
}

function getTaskCursorWhere(cursor: TasksCursor): Prisma.CaseTaskWhereInput[] {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { gt: cursor.id } }
  ];
}

function getTenantTasksWhere(
  tenantId: string,
  query: ListTenantCaseTasksQuery
): Prisma.CaseTaskWhereInput {
  const search = query.search?.trim();
  const andFilters: Prisma.CaseTaskWhereInput[] = [
    ...(search
      ? [
          {
            OR: [
              { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { notes: { contains: search, mode: Prisma.QueryMode.insensitive } },
              {
                case: {
                  caseNumber: { contains: search, mode: Prisma.QueryMode.insensitive }
                }
              },
              {
                case: {
                  caption: { contains: search, mode: Prisma.QueryMode.insensitive }
                }
              }
            ]
          }
        ]
      : [])
  ];

  return {
    tenantId,
    ...(andFilters.length ? { AND: andFilters } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.assignedMembershipId ? { assignedMembershipId: query.assignedMembershipId } : {}),
    ...(query.practiceAreaId
      ? {
          assignedTo: {
            practiceAreas: {
              some: {
                practiceArea: {
                  active: true,
                  id: query.practiceAreaId,
                  tenantId
                }
              }
            }
          }
        }
      : {}),
    ...(query.caseId ? { caseId: query.caseId } : {}),
    ...(query.clientId
      ? {
          case: {
            OR: [
              { primaryClientId: query.clientId },
              { participants: { some: { clientId: query.clientId } } }
            ],
            tenantId
          }
        }
      : {}),
    ...getEndDateWhere(query)
  };
}

function getEndDateWhere(query: ListTenantCaseTasksQuery): Prisma.CaseTaskWhereInput {
  const explicitDateFilter = {
    ...(query.endDateFrom ? { gte: toDateOnly(query.endDateFrom) } : {}),
    ...(query.endDateTo ? { lte: toDateOnly(query.endDateTo) } : {})
  };
  const hasExplicitDateFilter = Object.keys(explicitDateFilter).length > 0;

  if (query.dueStatus) {
    const { dueSoonEndDate, today } = getTaskMetricsDates();
    const dateFilter =
      query.dueStatus === "overdue" ? { lt: today } : { gte: today, lte: dueSoonEndDate };

    return {
      endDate: hasExplicitDateFilter ? { ...dateFilter, ...explicitDateFilter } : dateFilter,
      status: { in: ["pending", "in_progress"] }
    };
  }

  return hasExplicitDateFilter ? { endDate: explicitDateFilter } : {};
}

function getTenantTasksOrderBy(
  query: ListTenantCaseTasksQuery
): Prisma.CaseTaskOrderByWithRelationInput[] {
  const direction = query.sortDirection;

  if (query.sortBy === "name") {
    return [{ name: direction }, { createdAt: "desc" }, { id: "asc" }];
  }

  if (query.sortBy === "status") {
    return [{ status: direction }, { createdAt: "desc" }, { id: "asc" }];
  }

  if (query.sortBy === "endDate") {
    return [{ endDate: direction }, { createdAt: "desc" }, { id: "asc" }];
  }

  if (query.sortBy === "case") {
    return [{ case: { caseNumber: direction } }, { createdAt: "desc" }, { id: "asc" }];
  }

  if (query.sortBy === "client") {
    return [
      { case: { primaryClient: { businessName: direction } } },
      { case: { primaryClient: { lastName: direction } } },
      { case: { primaryClient: { firstName: direction } } },
      { createdAt: "desc" },
      { id: "asc" }
    ];
  }

  if (query.sortBy === "assignedTo") {
    return [
      { assignedTo: { user: { fullName: direction } } },
      { createdAt: "desc" },
      { id: "asc" }
    ];
  }

  return [{ createdAt: direction }, { id: "asc" }];
}

function getTaskMetricsDates() {
  const todayString = getBuenosAiresTodayDateString();
  const today = toDateOnly(todayString);
  const dueSoonEndDate = new Date(today);
  dueSoonEndDate.setUTCDate(today.getUTCDate() + 7);

  return { dueSoonEndDate, today };
}

function toDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function getBuenosAiresTodayDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function getClientDisplayName(client: {
  businessName: string | null;
  firstName: string | null;
  lastName: string | null;
  type: "human" | "legal_entity";
}) {
  const displayName =
    client.type === "legal_entity"
      ? client.businessName
      : [client.firstName, client.lastName].filter(Boolean).join(" ");

  return displayName?.trim() || "Cliente sin nombre";
}
