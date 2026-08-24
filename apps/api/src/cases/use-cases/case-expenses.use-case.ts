import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";
import type {
  CaseCalendarQuery,
  CreateCaseExpenseInput,
  ListCaseExpensesQuery,
  UpdateCaseExpenseInput
} from "../cases.schemas";
import { toCaseExpenseAttachmentDto } from "./case-expense-attachments.use-case";
import { CaseExpenseCashboxSyncUseCase } from "./case-expense-cashbox-sync.use-case";

@Injectable()
export class CaseExpensesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Optional() private readonly cashboxSync?: CaseExpenseCashboxSyncUseCase
  ) {}

  async list(tenantId: string, caseId: string, query: ListCaseExpensesQuery) {
    const cursor = decodeExpensesCursor(query.cursor);
    await this.findTenantCaseOrThrow(tenantId, caseId);
    const expenses = await this.prisma.caseExpense.findMany({
      where: {
        caseId,
        tenantId,
        ...(query.currencyCode ? { currencyCode: query.currencyCode } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.taskId ? { taskId: query.taskId } : {}),
        ...(cursor ? { OR: getExpenseCursorWhere(cursor) } : {})
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: query.limit + 1,
      select: caseExpenseSelect
    });
    const pageItems = expenses.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = expenses.length > query.limit;

    const reminderConfigs = await this.notifications.getReminderConfigs(
      tenantId,
      "case_expense",
      pageItems.map((expense) => expense.id)
    );

    return {
      items: pageItems.map((expense) => toCaseExpenseDto(expense, reminderConfigs.get(expense.id))),
      pageInfo: {
        limit: query.limit,
        offset: 0,
        nextCursor:
          hasNextPage && lastItem
            ? encodeExpensesCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
            : null,
        hasNextPage,
        total: pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async get(tenantId: string, caseId: string, expenseId: string) {
    await this.findTenantCaseOrThrow(tenantId, caseId);
    const expense = await this.prisma.caseExpense.findFirst({
      where: { caseId, id: expenseId, tenantId },
      select: caseExpenseSelect
    });

    if (!expense) {
      throw new NotFoundException("El gasto no existe en el expediente activo.");
    }

    const reminderConfig = await this.getReminderConfig(tenantId, expense.id);
    return toCaseExpenseDto(expense, reminderConfig);
  }

  async summary(tenantId: string, caseId: string) {
    await this.findTenantCaseOrThrow(tenantId, caseId);
    const paidExpensesWhere = { caseId, status: "paid" as const, tenantId };

    const [aggregate, topExpenses, totalCount] = await Promise.all([
      this.prisma.caseExpense.aggregate({
        _sum: { amount: true },
        where: paidExpensesWhere
      }),
      this.prisma.caseExpense.findMany({
        orderBy: [{ amount: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        select: {
          amount: true,
          concept: true,
          id: true
        },
        take: 4,
        where: paidExpensesWhere
      }),
      this.prisma.caseExpense.count({ where: paidExpensesWhere })
    ]);

    const totalAmount = Number(aggregate._sum.amount ?? 0);

    return {
      totalAmount,
      totalCount,
      items: topExpenses.map((expense) => {
        const amount = Number(expense.amount);

        return {
          id: expense.id,
          concept: expense.concept,
          amount,
          percentage: totalAmount > 0 ? Number(((amount / totalAmount) * 100).toFixed(1)) : 0
        };
      })
    };
  }

  async calendar(
    tenantId: string,
    caseId: string,
    query: CaseCalendarQuery,
    permissions: { canReadExpenses: boolean; canReadHearings: boolean; canReadTasks: boolean }
  ) {
    await this.findTenantCaseOrThrow(tenantId, caseId);
    const month = query.month ?? getBuenosAiresMonth();
    const { endDate, startDate } = getMonthDateRange(month);
    const eventTypes = toCalendarEventTypes(query.types);

    const canReadPaymentEvents = permissions.canReadExpenses && eventTypes.includes("payment_due");
    const canReadTaskEvents = permissions.canReadTasks && eventTypes.includes("task_due");
    const canReadHearingEvents = permissions.canReadHearings && eventTypes.includes("hearing");

    if (!canReadPaymentEvents && !canReadTaskEvents && !canReadHearingEvents) {
      return toCalendarResponse({ events: [], limit: query.limit, mode: query.mode, month });
    }

    if (query.mode !== "list") {
      const events = await this.getCalendarEvents({
        canReadHearingEvents,
        canReadPaymentEvents,
        canReadTaskEvents,
        caseId,
        endDate,
        startDate,
        tenantId
      });

      return { month, events };
    }

    const cursor = decodeCalendarCursor(query.cursor);
    const events = await this.getCalendarListEvents({
      canReadHearingEvents,
      canReadPaymentEvents,
      canReadTaskEvents,
      caseId,
      cursor,
      endDate,
      limit: query.limit + 1,
      startDate,
      tenantId
    });
    const pageItems = events.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = events.length > query.limit;

    return {
      month,
      events: pageItems,
      pageInfo: {
        limit: query.limit,
        offset: 0,
        nextCursor:
          hasNextPage && lastItem
            ? encodeCalendarCursor({ date: lastItem.date, id: lastItem.id })
            : null,
        hasNextPage,
        total: pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async tenantCalendar(
    tenantId: string,
    query: CaseCalendarQuery,
    permissions: { canReadExpenses: boolean; canReadHearings: boolean; canReadTasks: boolean }
  ) {
    if (query.caseId) {
      await this.findTenantCaseOrThrow(tenantId, query.caseId);
    }

    const month = query.month ?? getBuenosAiresMonth();
    const { endDate, startDate } = getMonthDateRange(month);
    const eventTypes = toCalendarEventTypes(query.types);
    const canReadPaymentEvents = permissions.canReadExpenses && eventTypes.includes("payment_due");
    const canReadTaskEvents = permissions.canReadTasks && eventTypes.includes("task_due");
    const canReadHearingEvents = permissions.canReadHearings && eventTypes.includes("hearing");
    const metricsPromise = this.getTenantCalendarMetrics(tenantId, permissions);

    if (!canReadPaymentEvents && !canReadTaskEvents && !canReadHearingEvents) {
      return {
        ...toCalendarResponse({ events: [], limit: query.limit, mode: query.mode, month }),
        metrics: await metricsPromise
      };
    }

    if (query.mode !== "list") {
      const [events, metrics] = await Promise.all([
        this.getCalendarEvents({
          canReadHearingEvents,
          canReadPaymentEvents,
          canReadTaskEvents,
          caseId: query.caseId,
          endDate,
          includeCaseContext: true,
          startDate,
          tenantId
        }),
        metricsPromise
      ]);

      return { month, events, metrics };
    }

    const cursor = decodeCalendarCursor(query.cursor);
    const [events, metrics] = await Promise.all([
      this.getCalendarListEvents({
        canReadHearingEvents,
        canReadPaymentEvents,
        canReadTaskEvents,
        caseId: query.caseId,
        cursor,
        endDate,
        includeCaseContext: true,
        limit: query.limit + 1,
        startDate,
        tenantId
      }),
      metricsPromise
    ]);
    const pageItems = events.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = events.length > query.limit;

    return {
      month,
      events: pageItems,
      metrics,
      pageInfo: {
        limit: query.limit,
        offset: 0,
        nextCursor:
          hasNextPage && lastItem
            ? encodeCalendarCursor({ date: lastItem.date, id: lastItem.id })
            : null,
        hasNextPage,
        total: pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  private async getCalendarEvents({
    canReadHearingEvents,
    canReadPaymentEvents,
    canReadTaskEvents,
    caseId,
    endDate,
    includeCaseContext = false,
    startDate,
    tenantId
  }: {
    canReadHearingEvents: boolean;
    canReadPaymentEvents: boolean;
    canReadTaskEvents: boolean;
    caseId?: string;
    endDate: Date;
    includeCaseContext?: boolean;
    startDate: Date;
    tenantId: string;
  }) {
    const [paymentExpenses, pendingTasks, hearings] = await Promise.all([
      canReadPaymentEvents
        ? this.prisma.caseExpense.findMany({
            orderBy: [{ paymentDate: "asc" }, { id: "asc" }],
            select: {
              amount: true,
              concept: true,
              currencyCode: true,
              id: true,
              paymentDate: true,
              status: true,
              ...(includeCaseContext ? { case: { select: caseCalendarContextSelect } } : {})
            },
            where: {
              ...(caseId ? { caseId } : {}),
              tenantId,
              paymentDate: {
                gte: startDate,
                lt: endDate
              },
              status: { in: ["pending", "overdue"] }
            }
          })
        : Promise.resolve([]),
      canReadTaskEvents
        ? this.prisma.caseTask.findMany({
            orderBy: [{ endDate: "asc" }, { startDate: "asc" }, { id: "asc" }],
            select: {
              endDate: true,
              id: true,
              name: true,
              startDate: true,
              status: true,
              ...(includeCaseContext ? { case: { select: caseCalendarContextSelect } } : {})
            },
            where: {
              ...(caseId ? { caseId } : {}),
              tenantId,
              status: { in: ["pending", "in_progress"] },
              OR: [
                {
                  endDate: {
                    gte: startDate,
                    lt: endDate
                  }
                },
                {
                  endDate: null,
                  startDate: {
                    gte: startDate,
                    lt: endDate
                  }
                }
              ]
            }
          })
        : Promise.resolve([]),
      canReadHearingEvents
        ? this.prisma.caseHearing.findMany({
            orderBy: [{ date: "asc" }, { time: "asc" }, { id: "asc" }],
            select: {
              date: true,
              description: true,
              id: true,
              time: true,
              type: true,
              ...(includeCaseContext ? { case: { select: caseCalendarContextSelect } } : {})
            },
            where: {
              ...(caseId ? { caseId } : {}),
              tenantId,
              date: {
                gte: startDate,
                lt: endDate
              }
            }
          })
        : Promise.resolve([])
    ]);

    return [
      ...paymentExpenses.map((expense) => toPaymentDueCalendarEvent(expense, includeCaseContext)),
      ...pendingTasks.map((task) => toTaskDueCalendarEvent(task, includeCaseContext)),
      ...hearings.map((hearing) => toHearingCalendarEvent(hearing, includeCaseContext))
    ].sort(compareCalendarEvents);
  }

  private async getCalendarListEvents({
    canReadHearingEvents,
    canReadPaymentEvents,
    canReadTaskEvents,
    caseId,
    cursor,
    endDate,
    includeCaseContext = false,
    limit,
    startDate,
    tenantId
  }: {
    canReadHearingEvents: boolean;
    canReadPaymentEvents: boolean;
    canReadTaskEvents: boolean;
    caseId?: string;
    cursor: CalendarCursor | null;
    endDate: Date;
    includeCaseContext?: boolean;
    limit: number;
    startDate: Date;
    tenantId: string;
  }) {
    const eventQueries: Prisma.Sql[] = [];

    if (canReadPaymentEvents) {
      eventQueries.push(Prisma.sql`
        SELECT
          'payment_due'::text AS event_type,
          case_expenses.id::text AS id,
          ('Pago: ' || case_expenses.concept)::text AS title,
          case_expenses.payment_date::date AS event_date,
          case_expenses.status::text AS status,
          case_expenses.amount AS amount,
          case_expenses.currency_code::text AS currency_code,
          NULL::text AS hearing_type,
          NULL::text AS time,
          cases.id::text AS case_id,
          cases.case_number::text AS case_number,
          cases.caption::text AS case_caption
        FROM case_expenses
        INNER JOIN cases ON cases.id = case_expenses.case_id
        WHERE case_expenses.tenant_id = ${tenantId}::uuid
          AND cases.tenant_id = ${tenantId}::uuid
          ${caseId ? Prisma.sql`AND case_expenses.case_id = ${caseId}::uuid` : Prisma.empty}
          AND case_expenses.payment_date >= ${startDate}::date
          AND case_expenses.payment_date < ${endDate}::date
          AND case_expenses.status IN ('pending', 'overdue')
      `);
    }

    if (canReadTaskEvents) {
      eventQueries.push(Prisma.sql`
        SELECT
          'task_due'::text AS event_type,
          case_tasks.id::text AS id,
          ('Tarea: ' || case_tasks.name)::text AS title,
          COALESCE(case_tasks.end_date, case_tasks.start_date)::date AS event_date,
          case_tasks.status::text AS status,
          NULL::numeric AS amount,
          NULL::text AS currency_code,
          NULL::text AS hearing_type,
          NULL::text AS time,
          cases.id::text AS case_id,
          cases.case_number::text AS case_number,
          cases.caption::text AS case_caption
        FROM case_tasks
        INNER JOIN cases ON cases.id = case_tasks.case_id
        WHERE case_tasks.tenant_id = ${tenantId}::uuid
          AND cases.tenant_id = ${tenantId}::uuid
          ${caseId ? Prisma.sql`AND case_tasks.case_id = ${caseId}::uuid` : Prisma.empty}
          AND case_tasks.status IN ('pending', 'in_progress')
          AND COALESCE(case_tasks.end_date, case_tasks.start_date) >= ${startDate}::date
          AND COALESCE(case_tasks.end_date, case_tasks.start_date) < ${endDate}::date
      `);
    }

    if (canReadHearingEvents) {
      eventQueries.push(Prisma.sql`
        SELECT
          'hearing'::text AS event_type,
          case_hearings.id::text AS id,
          ('Audiencia: ' || case_hearings.description)::text AS title,
          case_hearings.date::date AS event_date,
          NULL::text AS status,
          NULL::numeric AS amount,
          NULL::text AS currency_code,
          case_hearings.type::text AS hearing_type,
          case_hearings.time::text AS time,
          cases.id::text AS case_id,
          cases.case_number::text AS case_number,
          cases.caption::text AS case_caption
        FROM case_hearings
        INNER JOIN cases ON cases.id = case_hearings.case_id
        WHERE case_hearings.tenant_id = ${tenantId}::uuid
          AND cases.tenant_id = ${tenantId}::uuid
          ${caseId ? Prisma.sql`AND case_hearings.case_id = ${caseId}::uuid` : Prisma.empty}
          AND case_hearings.date >= ${startDate}::date
          AND case_hearings.date < ${endDate}::date
      `);
    }

    const rows = await this.prisma.$queryRaw<CalendarListEventRow[]>(Prisma.sql`
      SELECT event_type, id, title, event_date, status, amount, currency_code, hearing_type, time, case_id, case_number, case_caption
      FROM (${joinSql(eventQueries, Prisma.sql`UNION ALL`)}) AS calendar_events
      ${
        cursor
          ? Prisma.sql`WHERE (event_date, id) > (${cursor.date}::date, ${cursor.id}::text)`
          : Prisma.empty
      }
      ORDER BY event_date ASC, id ASC
      LIMIT ${limit}
    `);

    return rows.map((row) => toCalendarEventFromRow(row, includeCaseContext));
  }

  private async getTenantCalendarMetrics(
    tenantId: string,
    permissions: { canReadExpenses: boolean; canReadHearings: boolean; canReadTasks: boolean }
  ) {
    const [taskMetrics, hearingsCount, pendingExpensesCount] = await Promise.all([
      permissions.canReadTasks
        ? Promise.all([
            this.prisma.caseTask.count({ where: { tenantId } }),
            this.prisma.caseTask.count({
              where: { status: { in: ["pending", "in_progress"] }, tenantId }
            })
          ])
        : Promise.resolve(null),
      permissions.canReadHearings
        ? this.prisma.caseHearing.count({ where: { tenantId } })
        : Promise.resolve(null),
      permissions.canReadExpenses
        ? this.prisma.caseExpense.count({
            where: { status: { in: ["pending", "overdue"] }, tenantId }
          })
        : Promise.resolve(null)
    ]);

    return {
      ...(taskMetrics
        ? {
            pendingTasks: taskMetrics[1],
            totalTasks: taskMetrics[0]
          }
        : {}),
      ...(hearingsCount !== null ? { hearingsCount } : {}),
      ...(pendingExpensesCount !== null ? { pendingExpensesCount } : {})
    };
  }

  async create(
    tenantId: string,
    caseId: string,
    actorUserId: string,
    input: CreateCaseExpenseInput
  ) {
    await this.assertRelations(tenantId, caseId, input);
    const createdExpense = await this.prisma.caseExpense.create({
      data: toCaseExpenseCreateData(tenantId, caseId, input),
      select: caseExpenseSelect
    });
    await this.enqueueCashboxSyncForExpense(tenantId, actorUserId, createdExpense);
    await this.syncReminder(tenantId, actorUserId, createdExpense, input);

    const reminderConfig = await this.getReminderConfig(tenantId, createdExpense.id);
    return toCaseExpenseDto(createdExpense, reminderConfig);
  }

  async update(
    tenantId: string,
    caseId: string,
    expenseId: string,
    actorUserId: string,
    input: UpdateCaseExpenseInput
  ) {
    await this.findTenantExpenseOrThrow(tenantId, caseId, expenseId);
    await this.assertRelations(tenantId, caseId, input);
    const updatedExpense = await this.prisma.caseExpense.update({
      where: { id: expenseId },
      data: toCaseExpenseUpdateData(input),
      select: caseExpenseSelect
    });
    await this.enqueueCashboxSyncForExpense(tenantId, actorUserId, updatedExpense);
    await this.syncReminder(tenantId, actorUserId, updatedExpense, input);

    const reminderConfig = await this.getReminderConfig(tenantId, updatedExpense.id);
    return toCaseExpenseDto(updatedExpense, reminderConfig);
  }

  async delete(tenantId: string, caseId: string, expenseId: string) {
    await this.findTenantExpenseOrThrow(tenantId, caseId, expenseId);
    await this.cashboxSync?.enqueueDelete({ caseExpenseId: expenseId, caseId, tenantId });
    await this.notifications.cancelForResource(tenantId, "case_expense", expenseId);
    await this.prisma.caseExpense.delete({ where: { id: expenseId } });

    return { status: "ok" as const };
  }

  private async assertRelations(
    tenantId: string,
    caseId: string,
    input: CreateCaseExpenseInput | UpdateCaseExpenseInput
  ) {
    await this.findTenantCaseOrThrow(tenantId, caseId);

    if (input.taskId) {
      await this.findTenantTaskOrThrow(tenantId, caseId, input.taskId);
    }

    await this.findActiveTenantCurrencyOrThrow(tenantId, input.currencyCode);
    assertPaidExpensePaymentDateIsToday(input);
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

  private async findTenantExpenseOrThrow(tenantId: string, caseId: string, expenseId: string) {
    const expense = await this.prisma.caseExpense.findFirst({
      where: { caseId, id: expenseId, tenantId },
      select: { id: true }
    });

    if (!expense) {
      throw new NotFoundException("El gasto no existe en el expediente activo.");
    }

    return expense;
  }

  private async findActiveTenantCurrencyOrThrow(tenantId: string, currencyCode: string) {
    const tenantCurrency = await this.prisma.tenantCurrency.findFirst({
      where: { active: true, currencyCode, tenantId },
      select: { id: true }
    });

    if (!tenantCurrency) {
      throw new BadRequestException("La moneda del gasto no esta activa en este estudio.");
    }
  }

  private async enqueueCashboxSyncForExpense(
    tenantId: string,
    actorUserId: string,
    expense: CaseExpenseWithSelect
  ) {
    if (!this.cashboxSync) {
      return;
    }

    if (expense.status === "paid") {
      await this.cashboxSync.enqueueUpsert({
        actorUserId,
        caseExpenseId: expense.id,
        caseId: expense.caseId,
        tenantId
      });
      return;
    }

    await this.cashboxSync.enqueueDelete({
      caseExpenseId: expense.id,
      caseId: expense.caseId,
      tenantId
    });
  }

  private async syncReminder(
    tenantId: string,
    actorUserId: string,
    expense: CaseExpenseWithSelect,
    input: CreateCaseExpenseInput | UpdateCaseExpenseInput
  ) {
    if (expense.status === "paid" || expense.status === "cancelled") {
      await this.notifications.cancelForResource(tenantId, "case_expense", expense.id);
      return;
    }

    await this.notifications.scheduleForResource({
      actorUserId,
      body: expense.notes,
      caseId: expense.caseId,
      resourceId: expense.id,
      resourceType: "case_expense",
      settings: input,
      tenantId,
      title: `Pago: ${expense.concept}`
    });
  }

  private async getReminderConfig(tenantId: string, expenseId: string) {
    const configs = await this.notifications.getReminderConfigs(tenantId, "case_expense", [
      expenseId
    ]);
    return configs.get(expenseId);
  }
}

type CalendarEventType = "payment_due" | "hearing" | "task_due";

type CalendarCursor = {
  date: string;
  id: string;
};

type CalendarEvent = {
  amount?: number;
  caseCaption?: string;
  caseId?: string;
  caseNumber?: string;
  currencyCode?: string;
  date: string;
  hearingType?: HearingType;
  id: string;
  status?: "pending" | "overdue" | "in_progress" | "completed" | "paid" | "cancelled";
  time?: string;
  title: string;
  type: CalendarEventType;
};

type CalendarListEventRow = {
  amount: Prisma.Decimal | null;
  case_caption: string | null;
  case_id: string | null;
  case_number: string | null;
  currency_code: string | null;
  event_date: Date | string;
  event_type: CalendarEventType;
  hearing_type: HearingType | null;
  id: string;
  status: "pending" | "overdue" | "in_progress" | null;
  time: string | null;
  title: string;
};

type HearingType =
  | "preliminary"
  | "trial_view"
  | "conciliation"
  | "mediation"
  | "testimonial"
  | "confessional"
  | "debate"
  | "investigative_statement"
  | "other";

function toCalendarEventTypes(types?: string) {
  if (!types) {
    return ["payment_due", "hearing", "task_due"] satisfies CalendarEventType[];
  }

  return types
    .split(",")
    .map((type) => type.trim())
    .filter(
      (type): type is CalendarEventType =>
        type === "payment_due" || type === "hearing" || type === "task_due"
    );
}

function toCalendarResponse({
  events,
  limit,
  mode,
  month
}: {
  events: CalendarEvent[];
  limit: number;
  mode: CaseCalendarQuery["mode"];
  month: string;
}) {
  return {
    month,
    events,
    ...(mode === "list"
      ? {
          pageInfo: {
            limit,
            offset: 0,
            nextCursor: null,
            hasNextPage: false,
            total: events.length
          }
        }
      : {})
  };
}

function toPaymentDueCalendarEvent(
  expense: {
    amount: Prisma.Decimal;
    case?: CalendarCaseContext;
    concept: string;
    currencyCode: string;
    id: string;
    paymentDate: Date;
    status: "pending" | "overdue" | "paid" | "cancelled";
  },
  includeCaseContext = false
) {
  return withCalendarCaseContext(
    {
      type: "payment_due" as const,
      id: expense.id,
      title: `Pago: ${expense.concept}`,
      date: expense.paymentDate.toISOString().slice(0, 10),
      amount: Number(expense.amount),
      currencyCode: expense.currencyCode,
      status: expense.status
    },
    includeCaseContext ? expense.case : undefined
  );
}

function toTaskDueCalendarEvent(
  task: {
    case?: CalendarCaseContext;
    endDate: Date | null;
    id: string;
    name: string;
    startDate: Date | null;
    status: "pending" | "in_progress" | "completed" | "cancelled";
  },
  includeCaseContext = false
) {
  const taskDate = task.endDate ?? task.startDate;

  return withCalendarCaseContext(
    {
      type: "task_due" as const,
      id: task.id,
      title: `Tarea: ${task.name}`,
      date: taskDate?.toISOString().slice(0, 10) ?? "",
      status: task.status
    },
    includeCaseContext ? task.case : undefined
  );
}

function toHearingCalendarEvent(
  hearing: {
    case?: CalendarCaseContext;
    date: Date;
    description: string;
    id: string;
    time: string;
    type: HearingType;
  },
  includeCaseContext = false
) {
  return withCalendarCaseContext(
    {
      type: "hearing" as const,
      id: hearing.id,
      title: `Audiencia: ${hearing.description}`,
      date: hearing.date.toISOString().slice(0, 10),
      hearingType: hearing.type,
      time: hearing.time
    },
    includeCaseContext ? hearing.case : undefined
  );
}

function toCalendarEventFromRow(
  row: CalendarListEventRow,
  includeCaseContext = false
): CalendarEvent {
  const date = toCalendarDateString(row.event_date);

  if (row.event_type === "payment_due") {
    return withCalendarCaseContext(
      {
        type: "payment_due",
        id: row.id,
        title: row.title,
        date,
        amount: Number(row.amount ?? 0),
        currencyCode: row.currency_code ?? "ARS",
        status: row.status === "overdue" ? "overdue" : "pending"
      },
      includeCaseContext ? toCalendarCaseContextFromRow(row) : undefined
    );
  }

  if (row.event_type === "task_due") {
    return withCalendarCaseContext(
      {
        type: "task_due",
        id: row.id,
        title: row.title,
        date,
        status: row.status === "in_progress" ? "in_progress" : "pending"
      },
      includeCaseContext ? toCalendarCaseContextFromRow(row) : undefined
    );
  }

  return withCalendarCaseContext(
    {
      type: "hearing",
      id: row.id,
      title: row.title,
      date,
      hearingType: row.hearing_type ?? "other",
      time: row.time ?? ""
    },
    includeCaseContext ? toCalendarCaseContextFromRow(row) : undefined
  );
}

function withCalendarCaseContext<TEvent extends CalendarEvent>(
  event: TEvent,
  caseContext?: CalendarCaseContext
) {
  if (!caseContext) {
    return event;
  }

  return {
    ...event,
    caseId: caseContext.id,
    caseNumber: caseContext.caseNumber,
    caseCaption: caseContext.caption
  };
}

function toCalendarCaseContextFromRow(row: CalendarListEventRow): CalendarCaseContext | undefined {
  if (!row.case_id || !row.case_number || !row.case_caption) {
    return undefined;
  }

  return {
    id: row.case_id,
    caseNumber: row.case_number,
    caption: row.case_caption
  };
}

function compareCalendarEvents(first: CalendarEvent, second: CalendarEvent) {
  return first.date.localeCompare(second.date) || first.id.localeCompare(second.id);
}

function joinSql(parts: Prisma.Sql[], separator: Prisma.Sql) {
  return parts
    .slice(1)
    .reduce((joined, part) => Prisma.sql`${joined} ${separator} ${part}`, parts[0]);
}

function toCalendarDateString(date: Date | string) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : date.slice(0, 10);
}

function encodeCalendarCursor(cursor: CalendarCursor) {
  return Buffer.from(
    JSON.stringify({
      date: cursor.date,
      id: cursor.id
    })
  ).toString("base64url");
}

function decodeCalendarCursor(cursor?: string): CalendarCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      date?: string;
      id?: string;
    };

    if (!parsed.date || !parsed.id) {
      return null;
    }

    return {
      date: parsed.date,
      id: parsed.id
    };
  } catch {
    return null;
  }
}

const caseExpenseSelect = {
  alertAt: true,
  alertEnabled: true,
  amount: true,
  caseId: true,
  concept: true,
  currencyCode: true,
  createdAt: true,
  expenseDate: true,
  id: true,
  notes: true,
  paymentDate: true,
  status: true,
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      id: true,
      mimeType: true,
      originalName: true,
      sizeBytes: true
    }
  },
  task: {
    select: {
      id: true,
      name: true
    }
  },
  taskId: true,
  updatedAt: true
} satisfies Prisma.CaseExpenseSelect;

const caseCalendarContextSelect = {
  caption: true,
  caseNumber: true,
  id: true
} satisfies Prisma.CaseSelect;

type CaseExpenseWithSelect = Prisma.CaseExpenseGetPayload<{ select: typeof caseExpenseSelect }>;
type CalendarCaseContext = Prisma.CaseGetPayload<{ select: typeof caseCalendarContextSelect }>;

type CaseExpenseWriteStatus = NonNullable<Prisma.CaseExpenseUncheckedCreateInput["status"]>;

function toCaseExpenseCreateData(
  tenantId: string,
  caseId: string,
  input: CreateCaseExpenseInput
): Prisma.CaseExpenseUncheckedCreateInput {
  return {
    ...toCaseExpenseWriteData(input),
    caseId,
    tenantId
  };
}

function toCaseExpenseUpdateData(
  input: UpdateCaseExpenseInput
): Prisma.CaseExpenseUncheckedUpdateInput {
  return toCaseExpenseWriteData(input);
}

function toCaseExpenseWriteData(input: CreateCaseExpenseInput | UpdateCaseExpenseInput) {
  return {
    alertAt: input.notificationEnabled
      ? toBuenosAiresDateTime(input.notificationDate, input.notificationTime)
      : null,
    alertEnabled: input.notificationEnabled,
    amount: input.amount,
    concept: input.concept,
    currencyCode: input.currencyCode,
    expenseDate: new Date(`${input.expenseDate}T00:00:00.000Z`),
    notes: input.notes ?? null,
    paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`),
    status: normalizeExpenseStatus(input.status, input.expenseDate, input.paymentDate),
    taskId: input.taskId ?? null
  };
}

function assertPaidExpensePaymentDateIsToday(
  input: CreateCaseExpenseInput | UpdateCaseExpenseInput
) {
  if (input.status !== "paid") {
    return;
  }

  const today = getBuenosAiresTodayDateString();

  if (input.paymentDate !== today) {
    throw new BadRequestException("La fecha de pago de un gasto pagado debe ser la fecha de hoy.");
  }
}

function toCaseExpenseDto(item: CaseExpenseWithSelect, reminderConfig?: ReminderConfig) {
  return {
    id: item.id,
    caseId: item.caseId,
    taskId: item.taskId,
    task: item.task,
    alertAt: item.alertAt ? item.alertAt.toISOString() : null,
    alertEnabled: item.alertEnabled,
    attachments: item.attachments.map(toCaseExpenseAttachmentDto),
    concept: item.concept,
    amount: Number(item.amount),
    currencyCode: item.currencyCode,
    expenseDate: item.expenseDate.toISOString().slice(0, 10),
    paymentDate: item.paymentDate.toISOString().slice(0, 10),
    status: item.status,
    notes: item.notes,
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

function normalizeExpenseStatus(
  status: CreateCaseExpenseInput["status"],
  expenseDate: string,
  paymentDate: string
): CaseExpenseWriteStatus {
  if (status !== "pending") {
    return status;
  }

  const expenseDay = new Date(`${expenseDate}T00:00:00.000Z`);
  const paymentDay = new Date(`${paymentDate}T00:00:00.000Z`);

  return paymentDay < getBuenosAiresTodayDate() || expenseDay > paymentDay
    ? ("overdue" as CaseExpenseWriteStatus)
    : "pending";
}

function getBuenosAiresTodayDate() {
  return new Date(`${getBuenosAiresTodayDateString()}T00:00:00.000Z`);
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

function getBuenosAiresMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${dateParts.year}-${dateParts.month}`;
}

function getMonthDateRange(month: string) {
  const [yearValue = "", monthValue = ""] = month.split("-");
  const year = Number(yearValue);
  const monthNumber = Number(monthValue);
  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const endDate = new Date(Date.UTC(year, monthNumber, 1));

  return { endDate, startDate };
}

function toBuenosAiresDateTime(date?: string, time?: string) {
  if (!date || !time) {
    return null;
  }

  return new Date(`${date}T${time}:00.000-03:00`);
}

type ExpensesCursor = {
  createdAt: Date;
  id: string;
};

function encodeExpensesCursor(cursor: ExpensesCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id
    })
  ).toString("base64url");
}

function decodeExpensesCursor(cursor?: string): ExpensesCursor | null {
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

function getExpenseCursorWhere(cursor: ExpensesCursor): Prisma.CaseExpenseWhereInput[] {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { gt: cursor.id } }
  ];
}
