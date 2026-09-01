import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type {
  CaseCalendarQuery,
  CreateCaseDocumentInput,
  CreateCaseExpenseInput,
  CreateCaseHearingInput,
  CreateCaseInput,
  CreateCaseTaskInput,
  ListCaseDocumentsQuery,
  ListCaseExpenseAttachmentsQuery,
  ListCaseExpensesQuery,
  ListDocumentCategoriesQuery,
  ListCaseHearingsQuery,
  ListCasePickerOptionsQuery,
  ListCaseTasksQuery,
  ListCasesQuery,
  UpdateCaseExpenseInput,
  UpdateCaseHearingInput,
  UpdateCaseInput,
  UpdateCaseTaskInput
} from "./cases.schemas";
import {
  CaseExpenseAttachmentsUseCase,
  type UploadedCaseExpenseAttachmentFile
} from "./use-cases/case-expense-attachments.use-case";
import {
  CaseDocumentsUseCase,
  type UploadedCaseDocumentFile
} from "./use-cases/case-documents.use-case";
import { CaseExpensesUseCase } from "./use-cases/case-expenses.use-case";
import { CaseHearingsUseCase } from "./use-cases/case-hearings.use-case";
import { CaseTasksUseCase } from "./use-cases/case-tasks.use-case";
import { ExpenseOverdueUseCase } from "./use-cases/expense-overdue.use-case";

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseExpenseAttachmentsUseCase: CaseExpenseAttachmentsUseCase,
    private readonly caseDocumentsUseCase: CaseDocumentsUseCase,
    private readonly caseExpensesUseCase: CaseExpensesUseCase,
    private readonly expenseOverdueUseCase: ExpenseOverdueUseCase,
    private readonly caseHearingsUseCase: CaseHearingsUseCase,
    private readonly caseTasksUseCase: CaseTasksUseCase
  ) {}

  async list(tenantId: string, query: ListCasesQuery) {
    const search = query.search?.trim();
    if (search) {
      return this.listSearch(tenantId, { ...query, search });
    }

    const cursor = decodeCasesCursor(query.cursor);
    if (cursor?.sortBy !== undefined && cursor.sortBy !== query.sortBy) {
      throw new BadRequestException("El cursor no corresponde al orden seleccionado.");
    }
    if (cursor && query.sortBy === "filingDate") {
      throw new BadRequestException("La paginacion por cursor no soporta fecha de ingreso.");
    }

    const andFilters: Prisma.CaseWhereInput[] = [
      ...(cursor ? [{ OR: getCursorWhere(cursor, query.sortBy, query.sortDirection) }] : []),
      ...(query.search
        ? [
            {
              OR: [
                { caseNumber: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { caption: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { subject: { contains: query.search, mode: Prisma.QueryMode.insensitive } }
              ]
            }
          ]
        : []),
      ...(query.judicialCenter
        ? [
            {
              OR: [
                {
                  judicialCenterText: {
                    contains: query.judicialCenter,
                    mode: Prisma.QueryMode.insensitive
                  }
                },
                {
                  judicialCenterForum: {
                    judicialCenter: {
                      name: { contains: query.judicialCenter, mode: Prisma.QueryMode.insensitive }
                    }
                  }
                }
              ]
            }
          ]
        : [])
    ];
    const where: Prisma.CaseWhereInput = {
      tenantId,
      ...(andFilters.length ? { AND: andFilters } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.instance ? { instance: query.instance } : {}),
      ...(query.filingDate ? { filingDate: new Date(`${query.filingDate}T00:00:00.000Z`) } : {}),
      ...(query.provinceId ? { provinceId: query.provinceId } : {}),
      ...(query.forumTemplateId ? { forumTemplateId: query.forumTemplateId } : {}),
      ...(query.court
        ? { court: { contains: query.court, mode: Prisma.QueryMode.insensitive } }
        : {})
    };

    const items = await this.prisma.case.findMany({
      where,
      orderBy: getOrderBy(query.sortBy, query.sortDirection),
      take: query.limit + 1,
      include: caseInclude
    });
    const pageItems = items.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = items.length > query.limit;

    return {
      items: pageItems.map(toCaseDto),
      pageInfo: {
        limit: query.limit,
        offset: query.offset,
        nextCursor:
          hasNextPage && lastItem && query.sortBy !== "filingDate"
            ? encodeCasesCursor({
                id: lastItem.id,
                sortBy: query.sortBy,
                value: getCursorSortValue(lastItem, query.sortBy)
              })
            : null,
        hasNextPage,
        total: query.offset + pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async getMetrics(tenantId: string) {
    const [countsByStatus, pendingTasks] = await Promise.all([
      this.prisma.case.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: { tenantId }
      }),
      this.prisma.caseTask.count({
        where: {
          status: { in: ["pending", "in_progress"] },
          tenantId
        }
      })
    ]);
    const countByStatus = new Map(
      countsByStatus.map(({ _count, status }) => [status, _count._all])
    );

    return {
      totalCases: countsByStatus.reduce((total, item) => total + item._count._all, 0),
      openCases: countByStatus.get("open") ?? 0,
      closedCases: countByStatus.get("closed") ?? 0,
      pendingTasks
    };
  }

  async listPickerOptions(tenantId: string, query: ListCasePickerOptionsQuery) {
    const search = query.search?.trim();
    const cursor = decodeCasePickerCursor(query.cursor);

    if (cursor && cursor.search !== (search ?? null)) {
      throw new BadRequestException("El cursor no corresponde a la busqueda seleccionada.");
    }

    const andFilters: Prisma.CaseWhereInput[] = [
      ...(search
        ? [
            {
              OR: [
                { caseNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { caption: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { subject: { contains: search, mode: Prisma.QueryMode.insensitive } }
              ]
            }
          ]
        : []),
      ...(cursor
        ? [
            {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } }
              ]
            }
          ]
        : [])
    ];
    const where: Prisma.CaseWhereInput = {
      tenantId,
      ...(andFilters.length ? { AND: andFilters } : {})
    };

    const items = await this.prisma.case.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      select: casePickerOptionSelect
    });
    const pageItems = items.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = items.length > query.limit;

    return {
      items: pageItems.map(toCasePickerOptionDto),
      pageInfo: {
        limit: query.limit,
        offset: query.offset,
        nextCursor:
          hasNextPage && lastItem
            ? encodeCasePickerCursor({
                createdAt: lastItem.createdAt,
                id: lastItem.id,
                search: search ?? null
              })
            : null,
        hasNextPage,
        total: query.offset + pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  private async listSearch(tenantId: string, query: ListCasesQuery & { search: string }) {
    const cursor = decodeCasesSearchCursor(query.cursor);
    if (cursor && cursor.search !== query.search) {
      throw new BadRequestException("El cursor no corresponde a la busqueda seleccionada.");
    }

    const search = query.search.trim();
    const likeSearch = `%${search}%`;
    const searchRankSql = Prisma.sql`
      (
        similarity("case_number", ${search}) * 3.0 +
        similarity("caption", ${search}) * 2.0 +
        similarity(coalesce("subject", ''), ${search}) +
        similarity(coalesce("court", ''), ${search}) * 0.5 +
        similarity(coalesce("judicial_center_text", ''), ${search}) * 0.5
      )
    `;
    const filters = [
      Prisma.sql`"tenant_id" = ${tenantId}::uuid`,
      Prisma.sql`(
        "case_number" ILIKE ${likeSearch}
        OR "caption" ILIKE ${likeSearch}
        OR "subject" ILIKE ${likeSearch}
        OR "court" ILIKE ${likeSearch}
        OR "judicial_center_text" ILIKE ${likeSearch}
        OR "case_number" % ${search}
        OR "caption" % ${search}
        OR coalesce("subject", '') % ${search}
        OR coalesce("court", '') % ${search}
        OR coalesce("judicial_center_text", '') % ${search}
      )`,
      ...(query.status ? [Prisma.sql`"status" = ${query.status}::"CaseStatus"`] : []),
      ...(query.instance ? [Prisma.sql`"instance" = ${query.instance}::"CaseInstance"`] : []),
      ...(query.filingDate
        ? [Prisma.sql`"filing_date" = ${new Date(`${query.filingDate}T00:00:00.000Z`)}`]
        : []),
      ...(query.provinceId ? [Prisma.sql`"province_id" = ${query.provinceId}::uuid`] : []),
      ...(query.forumTemplateId
        ? [Prisma.sql`"forum_template_id" = ${query.forumTemplateId}::uuid`]
        : []),
      ...(query.court ? [Prisma.sql`"court" ILIKE ${`%${query.court}%`}`] : []),
      ...(query.judicialCenter
        ? [Prisma.sql`"judicial_center_text" ILIKE ${`%${query.judicialCenter}%`}`]
        : []),
      ...(cursor
        ? [
            Prisma.sql`(
              ${searchRankSql} < ${cursor.rank}
              OR (${searchRankSql} = ${cursor.rank} AND "created_at" < ${cursor.createdAt})
              OR (${searchRankSql} = ${cursor.rank} AND "created_at" = ${cursor.createdAt} AND "id"::text < ${cursor.id})
            )`
          ]
        : [])
    ];

    const rows = await this.prisma.$queryRaw<CaseSearchRow[]>`
      SELECT "id"::text, "created_at", ${searchRankSql} AS "rank"
      FROM "cases"
      WHERE ${Prisma.join(filters, " AND ")}
      ORDER BY "rank" DESC, "created_at" DESC, "id" DESC
      LIMIT ${query.limit + 1}
    `;
    const pageRows = rows.slice(0, query.limit);
    const hasNextPage = rows.length > query.limit;
    const ids = pageRows.map((row) => row.id);
    const records = ids.length
      ? await this.prisma.case.findMany({
          where: { id: { in: ids }, tenantId },
          include: caseInclude
        })
      : [];
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const items = pageRows
      .map((row) => recordsById.get(row.id))
      .filter((record): record is CaseWithInclude => Boolean(record));
    const lastRow = pageRows.at(-1);

    return {
      items: items.map(toCaseDto),
      pageInfo: {
        limit: query.limit,
        offset: query.offset,
        nextCursor:
          hasNextPage && lastRow
            ? encodeCasesSearchCursor({
                createdAt: lastRow.created_at,
                id: lastRow.id,
                rank: Number(lastRow.rank),
                search
              })
            : null,
        hasNextPage,
        total: query.offset + items.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async create(tenantId: string, input: CreateCaseInput) {
    const relationContext = await this.assertCaseRelations(tenantId, input);

    try {
      const createdCase = await this.prisma.case.create({
        data: {
          ...toCaseData(input, relationContext.caseCatalogStrategy),
          tenantId,
          participants: {
            create: input.participants.map(toParticipantData)
          }
        },
        include: caseInclude
      });

      return toCaseDto(createdCase);
    } catch (error) {
      handleKnownCaseWriteError(error);
      throw error;
    }
  }

  async getDetail(tenantId: string, caseId: string) {
    const [caseItem, taskMetrics] = await Promise.all([
      this.findTenantCaseDetailOrThrow(tenantId, caseId),
      this.getCaseTaskMetrics(tenantId, caseId)
    ]);

    return {
      ...toCaseDto(caseItem),
      metrics: taskMetrics
    };
  }

  async listTasks(tenantId: string, caseId: string, query: ListCaseTasksQuery) {
    return this.caseTasksUseCase.list(tenantId, caseId, query);
  }

  async createTask(
    tenantId: string,
    caseId: string,
    actorUserId: string,
    input: CreateCaseTaskInput
  ) {
    return this.caseTasksUseCase.create(tenantId, caseId, actorUserId, input);
  }

  async updateTask(
    tenantId: string,
    caseId: string,
    taskId: string,
    actorUserId: string,
    input: UpdateCaseTaskInput
  ) {
    return this.caseTasksUseCase.update(tenantId, caseId, taskId, actorUserId, input);
  }

  async markTaskSeen(tenantId: string, caseId: string, taskId: string) {
    return this.caseTasksUseCase.markSeen(tenantId, caseId, taskId);
  }

  async deleteTask(tenantId: string, caseId: string, taskId: string) {
    return this.caseTasksUseCase.delete(tenantId, caseId, taskId);
  }

  async listExpenses(tenantId: string, caseId: string, query: ListCaseExpensesQuery) {
    return this.caseExpensesUseCase.list(tenantId, caseId, query);
  }

  async getExpense(tenantId: string, caseId: string, expenseId: string) {
    return this.caseExpensesUseCase.get(tenantId, caseId, expenseId);
  }

  async getExpensesSummary(tenantId: string, caseId: string) {
    return this.caseExpensesUseCase.summary(tenantId, caseId);
  }

  async recalculateOverdueExpenses(tenantId: string, caseId: string) {
    return this.expenseOverdueUseCase.recalculate(tenantId, { caseId });
  }

  async getCalendar(
    tenantId: string,
    caseId: string,
    query: CaseCalendarQuery,
    permissions: { canReadExpenses: boolean; canReadHearings: boolean; canReadTasks: boolean }
  ) {
    return this.caseExpensesUseCase.calendar(tenantId, caseId, query, permissions);
  }

  async getTenantCalendar(
    tenantId: string,
    query: CaseCalendarQuery,
    permissions: { canReadExpenses: boolean; canReadHearings: boolean; canReadTasks: boolean }
  ) {
    return this.caseExpensesUseCase.tenantCalendar(tenantId, query, permissions);
  }

  async listDocumentCategories(tenantId: string, query: ListDocumentCategoriesQuery) {
    return this.caseDocumentsUseCase.listCategories(tenantId, query);
  }

  async listDocuments(tenantId: string, caseId: string, query: ListCaseDocumentsQuery) {
    return this.caseDocumentsUseCase.list(tenantId, caseId, query);
  }

  async createDocument(
    tenantId: string,
    caseId: string,
    uploadedByUserId: string,
    metadata: CreateCaseDocumentInput,
    file?: UploadedCaseDocumentFile
  ) {
    return this.caseDocumentsUseCase.create(tenantId, caseId, uploadedByUserId, metadata, file);
  }

  async readDocumentObject(tenantId: string, caseId: string, documentId: string) {
    return this.caseDocumentsUseCase.readObject(tenantId, caseId, documentId);
  }

  async deleteDocument(tenantId: string, caseId: string, documentId: string) {
    return this.caseDocumentsUseCase.delete(tenantId, caseId, documentId);
  }

  async listHearings(tenantId: string, caseId: string, query: ListCaseHearingsQuery) {
    return this.caseHearingsUseCase.list(tenantId, caseId, query);
  }

  async createHearing(
    tenantId: string,
    caseId: string,
    actorUserId: string,
    input: CreateCaseHearingInput
  ) {
    return this.caseHearingsUseCase.create(tenantId, caseId, actorUserId, input);
  }

  async updateHearing(
    tenantId: string,
    caseId: string,
    hearingId: string,
    actorUserId: string,
    input: UpdateCaseHearingInput
  ) {
    return this.caseHearingsUseCase.update(tenantId, caseId, hearingId, actorUserId, input);
  }

  async deleteHearing(tenantId: string, caseId: string, hearingId: string) {
    return this.caseHearingsUseCase.delete(tenantId, caseId, hearingId);
  }

  async createExpense(
    tenantId: string,
    caseId: string,
    actorUserId: string,
    input: CreateCaseExpenseInput
  ) {
    return this.caseExpensesUseCase.create(tenantId, caseId, actorUserId, input);
  }

  async updateExpense(
    tenantId: string,
    caseId: string,
    expenseId: string,
    actorUserId: string,
    input: UpdateCaseExpenseInput
  ) {
    return this.caseExpensesUseCase.update(tenantId, caseId, expenseId, actorUserId, input);
  }

  async deleteExpense(tenantId: string, caseId: string, expenseId: string) {
    return this.caseExpensesUseCase.delete(tenantId, caseId, expenseId);
  }

  async listExpenseAttachments(
    tenantId: string,
    caseId: string,
    expenseId: string,
    query: ListCaseExpenseAttachmentsQuery
  ) {
    return this.caseExpenseAttachmentsUseCase.list(tenantId, caseId, expenseId, query);
  }

  async createExpenseAttachment(
    tenantId: string,
    caseId: string,
    expenseId: string,
    uploadedByUserId: string,
    file?: UploadedCaseExpenseAttachmentFile
  ) {
    return this.caseExpenseAttachmentsUseCase.create(
      tenantId,
      caseId,
      expenseId,
      uploadedByUserId,
      file
    );
  }

  async downloadExpenseAttachment(
    tenantId: string,
    caseId: string,
    expenseId: string,
    attachmentId: string
  ) {
    return this.caseExpenseAttachmentsUseCase.download(tenantId, caseId, expenseId, attachmentId);
  }

  async deleteExpenseAttachment(
    tenantId: string,
    caseId: string,
    expenseId: string,
    attachmentId: string
  ) {
    return this.caseExpenseAttachmentsUseCase.delete(tenantId, caseId, expenseId, attachmentId);
  }

  async update(tenantId: string, caseId: string, input: UpdateCaseInput) {
    await this.findTenantCaseOrThrow(tenantId, caseId);
    const relationContext = await this.assertCaseRelations(tenantId, input);

    try {
      const updatedCase = await this.prisma.$transaction(async (tx) => {
        await tx.caseParticipant.deleteMany({ where: { caseId } });

        return tx.case.update({
          where: { id: caseId },
          data: {
            ...toCaseData(input, relationContext.caseCatalogStrategy),
            participants: {
              create: input.participants.map(toParticipantData)
            }
          },
          include: caseInclude
        });
      });

      return toCaseDto(updatedCase);
    } catch (error) {
      handleKnownCaseWriteError(error);
      throw error;
    }
  }

  async delete(tenantId: string, caseId: string) {
    await this.findTenantCaseOrThrow(tenantId, caseId);
    await this.prisma.$transaction(async (tx) => {
      await this.caseDocumentsUseCase.enqueueCleanupForCaseDeletion(tx, tenantId, caseId);
      await tx.case.delete({ where: { id: caseId } });
    });
    await this.caseDocumentsUseCase.processDueCleanupJobs();

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

  private async findTenantCaseDetailOrThrow(tenantId: string, caseId: string) {
    const existingCase = await this.prisma.case.findFirst({
      include: caseInclude,
      where: { id: caseId, tenantId }
    });

    if (!existingCase) {
      throw new NotFoundException("El expediente no existe en el estudio activo.");
    }

    return existingCase;
  }

  private async getCaseTaskMetrics(tenantId: string, caseId: string) {
    const [totalTasks, pendingTasks, paidExpenses, pendingPayments, hearingsCount] =
      await Promise.all([
        this.prisma.caseTask.count({ where: { caseId, tenantId } }),
        this.prisma.caseTask.count({
          where: { caseId, status: { in: ["pending", "in_progress"] }, tenantId }
        }),
        this.prisma.caseExpense.aggregate({
          _sum: { amount: true },
          where: { caseId, status: "paid", tenantId }
        }),
        this.prisma.caseExpense.aggregate({
          _sum: { amount: true },
          where: { caseId, status: { in: ["pending", "overdue"] }, tenantId }
        }),
        this.prisma.caseHearing.count({ where: { caseId, tenantId } })
      ]);

    return {
      hearingsCount,
      pendingTasks,
      pendingPayments: Number(pendingPayments._sum.amount ?? 0),
      totalExpenses: Number(paidExpenses._sum.amount ?? 0),
      totalTasks
    };
  }

  private async assertCaseRelations(tenantId: string, input: CreateCaseInput | UpdateCaseInput) {
    const participantClientIds = getParticipantClientIds(input);
    const [
      province,
      forumTemplate,
      judicialCenterForum,
      primaryClient,
      practiceArea,
      responsibleMembership,
      participantClients
    ] = await Promise.all([
      input.provinceId
        ? this.prisma.province.findFirst({
            where: { active: true, id: input.provinceId },
            select: { caseCatalogStrategy: true, id: true }
          })
        : Promise.resolve(null),
      input.provinceId && input.forumTemplateId
        ? this.prisma.forumTemplate.findFirst({
            where: {
              active: true,
              id: input.forumTemplateId,
              provinceId: input.provinceId
            },
            select: { id: true }
          })
        : Promise.resolve(null),
      input.judicialCenterForumId
        ? this.prisma.judicialCenterForum.findFirst({
            where: {
              active: true,
              id: input.judicialCenterForumId,
              forumTemplateId: input.forumTemplateId,
              forumTemplate: { active: true, provinceId: input.provinceId },
              judicialCenter: { active: true, provinceId: input.provinceId }
            },
            select: { id: true }
          })
        : Promise.resolve(null),
      input.primaryClientId
        ? this.prisma.client.findFirst({
            where: { id: input.primaryClientId, tenantId },
            select: { id: true }
          })
        : Promise.resolve(null),
      input.practiceAreaId
        ? this.prisma.practiceArea.findFirst({
            where: { active: true, id: input.practiceAreaId, tenantId },
            select: { id: true }
          })
        : Promise.resolve(null),
      input.responsibleMembershipId
        ? this.prisma.tenantMembership.findFirst({
            where: { id: input.responsibleMembershipId, status: "active", tenantId },
            select: { id: true }
          })
        : Promise.resolve(null),
      participantClientIds.length
        ? this.prisma.client.findMany({
            where: { id: { in: participantClientIds }, tenantId },
            select: { id: true }
          })
        : Promise.resolve([])
    ]);

    if (input.provinceId && !province) {
      throw new BadRequestException("La provincia seleccionada no existe.");
    }

    if (input.forumTemplateId && !forumTemplate) {
      throw new BadRequestException("El fuero seleccionado no pertenece a esa provincia.");
    }

    if (province?.caseCatalogStrategy === "center_forum" && !input.judicialCenterForumId) {
      throw new BadRequestException("Selecciona un centro judicial para esa provincia.");
    }

    if (province?.caseCatalogStrategy === "manual" && input.judicialCenterForumId) {
      throw new BadRequestException(
        "La provincia seleccionada no usa centros judiciales catalogados."
      );
    }

    if (input.judicialCenterForumId && (!input.provinceId || !input.forumTemplateId)) {
      throw new BadRequestException("El centro judicial requiere provincia y fuero catalogados.");
    }

    if (input.judicialCenterForumId && !judicialCenterForum) {
      throw new BadRequestException("El fuero seleccionado no pertenece al centro judicial.");
    }

    if (input.primaryClientId && !primaryClient) {
      throw new BadRequestException("El cliente principal no pertenece al estudio activo.");
    }

    if (input.practiceAreaId && !practiceArea) {
      throw new BadRequestException("El area de practica no pertenece al estudio activo.");
    }

    if (input.responsibleMembershipId && !responsibleMembership) {
      throw new BadRequestException("El responsable no pertenece al estudio activo.");
    }

    if (participantClients.length !== participantClientIds.length) {
      throw new BadRequestException("Uno o mas participantes referencian clientes invalidos.");
    }

    return { caseCatalogStrategy: province?.caseCatalogStrategy ?? "manual" };
  }
}

const caseInclude = {
  province: {
    select: {
      code: true,
      id: true,
      name: true
    }
  },
  forumTemplate: {
    select: {
      code: true,
      id: true,
      name: true
    }
  },
  judicialCenterForum: {
    select: {
      id: true,
      judicialCenter: {
        select: {
          code: true,
          id: true,
          name: true
        }
      }
    }
  },
  participants: {
    orderBy: { createdAt: "asc" },
    select: {
      address: true,
      clientId: true,
      displayName: true,
      document: true,
      email: true,
      id: true,
      notes: true,
      participantKind: true,
      phone: true,
      role: true
    }
  }
} satisfies Prisma.CaseInclude;

type CaseWithInclude = Prisma.CaseGetPayload<{ include: typeof caseInclude }>;

const casePickerOptionSelect = {
  id: true,
  caseNumber: true,
  caption: true,
  subject: true,
  createdAt: true
} satisfies Prisma.CaseSelect;

type CasePickerOptionRecord = Prisma.CaseGetPayload<{ select: typeof casePickerOptionSelect }>;

function toCaseData(
  input: CreateCaseInput | UpdateCaseInput,
  caseCatalogStrategy: "manual" | "center_forum"
) {
  return {
    caseNumber: input.caseNumber,
    caption: input.caption,
    court: input.court ?? null,
    description: input.description ?? null,
    filingDate: input.filingDate ? new Date(`${input.filingDate}T00:00:00.000Z`) : null,
    forumTemplateId: input.forumTemplateId ?? null,
    instance: input.instance,
    judicialCenterForumId:
      caseCatalogStrategy === "center_forum" ? (input.judicialCenterForumId ?? null) : null,
    judicialCenterText:
      caseCatalogStrategy === "manual" ? (input.judicialCenterText ?? null) : null,
    jurisdictionText: input.jurisdictionText ?? null,
    practiceAreaId: input.practiceAreaId ?? null,
    primaryClientId: input.primaryClientId ?? null,
    provinceId: input.provinceId ?? null,
    provinceText: input.provinceText ?? null,
    responsibleMembershipId: input.responsibleMembershipId ?? null,
    status: input.status,
    subject: input.subject ?? null,
    unitText: input.unitText ?? null
  };
}

function toParticipantData(
  participant: CreateCaseInput["participants"][number]
): Prisma.CaseParticipantCreateWithoutCaseInput {
  return {
    address: participant.address ?? null,
    ...(participant.clientId ? { client: { connect: { id: participant.clientId } } } : {}),
    displayName: participant.displayName,
    document: participant.document ?? null,
    email: participant.email ?? null,
    notes: participant.notes ?? null,
    participantKind: participant.participantKind,
    phone: participant.phone ?? null,
    role: participant.role
  };
}

function toCaseDto(item: CaseWithInclude) {
  return {
    id: item.id,
    caseNumber: item.caseNumber,
    caption: item.caption,
    subject: item.subject,
    description: item.description,
    province: item.province,
    forum: item.forumTemplate,
    judicialCenter: item.judicialCenterForum?.judicialCenter ?? null,
    judicialCenterForumId: item.judicialCenterForumId,
    judicialCenterText: item.judicialCenterText,
    provinceText: item.provinceText,
    jurisdictionText: item.jurisdictionText,
    unitText: item.unitText,
    court: item.court,
    instance: item.instance,
    status: item.status,
    filingDate: item.filingDate ? item.filingDate.toISOString().slice(0, 10) : null,
    primaryClientId: item.primaryClientId,
    practiceAreaId: item.practiceAreaId,
    responsibleMembershipId: item.responsibleMembershipId,
    participants: item.participants,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

function toCasePickerOptionDto(item: CasePickerOptionRecord) {
  return {
    id: item.id,
    caseNumber: item.caseNumber,
    caption: item.caption,
    subject: item.subject
  };
}

function getParticipantClientIds(input: CreateCaseInput | UpdateCaseInput) {
  return [
    ...new Set(
      input.participants
        .map((participant) => participant.clientId)
        .filter((clientId): clientId is string => Boolean(clientId))
    )
  ];
}

function getOrderBy(sortBy: ListCasesQuery["sortBy"], direction: "asc" | "desc") {
  const tieBreaker = { id: direction } as const;

  if (sortBy === "caseNumber") {
    return [{ caseNumber: direction }, tieBreaker];
  }

  if (sortBy === "caption") {
    return [{ caption: direction }, tieBreaker];
  }

  if (sortBy === "filingDate") {
    return [{ filingDate: direction }, tieBreaker];
  }

  if (sortBy === "status") {
    return [{ status: direction }, tieBreaker];
  }

  return [{ createdAt: direction }, tieBreaker];
}

type CasesCursor = {
  id: string;
  sortBy: Exclude<ListCasesQuery["sortBy"], "filingDate">;
  value: Date | string;
};

type CasesSearchCursor = {
  createdAt: Date;
  id: string;
  rank: number;
  search: string;
};

type CasePickerCursor = {
  createdAt: Date;
  id: string;
  search: string | null;
};

type CaseSearchRow = {
  created_at: Date;
  id: string;
  rank: number;
};

function encodeCasesCursor(cursor: CasesCursor) {
  const value = cursor.value instanceof Date ? cursor.value.toISOString() : cursor.value;

  return Buffer.from(
    JSON.stringify({
      id: cursor.id,
      sortBy: cursor.sortBy,
      value
    })
  ).toString("base64url");
}

function decodeCasesCursor(cursor?: string): CasesCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      id?: string;
      sortBy?: ListCasesQuery["sortBy"];
      value?: string;
    };

    if (!parsed.id || !parsed.sortBy || !parsed.value || parsed.sortBy === "filingDate") {
      return null;
    }

    return {
      id: parsed.id,
      sortBy: parsed.sortBy,
      value: parsed.sortBy === "createdAt" ? new Date(parsed.value) : parsed.value
    };
  } catch {
    throw new BadRequestException("El cursor de paginacion es invalido.");
  }
}

function encodeCasesSearchCursor(cursor: CasesSearchCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
      rank: cursor.rank,
      search: cursor.search
    })
  ).toString("base64url");
}

function decodeCasesSearchCursor(cursor?: string): CasesSearchCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt?: string;
      id?: string;
      rank?: number;
      search?: string;
    };

    if (!parsed.createdAt || !parsed.id || typeof parsed.rank !== "number" || !parsed.search) {
      return null;
    }

    return {
      createdAt: new Date(parsed.createdAt),
      id: parsed.id,
      rank: parsed.rank,
      search: parsed.search
    };
  } catch {
    throw new BadRequestException("El cursor de busqueda es invalido.");
  }
}

function encodeCasePickerCursor(cursor: CasePickerCursor) {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
      search: cursor.search
    })
  ).toString("base64url");
}

function decodeCasePickerCursor(cursor?: string): CasePickerCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt?: string;
      id?: string;
      search?: string | null;
    };

    if (!parsed.createdAt || !parsed.id) {
      return null;
    }

    return {
      createdAt: new Date(parsed.createdAt),
      id: parsed.id,
      search: parsed.search ?? null
    };
  } catch {
    throw new BadRequestException("El cursor de busqueda es invalido.");
  }
}

function getCursorWhere(
  cursor: CasesCursor,
  sortBy: ListCasesQuery["sortBy"],
  direction: "asc" | "desc"
): Prisma.CaseWhereInput[] {
  if (sortBy === "filingDate") {
    return [];
  }

  if (sortBy === "status") {
    return getStatusCursorWhere(cursor, direction);
  }

  const operator = direction === "asc" ? "gt" : "lt";

  return [
    { [sortBy]: { [operator]: cursor.value } },
    { [sortBy]: cursor.value, id: { [operator]: cursor.id } }
  ] as Prisma.CaseWhereInput[];
}

function getStatusCursorWhere(
  cursor: CasesCursor,
  direction: "asc" | "desc"
): Prisma.CaseWhereInput[] {
  const statusOrder = ["open", "paused", "closed"] as const;
  const currentStatusIndex = statusOrder.indexOf(cursor.value as (typeof statusOrder)[number]);
  const remainingStatuses =
    direction === "asc"
      ? statusOrder.slice(currentStatusIndex + 1)
      : statusOrder.slice(0, currentStatusIndex);
  const operator = direction === "asc" ? "gt" : "lt";

  return [
    ...(remainingStatuses.length ? [{ status: { in: [...remainingStatuses] } }] : []),
    { status: cursor.value as (typeof statusOrder)[number], id: { [operator]: cursor.id } }
  ];
}

function getCursorSortValue(item: CaseWithInclude, sortBy: ListCasesQuery["sortBy"]) {
  if (sortBy === "createdAt") {
    return item.createdAt;
  }

  if (sortBy === "filingDate") {
    return item.filingDate ?? item.createdAt;
  }

  return item[sortBy];
}

function handleKnownCaseWriteError(error: unknown): never | void {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictException("Ya existe un expediente con ese numero en el estudio activo.");
  }
}
