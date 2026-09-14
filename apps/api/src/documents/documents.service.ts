import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { DocumentScope, DocumentStorageCleanupJobStatus, Prisma } from "@prisma/client";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService, type TenantPrismaClient } from "../database/prisma.service";
import { AsyncOutboxService } from "../queue/async-outbox.service";
import { documentCleanupRoutingKey } from "../queue/queue.constants";
import { shouldUseRabbitMq } from "../queue/rabbitmq.service";
import { ObjectStorageService } from "../storage/object-storage.service";
import type {
  BulkDeleteDocumentsInput,
  BulkMoveDocumentsInput,
  CreateDocumentImportJobInput,
  CreateDocumentFolderInput,
  CreateDocumentInput,
  DocumentMimeGroup,
  ListDocumentsQuery,
  UploadDocumentImportItemsInput,
  UpdateDocumentFolderInput,
  UpdateDocumentInput,
  ReplaceDocumentInput
} from "./documents.schemas";

export type UploadedDocumentFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type DocumentContextInput = (CreateDocumentInput | UpdateDocumentInput) & { caseId?: string | null };

type CleanupReason =
  | "bulk_deleted"
  | "case_deleted"
  | "document_deleted"
  | "folder_deleted"
  | "metadata_create_failed"
  | "document_replaced";

const allowedDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);

const previewableDocumentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const mimeGroups: Record<DocumentMimeGroup, string[]> = {
  excel: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  image: ["image/jpeg", "image/png", "image/webp"],
  pdf: ["application/pdf"],
  powerpoint: [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ],
  word: [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
};

const duplicateDocumentMessage = "Este archivo ya fue cargado en la carpeta seleccionada.";
const duplicateDocumentIndexName = "documents_tenant_folder_checksum_active_key";
const duplicateFolderIndexName = "document_folders_tenant_parent_name_key";
const systemClientUuidFolderNote = "system:case-library:client-uuid";
const systemClientNameFolderNote = "system:case-library:client-name";
const systemCaseUuidFolderNote = "system:case-library:case-uuid";
const systemCaseNameFolderNote = "system:case-library:case-name";
const cleanupIntervalMs = 30_000;
const cleanupProcessingTimeoutMs = 10 * 60_000;
const maxCleanupAttempts = 5;

export const maxDocumentSizeBytes = 25 * 1024 * 1024;

@Injectable()
export class DocumentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentsService.name);
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isCleanupRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: AsyncOutboxService,
    private readonly storage: ObjectStorageService
  ) {}

  onModuleInit() {
    if (process.env.DOCUMENT_CLEANUP_SCHEDULER_ENABLED === "false") {
      this.logger.log("Document storage cleanup scheduler disabled.");
      return;
    }

    this.scheduleNextCleanupRun(1_000);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async list(tenantId: string, query: ListDocumentsQuery) {
    const folderId = normalizeNullableUuid(query.folderId);
    const cursor = decodeDocumentsCursor(query.cursor);

    if (folderId) {
      await this.findTenantFolderOrThrow(tenantId, folderId);
    }
    const selectedMimeGroups = getSelectedMimeGroups(query);

    const andFilters: Prisma.DocumentWhereInput[] = [
      ...(query.search
        ? [
            {
              OR: [
                { title: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { originalName: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { notes: { contains: query.search, mode: Prisma.QueryMode.insensitive } }
              ]
            }
          ]
        : []),
      ...(cursor ? [{ OR: getDocumentsCursorWhere(cursor) }] : [])
    ];

    const where: Prisma.DocumentWhereInput = {
      deletedAt: null,
      status: "active",
      tenantId,
      folderId,
      scope: DocumentScope.library,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(selectedMimeGroups.length
        ? { mimeType: { in: selectedMimeGroups.flatMap((group) => mimeGroups[group]) } }
        : {}),
      ...(andFilters.length ? { AND: andFilters } : {})
    };

    const [folders, documents, metrics, breadcrumbs] = await Promise.all([
      query.search || query.categoryId || selectedMimeGroups.length
        ? Promise.resolve([])
        : this.listVisibleChildFolders(tenantId, folderId),
      this.prisma.document.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: documentSelect,
        take: query.limit + 1,
        where
      }),
      this.getMetrics(tenantId),
      folderId ? this.getBreadcrumbs(tenantId, folderId) : Promise.resolve([])
    ]);

    const pageItems = documents.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = documents.length > query.limit;

    return {
      breadcrumbs: breadcrumbs.filter(isVisibleDocumentFolder).map(toDocumentFolderDto),
      documents: pageItems.map(toDocumentDto),
      folders: folders.map(toDocumentFolderDto),
      metrics,
      pageInfo: {
        hasNextPage,
        limit: query.limit,
        nextCursor:
          hasNextPage && lastItem
            ? encodeDocumentsCursor({ createdAt: lastItem.createdAt, id: lastItem.id })
            : null,
        total: pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async listCategories(
    tenantId: string,
    query: { active?: boolean; cursor?: string; limit: number }
  ) {
    const cursor = decodeCategoriesCursor(query.cursor);
    const categories = await this.prisma.documentCategory.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      select: documentCategorySelect,
      take: query.limit + 1,
      where: {
        tenantId,
        ...(query.active === undefined ? {} : { active: query.active }),
        ...(cursor ? { OR: getCategoriesCursorWhere(cursor) } : {})
      }
    });
    const pageItems = categories.slice(0, query.limit);
    const lastItem = pageItems.at(-1);
    const hasNextPage = categories.length > query.limit;

    return {
      items: pageItems.map(toDocumentCategoryDto),
      pageInfo: {
        hasNextPage,
        limit: query.limit,
        nextCursor:
          hasNextPage && lastItem
            ? encodeCategoriesCursor({
                displayOrder: lastItem.displayOrder,
                id: lastItem.id,
                name: lastItem.name
              })
            : null,
        offset: 0,
        total: pageItems.length + (hasNextPage ? 1 : 0)
      }
    };
  }

  async listFolders(tenantId: string) {
    const folders = await this.prisma.documentFolder.findMany({
      orderBy: [{ parentId: "asc" }, { name: "asc" }, { id: "asc" }],
      select: documentFolderSelect,
      where: {
        scope: DocumentScope.library,
        tenantId
      }
    });

    return folders.map(toDocumentFolderDto);
  }

  async createFolder(tenantId: string, input: CreateDocumentFolderInput) {
    try {
      return await this.prisma.runWithTenant(tenantId, async (tx) => {
        await lockTenant(tx, tenantId);
        const parentId = normalizeNullableUuid(input.parentId);
        if (parentId) {
          await this.findTenantFolderOrThrow(tenantId, parentId, tx, DocumentScope.library);
        }

        const folder = await tx.documentFolder.create({
          data: { name: input.name, notes: input.notes ?? null, parentId, scope: DocumentScope.library, tenantId },
          select: documentFolderSelect
        });

        return toDocumentFolderDto(folder);
      });
    } catch (error) {
      handleFolderWriteError(error);
      throw error;
    }
  }

  async updateFolder(tenantId: string, folderId: string, input: UpdateDocumentFolderInput) {
    try {
      return await this.prisma.runWithTenant(tenantId, async (tx) => {
        await lockTenant(tx, tenantId);
        await this.findTenantFolderOrThrow(tenantId, folderId, tx, DocumentScope.library);
        const parentId = "parentId" in input ? normalizeNullableUuid(input.parentId) : undefined;

        if (parentId !== undefined) {
          if (parentId === folderId) {
            throw new BadRequestException("La carpeta no puede moverse dentro de si misma.");
          }
          if (parentId) {
            await this.findTenantFolderOrThrow(tenantId, parentId, tx, DocumentScope.library);
            await assertFolderMoveDoesNotCreateCycle(tx, tenantId, folderId, parentId);
          }
        }

        const folder = await tx.documentFolder.update({
          data: {
            ...(input.name ? { name: input.name } : {}),
            ...(Object.prototype.hasOwnProperty.call(input, "notes")
              ? { notes: input.notes ?? null }
              : {}),
            ...(parentId !== undefined ? { parentId } : {})
          },
          select: documentFolderSelect,
          where: { id: folderId }
        });

        return toDocumentFolderDto(folder);
      });
    } catch (error) {
      handleFolderWriteError(error);
      throw error;
    }
  }

  async deleteFolder(tenantId: string, folderId: string) {
    await this.deleteFoldersAndDocuments(tenantId, { documentIds: [], folderIds: [folderId] }, DocumentScope.library);
    return { status: "ok" as const };
  }

  async create(
    tenantId: string,
    uploadedByUserId: string,
    input: CreateDocumentInput & { caseId?: string },
    file?: UploadedDocumentFile
  ) {
    if (!file) {
      throw new BadRequestException("Selecciona un documento para subir.");
    }

    validateDocumentFile(file);
    const normalizedInput = await this.validateDocumentContext(tenantId, uploadedByUserId, input);
    const documentId = randomUUID();
    const objectKey = buildDocumentObjectKey({
      documentId,
      folderId: normalizedInput.folderId,
      originalName: file.originalname,
      tenantId
    });
    const checksum = createHash("sha256").update(file.buffer).digest("hex");

    await this.storage.putObject({
      body: file.buffer,
      contentLength: file.size,
      contentType: file.mimetype,
      key: objectKey
    });

    try {
      const document = await this.prisma.runWithTenant(tenantId, async (tx) => {
        const existingDocument = await tx.document.findFirst({
          select: { id: true },
          where: {
            checksum,
            deletedAt: null,
            folderId: normalizedInput.folderId,
            status: "active",
            tenantId
          }
        });

        if (existingDocument) {
          throw new ConflictException(duplicateDocumentMessage);
        }

        return tx.document.create({
          data: {
            bucket: this.storage.getBucket(),
            caseId: normalizedInput.caseId,
            categoryId: normalizedInput.categoryId,
            checksum,
            extension: getFileExtension(file.originalname),
            folderId: normalizedInput.folderId,
            id: documentId,
            mimeType: file.mimetype,
            notes: normalizedInput.notes,
            objectKey,
            originalName: file.originalname,
            sizeBytes: file.size,
            storageProvider: this.storage.getProvider(),
            scope: normalizedInput.caseId ? DocumentScope.case : DocumentScope.library,
            tenantId,
            title: file.originalname,
            uploadedByUserId
          },
          select: documentSelect
        });
      });

      return toDocumentDto(document);
    } catch (error) {
      await this.deleteUploadedObjectOrEnqueueCleanup({
        bucket: this.storage.getBucket(),
        objectKey,
        reason: "metadata_create_failed",
        storageProvider: this.storage.getProvider(),
        tenantId
      });
      if (isUniqueConstraintError(error, duplicateDocumentIndexName)) {
        throw new ConflictException(duplicateDocumentMessage);
      }
      throw error;
    }
  }

  async update(tenantId: string, documentId: string, input: UpdateDocumentInput) {
    const document = await this.prisma.runWithTenant(tenantId, async (tx) => {
      await lockDocuments(tx, tenantId, [documentId]);
      await this.findTenantDocumentOrThrow(tenantId, documentId, tx, undefined, DocumentScope.library);
      const normalizedInput = await this.validateDocumentContext(tenantId, undefined, input, tx);

      return tx.document.update({
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(Object.prototype.hasOwnProperty.call(input, "folderId")
            ? { folderId: normalizedInput.folderId }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(input, "categoryId")
            ? { categoryId: normalizedInput.categoryId }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(input, "notes")
            ? { notes: normalizedInput.notes }
            : {})
        },
        select: documentSelect,
        where: { id: documentId }
      });
    });

    return toDocumentDto(document);
  }

  async replace(
    tenantId: string,
    documentId: string,
    input: ReplaceDocumentInput,
    file?: UploadedDocumentFile
  ) {
    if (!file) {
      throw new BadRequestException("Selecciona un documento para reemplazar.");
    }
    validateDocumentFile(file);
    const objectKey = buildDocumentObjectKey({
      documentId: randomUUID(),
      folderId: null,
      originalName: file.originalname,
      tenantId
    });
    await this.storage.putObject({
      body: file.buffer,
      contentLength: file.size,
      contentType: file.mimetype,
      key: objectKey
    });
    try {
      const document = await this.prisma.runWithTenant(tenantId, async (tx) => {
        await lockDocuments(tx, tenantId, [documentId]);
        const previous = await this.findTenantDocumentOrThrow(
          tenantId,
          documentId,
          tx,
          undefined,
          DocumentScope.library
        );
        const updated = await tx.document.update({
          data: {
            bucket: this.storage.getBucket(),
            checksum: createHash("sha256").update(file.buffer).digest("hex"),
            extension: getFileExtension(file.originalname),
            mimeType: file.mimetype,
            objectKey,
            originalName: file.originalname,
            sizeBytes: file.size,
            storageProvider: this.storage.getProvider(),
            ...(input.title ? { title: input.title } : {})
          },
          select: documentSelect,
          where: { id: documentId }
        });
        await enqueueCleanupJob(tx, this.outbox, {
          bucket: previous.bucket,
          documentId,
          objectKey: previous.objectKey,
          reason: "document_replaced",
          storageProvider: previous.storageProvider,
          tenantId
        });
        return updated;
      });
      return toDocumentDto(document);
    } catch (error) {
      await this.deleteUploadedObjectOrEnqueueCleanup({
        bucket: this.storage.getBucket(),
        objectKey,
        reason: "metadata_create_failed",
        storageProvider: this.storage.getProvider(),
        tenantId
      });
      throw error;
    }
  }

  async readObject(tenantId: string, documentId: string, caseId?: string) {
    const document = await this.findTenantDocumentOrThrow(
      tenantId,
      documentId,
      this.prisma,
      caseId,
      caseId ? DocumentScope.case : DocumentScope.library
    );
    const object = await this.storage.getObject(document.objectKey);

    return {
      document: toDocumentDto(document),
      object
    };
  }

  async delete(tenantId: string, documentId: string) {
    await this.deleteFoldersAndDocuments(tenantId, { documentIds: [documentId], folderIds: [] }, DocumentScope.library);
    if (shouldProcessCleanupInline()) {
      await this.processDueCleanupJobs(1);
    }
    return { status: "ok" as const };
  }

  async bulkDelete(tenantId: string, input: BulkDeleteDocumentsInput) {
    await this.deleteFoldersAndDocuments(tenantId, input, DocumentScope.library);
    if (shouldProcessCleanupInline()) {
      await this.processDueCleanupJobs(3);
    }
    return { status: "ok" as const };
  }

  async bulkMove(tenantId: string, input: BulkMoveDocumentsInput) {
    const folderId = normalizeNullableUuid(input.folderId);
    await this.prisma.runWithTenant(tenantId, async (tx) => {
      await lockDocuments(tx, tenantId, input.documentIds);
      const locked = await tx.document.findMany({
        select: { id: true },
        where: {
          deletedAt: null,
          id: { in: input.documentIds },
          status: "active",
          scope: DocumentScope.library,
          tenantId
        }
      });
      if (locked.length !== new Set(input.documentIds).size) {
        throw new NotFoundException("Uno o mas documentos no existen en el estudio activo.");
      }
      if (folderId) {
        await this.findTenantFolderOrThrow(tenantId, folderId, tx, DocumentScope.library);
      }

      await tx.document.updateMany({
        data: { folderId },
        where: { id: { in: input.documentIds }, scope: DocumentScope.library, tenantId }
      });
    });

    return { status: "ok" as const };
  }

  async createImportJob(
    tenantId: string,
    createdByUserId: string,
    input: CreateDocumentImportJobInput
  ) {
    const folderId = normalizeNullableUuid(input.folderId);

    const job = await this.prisma.runWithTenant(tenantId, async (tx) => {
      if (folderId) {
        await this.findTenantFolderOrThrow(tenantId, folderId, tx, DocumentScope.library);
      }
      await this.findTenantMembershipOrThrow(tenantId, createdByUserId, tx);

      return tx.documentImportJob.create({
        data: {
          createdByUserId,
          rootFolderId: folderId,
          tenantId,
          totalBytes: input.totalBytes,
          totalFiles: input.totalFiles
        },
        select: documentImportJobSelect
      });
    });

    return toDocumentImportJobDto(job);
  }

  async getImportJob(tenantId: string, importJobId: string) {
    const job = await this.findTenantImportJobOrThrow(tenantId, importJobId);
    return toDocumentImportJobDto(job);
  }

  async cancelImportJob(tenantId: string, importJobId: string) {
    const job = await this.prisma.runWithTenant(tenantId, async (tx) => {
      await lockTenant(tx, tenantId);
      await this.findTenantImportJobOrThrow(tenantId, importJobId, tx);
      await tx.documentImportItem.updateMany({
        data: { status: "canceled" },
        where: { importJobId, status: "processing", tenantId }
      });

      return tx.documentImportJob.update({
        data: {
          canceledAt: new Date(),
          status: "canceled"
        },
        select: documentImportJobSelect,
        where: { id: importJobId }
      });
    });

    return toDocumentImportJobDto(job);
  }

  async uploadImportItems(
    tenantId: string,
    importJobId: string,
    input: UploadDocumentImportItemsInput,
    files: UploadedDocumentFile[] = []
  ) {
    const relativePaths = normalizeImportRelativePaths(input.relativePaths);
    if (files.length !== relativePaths.length) {
      throw new BadRequestException("La cantidad de archivos no coincide con sus rutas relativas.");
    }
    if (files.length > 50) {
      throw new BadRequestException("No se pueden procesar mas de 50 archivos por lote.");
    }

    const job = await this.findTenantImportJobOrThrow(tenantId, importJobId);
    if (isTerminalImportStatus(job.status)) {
      throw new BadRequestException("La importacion ya finalizo o fue cancelada.");
    }

    await this.prisma.runWithTenant(tenantId, async (tx) => {
      await tx.documentImportJob.update({
        data: { startedAt: job.startedAt ?? new Date(), status: "processing" },
        where: { id: importJobId }
      });
    });

    for (const [index, file] of files.entries()) {
      const currentJob = await this.findTenantImportJobOrThrow(tenantId, importJobId);
      if (currentJob.status === "canceled") {
        break;
      }
      await this.processImportFile(
        tenantId,
        currentJob,
        relativePaths[index] ?? file.originalname,
        file
      );
    }

    const updatedJob = await this.refreshImportJobProgress(
      tenantId,
      importJobId,
      input.isFinalBatch
    );
    return toDocumentImportJobDto(updatedJob);
  }

  async listCaseDocuments(
    tenantId: string,
    caseId: string,
    query: { categoryId?: string; cursor?: string; limit: number }
  ) {
    await this.findTenantCaseOrThrow(tenantId, caseId);
    const documents = await this.prisma.document.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: documentSelect,
      take: query.limit + 1,
      where: {
        caseId,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        deletedAt: null,
        scope: DocumentScope.case,
        status: "active",
        tenantId
      }
    });
    const items = documents.slice(0, query.limit);
    const lastItem = items.at(-1);
    return {
      items: items.map(toCaseDocumentDto),
      pageInfo: {
        hasNextPage: documents.length > query.limit,
        limit: query.limit,
        nextCursor: lastItem ? encodeDocumentsCursor({ createdAt: lastItem.createdAt, id: lastItem.id }) : null,
        offset: 0,
        total: items.length
      }
    };
  }

  async createCaseDocument(
    tenantId: string,
    caseId: string,
    uploadedByUserId: string,
    input: { categoryId?: string; notes?: string },
    file?: UploadedDocumentFile
  ) {
    if (!file) {
      throw new BadRequestException("Selecciona un documento para subir.");
    }

    return this.create(tenantId, uploadedByUserId, { ...input, caseId }, file).then(
      toCaseDocumentDto
    );
  }

  async readCaseDocumentObject(tenantId: string, caseId: string, documentId: string) {
    return this.readObject(tenantId, documentId, caseId).then(({ document, object }) => ({
      document: toCaseDocumentDto(document),
      object
    }));
  }

  async deleteCaseDocument(tenantId: string, caseId: string, documentId: string) {
    await this.findTenantDocumentOrThrow(tenantId, documentId, this.prisma, caseId, DocumentScope.case);
    await this.deleteFoldersAndDocuments(tenantId, { documentIds: [documentId], folderIds: [] }, DocumentScope.case);
    return { status: "ok" as const };
  }

  async enqueueCleanupForCaseDeletion(
    tx: Prisma.TransactionClient,
    tenantId: string,
    caseId: string
  ) {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    const documents = await tx.document.findMany({
      select: { bucket: true, id: true, objectKey: true, storageProvider: true },
      where: { caseId, scope: DocumentScope.case, tenantId }
    });

    for (const document of documents) {
      await enqueueCleanupJob(tx, this.outbox, {
        bucket: document.bucket,
        objectKey: document.objectKey,
        reason: "case_deleted",
        storageProvider: document.storageProvider,
        tenantId
      });
    }

    return { enqueued: documents.length };
  }

  async processDueCleanupJobs(limit = 10) {
    if (this.isCleanupRunning) {
      return { processed: 0 };
    }

    this.isCleanupRunning = true;
    try {
      await this.recoverStaleCleanupJobs();
      const jobs = await this.claimDueCleanupJobs(limit);

      for (const job of jobs) {
        await this.processCleanupJob(job.id);
      }

      return { processed: jobs.length };
    } finally {
      this.isCleanupRunning = false;
    }
  }

  async processCleanupJobMessage(input: { jobId: string; nextRunAt: string; tenantId: string }) {
    const expectedNextRunAt = new Date(input.nextRunAt);
    if (Number.isNaN(expectedNextRunAt.getTime())) {
      throw new BadRequestException("La fecha del mensaje de limpieza no es valida.");
    }

    const claimed = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;
      return tx.documentStorageCleanupJob.updateMany({
        data: {
          status: "processing",
          updatedAt: new Date()
        },
        where: {
          AND: [{ nextRunAt: expectedNextRunAt }, { nextRunAt: { lte: new Date() } }],
          id: input.jobId,
          status: { in: ["pending", "failed"] },
          tenantId: input.tenantId
        }
      });
    });

    if (claimed.count === 0) {
      return { processed: false };
    }

    await this.processCleanupJob(input.jobId);
    return { processed: true };
  }

  private async getMetrics(tenantId: string) {
    const [folders, documents, storage] = await Promise.all([
      this.prisma.documentFolder.count({ where: { scope: DocumentScope.library, tenantId } }),
      this.prisma.document.count({ where: { deletedAt: null, scope: DocumentScope.library, status: "active", tenantId } }),
      this.prisma.document.aggregate({
        _sum: { sizeBytes: true },
        where: { deletedAt: null, scope: DocumentScope.library, status: "active", tenantId }
      })
    ]);

    return { documents, folders, storageBytes: storage._sum.sizeBytes ?? 0 };
  }

  private async validateDocumentContext(
    tenantId: string,
    uploadedByUserId: string | undefined,
    input: DocumentContextInput,
    tx: TenantPrismaClient | PrismaService = this.prisma
  ) {
    const folderId = normalizeNullableUuid(input.folderId);
    const caseId = normalizeNullableUuid(input.caseId);
    const categoryId = normalizeNullableUuid(input.categoryId);
    const notes = normalizeOptionalString(
      input.notes,
      500,
      "Las notas no pueden superar 500 caracteres."
    );

    const [folder, caseItem, category, membership] = await Promise.all([
      folderId
        ? tx.documentFolder.findFirst({ select: { id: true }, where: { id: folderId, tenantId } })
        : Promise.resolve(null),
      caseId
        ? tx.case.findFirst({ select: { id: true }, where: { id: caseId, tenantId } })
        : Promise.resolve(null),
      categoryId
        ? tx.documentCategory.findFirst({
            select: { id: true },
            where: { active: true, id: categoryId, tenantId }
          })
        : Promise.resolve(null),
      uploadedByUserId
        ? tx.tenantMembership.findFirst({
            select: { id: true },
            where: { status: "active", tenantId, userId: uploadedByUserId }
          })
        : Promise.resolve({ id: "skip" })
    ]);

    if (folderId && !folder) {
      throw new BadRequestException("La carpeta seleccionada no pertenece al estudio activo.");
    }
    if (caseId && !caseItem) {
      throw new BadRequestException("El expediente seleccionado no pertenece al estudio activo.");
    }
    if (categoryId && !category) {
      throw new BadRequestException("La categoria seleccionada no pertenece al estudio activo.");
    }
    if (!membership) {
      throw new BadRequestException("El usuario no tiene una membresia activa en el estudio.");
    }

    return { caseId, categoryId, folderId, notes };
  }

  private async findTenantMembershipOrThrow(
    tenantId: string,
    userId: string,
    tx: TenantPrismaClient | PrismaService = this.prisma
  ) {
    const membership = await tx.tenantMembership.findFirst({
      select: { id: true },
      where: { status: "active", tenantId, userId }
    });
    if (!membership) {
      throw new BadRequestException("El usuario no tiene una membresia activa en el estudio.");
    }
    return membership;
  }

  private async ensureCaseDocumentLibraryFolder(tenantId: string, caseId: string) {
    return this.prisma.runWithTenant(tenantId, async (tx) => {
      await lockTenant(tx, tenantId);
      const caseItem = await tx.case.findFirst({
        select: {
          caption: true,
          caseNumber: true,
          id: true,
          primaryClient: {
            select: {
              businessName: true,
              firstName: true,
              id: true,
              lastName: true,
              type: true
            }
          }
        },
        where: { id: caseId, tenantId }
      });

      if (!caseItem) {
        throw new BadRequestException("El expediente seleccionado no pertenece al estudio activo.");
      }
      if (!caseItem.primaryClient) {
        throw new BadRequestException(
          "El expediente debe tener un cliente principal para subir documentos."
        );
      }

      const clientUuidFolderId = await ensureSystemDocumentFolder(tx, tenantId, {
        name: caseItem.primaryClient.id,
        notes: systemClientUuidFolderNote,
        parentId: null
      });
      const clientNameFolderId = await ensureSystemDocumentFolder(tx, tenantId, {
        name: getClientDisplayName(caseItem.primaryClient),
        notes: systemClientNameFolderNote,
        parentId: clientUuidFolderId
      });
      const caseUuidFolderId = await ensureSystemDocumentFolder(tx, tenantId, {
        name: caseItem.id,
        notes: systemCaseUuidFolderNote,
        parentId: clientNameFolderId
      });

      return ensureSystemDocumentFolder(tx, tenantId, {
        name: getCaseDisplayFolderName(caseItem),
        notes: systemCaseNameFolderNote,
        parentId: caseUuidFolderId
      });
    });
  }

  private async listVisibleChildFolders(tenantId: string, folderId: string | null) {
    const directFolders = await this.prisma.documentFolder.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: documentFolderSelect,
      where: { parentId: folderId, scope: DocumentScope.library, tenantId }
    });
    const technicalFolders = directFolders.filter(isTechnicalDocumentFolder);
    const visibleDirectFolders = directFolders.filter(isVisibleDocumentFolder);

    if (!technicalFolders.length) {
      return visibleDirectFolders;
    }

    const visibleNestedFolders = await this.prisma.documentFolder.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: documentFolderSelect,
      where: {
        NOT: { notes: { in: [systemClientUuidFolderNote, systemCaseUuidFolderNote] } },
        parentId: { in: technicalFolders.map((folder) => folder.id) },
        tenantId
      }
    });

    return [...visibleDirectFolders, ...visibleNestedFolders].sort(compareDocumentFoldersByName);
  }

  private async deleteFoldersAndDocuments(
    tenantId: string,
    input: BulkDeleteDocumentsInput,
    scope: DocumentScope
  ) {
    if (input.documentIds.length === 0 && input.folderIds.length === 0) {
      return;
    }

    await this.prisma.runWithTenant(tenantId, async (tx) => {
      await lockTenant(tx, tenantId);
      const documentIds = [...new Set(input.documentIds)];
      const folderIds = [...new Set(input.folderIds)];
      const descendantFolderIds = folderIds.length
        ? await getDescendantFolderIds(tx, tenantId, folderIds)
        : [];
      const allFolderIds = [...new Set([...folderIds, ...descendantFolderIds])];
      const allFolderIdSet = new Set(allFolderIds);

      if (folderIds.length && folderIds.some((id) => !allFolderIdSet.has(id))) {
        throw new NotFoundException("Una o mas carpetas no existen en el estudio activo.");
      }
      if (folderIds.length) {
        const scopedFolderCount = await tx.documentFolder.count({
          where: { id: { in: folderIds }, scope, tenantId }
        });
        if (scopedFolderCount !== folderIds.length) {
          throw new NotFoundException("Una o mas carpetas no existen en la biblioteca.");
        }
      }

      if (allFolderIds.length) {
        await lockFolders(tx, tenantId, allFolderIds);
      }
      if (documentIds.length) {
        await lockDocuments(tx, tenantId, documentIds);
      }

      const documents = await tx.document.findMany({
        select: {
          bucket: true,
          id: true,
          objectKey: true,
          storageProvider: true
        },
        where: {
          deletedAt: null,
          status: "active",
          scope,
          tenantId,
          OR: [
            ...(documentIds.length ? [{ id: { in: documentIds } }] : []),
            ...(allFolderIds.length ? [{ folderId: { in: allFolderIds } }] : [])
          ]
        }
      });
      const deletingDocumentIds = documents.map((document) => document.id);

      if (documentIds.length) {
        const foundIds = new Set(documents.map((document) => document.id));
        if (documentIds.some((id) => !foundIds.has(id))) {
          throw new NotFoundException("Uno o mas documentos no existen en el estudio activo.");
        }
      }

      for (const document of documents) {
        await enqueueCleanupJob(tx, this.outbox, {
          bucket: document.bucket,
          documentId: document.id,
          objectKey: document.objectKey,
          reason: allFolderIds.length ? "folder_deleted" : "document_deleted",
          storageProvider: document.storageProvider,
          tenantId
        });
      }

      if (deletingDocumentIds.length) {
        await tx.documentImportItem.updateMany({
          data: { documentId: null },
          where: { documentId: { in: deletingDocumentIds }, tenantId }
        });
      }
      if (allFolderIds.length) {
        await tx.documentImportItem.updateMany({
          data: { folderId: null },
          where: { folderId: { in: allFolderIds }, tenantId }
        });
        await tx.documentImportJob.updateMany({
          data: { rootFolderId: null },
          where: { rootFolderId: { in: allFolderIds }, tenantId }
        });
      }
      if (documents.length) {
        await tx.document.updateMany({
          data: { deletedAt: new Date(), folderId: null, status: "deleting" },
          where: { id: { in: deletingDocumentIds }, tenantId }
        });
      }
      if (allFolderIds.length) {
        await tx.documentFolder.deleteMany({ where: { id: { in: allFolderIds }, scope, tenantId } });
      }
    });
  }

  private async findTenantFolderOrThrow(
    tenantId: string,
    folderId: string,
    tx: TenantPrismaClient | PrismaService = this.prisma,
    scope: DocumentScope = DocumentScope.library
  ) {
    const folder = await tx.documentFolder.findFirst({
      select: documentFolderSelect,
      where: { id: folderId, scope, tenantId }
    });
    if (!folder) {
      throw new NotFoundException("La carpeta no existe en el estudio activo.");
    }

    return folder;
  }

  private async findTenantCaseOrThrow(tenantId: string, caseId: string) {
    const caseItem = await this.prisma.case.findFirst({
      select: { id: true },
      where: { id: caseId, tenantId }
    });
    if (!caseItem) {
      throw new NotFoundException("El expediente no existe en el estudio activo.");
    }

    return caseItem;
  }

  private async findTenantDocumentOrThrow(
    tenantId: string,
    documentId: string,
    tx: TenantPrismaClient | PrismaService = this.prisma,
    caseId?: string,
    scope?: DocumentScope
  ) {
    const document = await tx.document.findFirst({
      select: documentWithObjectSelect,
      where: {
        deletedAt: null,
        id: documentId,
        status: "active",
        tenantId,
        ...(scope ? { scope } : {}),
        ...(caseId ? { caseId } : {})
      }
    });
    if (!document) {
      throw new NotFoundException("El documento no existe en el estudio activo.");
    }

    return document;
  }

  private async findTenantImportJobOrThrow(
    tenantId: string,
    importJobId: string,
    tx: TenantPrismaClient | PrismaService = this.prisma
  ) {
    const job = await tx.documentImportJob.findFirst({
      select: documentImportJobSelect,
      where: { id: importJobId, tenantId }
    });
    if (!job) {
      throw new NotFoundException("La importacion no existe en el estudio activo.");
    }

    return job;
  }

  private async processImportFile(
    tenantId: string,
    job: DocumentImportJobWithSelect,
    rawRelativePath: string,
    file: UploadedDocumentFile
  ) {
    const relativePath = normalizeImportRelativePath(rawRelativePath, file.originalname);
    let checksum: string | undefined;

    try {
      validateDocumentFile(file);
      checksum = createHash("sha256").update(file.buffer).digest("hex");
    } catch (error) {
      await this.upsertImportItem(tenantId, job.id, {
        error: getImportErrorMessage(error),
        file,
        relativePath,
        status: "rejected"
      });
      return;
    }

    const prepared = await this.prepareImportDestination(
      tenantId,
      job,
      relativePath,
      file,
      checksum
    );
    if (prepared.status !== "ready") {
      return;
    }

    const documentId = randomUUID();
    const objectKey = buildDocumentObjectKey({
      documentId,
      folderId: prepared.folderId,
      originalName: file.originalname,
      tenantId
    });

    try {
      await this.storage.putObject({
        body: file.buffer,
        contentLength: file.size,
        contentType: file.mimetype,
        key: objectKey
      });

      await this.prisma.runWithTenant(tenantId, async (tx) => {
        await lockTenant(tx, tenantId);
        await tx.document.create({
          data: {
            bucket: this.storage.getBucket(),
            checksum,
            extension: getFileExtension(file.originalname),
            folderId: prepared.folderId,
            id: documentId,
            mimeType: file.mimetype,
            objectKey,
            originalName: file.originalname,
            sizeBytes: file.size,
            storageProvider: this.storage.getProvider(),
            tenantId,
            title: file.originalname,
            uploadedByUserId: job.createdByUserId
          }
        });
        await this.upsertImportItem(tenantId, job.id, {
          checksum,
          documentId,
          file,
          folderId: prepared.folderId,
          relativePath,
          status: "completed",
          tx
        });
      });
    } catch (error) {
      await this.deleteUploadedObjectOrEnqueueCleanup({
        bucket: this.storage.getBucket(),
        objectKey,
        reason: "metadata_create_failed",
        storageProvider: this.storage.getProvider(),
        tenantId
      });
      if (isUniqueConstraintError(error, duplicateDocumentIndexName)) {
        await this.upsertImportItem(tenantId, job.id, {
          checksum,
          error: duplicateDocumentMessage,
          file,
          folderId: prepared.folderId,
          relativePath,
          status: "skipped_duplicate"
        });
        return;
      }
      await this.upsertImportItem(tenantId, job.id, {
        checksum,
        error: getImportErrorMessage(error),
        file,
        folderId: null,
        relativePath,
        status: "failed"
      });
    }
  }

  private async prepareImportDestination(
    tenantId: string,
    job: DocumentImportJobWithSelect,
    relativePath: string,
    file: UploadedDocumentFile,
    checksum: string
  ) {
    return this.prisma.runWithTenant(tenantId, async (tx) => {
      await lockTenant(tx, tenantId);
      const currentJob = await this.findTenantImportJobOrThrow(tenantId, job.id, tx);
      if (currentJob.status === "canceled") {
        await this.upsertImportItem(tenantId, job.id, {
          checksum,
          error: "Importacion cancelada.",
          file,
          relativePath,
          status: "canceled",
          tx
        });
        return { status: "canceled" as const };
      }

      const folderId = await ensureImportFolderPath(tx, tenantId, job.rootFolderId, relativePath);
      const duplicate = await tx.document.findFirst({
        select: { id: true },
        where: {
          checksum,
          deletedAt: null,
          folderId,
          status: "active",
          tenantId
        }
      });

      if (duplicate) {
        await this.upsertImportItem(tenantId, job.id, {
          checksum,
          documentId: duplicate.id,
          error: duplicateDocumentMessage,
          file,
          folderId,
          relativePath,
          status: "skipped_duplicate",
          tx
        });
        return { folderId, status: "skipped_duplicate" as const };
      }

      await this.upsertImportItem(tenantId, job.id, {
        checksum,
        file,
        folderId,
        relativePath,
        status: "processing",
        tx
      });

      return { folderId, status: "ready" as const };
    });
  }

  private async upsertImportItem(
    tenantId: string,
    importJobId: string,
    input: {
      checksum?: string;
      documentId?: string;
      error?: string;
      file: UploadedDocumentFile;
      folderId?: string | null;
      relativePath: string;
      status: "processing" | "completed" | "skipped_duplicate" | "rejected" | "failed" | "canceled";
      tx?: TenantPrismaClient;
    }
  ) {
    const prisma = input.tx ?? this.prisma;
    await prisma.documentImportItem.upsert({
      create: {
        checksum: input.checksum,
        documentId: input.documentId,
        error: input.error,
        folderId: input.folderId,
        importJobId,
        mimeType: input.file.mimetype,
        originalName: input.file.originalname,
        relativePath: input.relativePath,
        sizeBytes: input.file.size,
        status: input.status,
        tenantId
      },
      update: {
        checksum: input.checksum,
        documentId: input.documentId,
        error: input.error ?? null,
        folderId: input.folderId,
        mimeType: input.file.mimetype,
        originalName: input.file.originalname,
        sizeBytes: input.file.size,
        status: input.status
      },
      where: {
        tenantId_importJobId_relativePath: {
          importJobId,
          relativePath: input.relativePath,
          tenantId
        }
      }
    });
  }

  private async refreshImportJobProgress(
    tenantId: string,
    importJobId: string,
    isFinalBatch: boolean
  ) {
    return this.prisma.runWithTenant(tenantId, async (tx) => {
      const job = await this.findTenantImportJobOrThrow(tenantId, importJobId, tx);
      const counts = await tx.documentImportItem.groupBy({
        _count: { _all: true },
        by: ["status"],
        where: { importJobId, tenantId }
      });
      const countByStatus = new Map(counts.map((item) => [item.status, item._count._all]));
      const completedFiles = countByStatus.get("completed") ?? 0;
      const skippedFiles = countByStatus.get("skipped_duplicate") ?? 0;
      const rejectedFiles = countByStatus.get("rejected") ?? 0;
      const failedFiles = countByStatus.get("failed") ?? 0;
      const canceledFiles = countByStatus.get("canceled") ?? 0;
      const processedFiles =
        completedFiles + skippedFiles + rejectedFiles + failedFiles + canceledFiles;
      const shouldFinalize =
        isFinalBatch || (job.totalFiles > 0 && processedFiles >= job.totalFiles);
      const nextStatus = shouldFinalize
        ? failedFiles + rejectedFiles > 0
          ? "partial_failed"
          : "completed"
        : "processing";

      return tx.documentImportJob.update({
        data: {
          completedAt: shouldFinalize ? new Date() : null,
          completedFiles,
          failedFiles,
          lastError:
            failedFiles + rejectedFiles > 0 ? "Algunos archivos no pudieron importarse." : null,
          processedFiles,
          rejectedFiles,
          skippedFiles,
          status: job.status === "canceled" ? "canceled" : nextStatus
        },
        select: documentImportJobSelect,
        where: { id: importJobId }
      });
    });
  }

  private async getBreadcrumbs(tenantId: string, folderId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        createdAt: Date;
        id: string;
        name: string;
        notes: string | null;
        parentId: string | null;
        updatedAt: Date;
      }>
    >`
      WITH RECURSIVE crumbs AS (
        SELECT "id", "parent_id" AS "parentId", "name", "notes", "created_at" AS "createdAt", "updated_at" AS "updatedAt", 0 AS depth
        FROM "document_folders"
        WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${folderId}::uuid
        UNION ALL
        SELECT f."id", f."parent_id" AS "parentId", f."name", f."notes", f."created_at" AS "createdAt", f."updated_at" AS "updatedAt", c.depth + 1
        FROM "document_folders" f
        JOIN crumbs c ON c."parentId" = f."id"
        WHERE f."tenant_id" = ${tenantId}::uuid
      )
      SELECT "id", "parentId", "name", "notes", "createdAt", "updatedAt"
      FROM crumbs
      ORDER BY depth DESC
    `;

    return rows;
  }

  private async claimDueCleanupJobs(limit: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;

      return tx.$queryRaw<Array<{ id: string }>>`
        WITH due AS (
          SELECT "id"
          FROM "document_storage_cleanup_jobs"
          WHERE "next_run_at" <= now()
            AND "status" IN ('pending', 'failed')
          ORDER BY "next_run_at" ASC, "created_at" ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "document_storage_cleanup_jobs" jobs
        SET "status" = 'processing', "updated_at" = now()
        FROM due
        WHERE jobs."id" = due."id"
        RETURNING jobs."id"
      `;
    });
  }

  private async processCleanupJob(jobId: string) {
    const job = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;

      return tx.documentStorageCleanupJob.findUnique({ where: { id: jobId } });
    });
    if (!job || job.status !== DocumentStorageCleanupJobStatus.processing) {
      return;
    }

    try {
      await this.storage.deleteObject(job.objectKey);
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;
        await tx.documentStorageCleanupJob.update({
          data: {
            completedAt: new Date(),
            documentId: null,
            lastError: null,
            status: "completed"
          },
          where: { id: job.id }
        });
        if (job.documentId) {
          await tx.document.deleteMany({
            where: { id: job.documentId, status: "deleting", tenantId: job.tenantId }
          });
        }
      });
    } catch (error) {
      const attempts = job.attempts + 1;
      const retryDelayMinutes = Math.min(60, 2 ** attempts);
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;
        const nextRunAt = addMinutes(new Date(), retryDelayMinutes);
        const status =
          attempts >= maxCleanupAttempts
            ? DocumentStorageCleanupJobStatus.failed
            : DocumentStorageCleanupJobStatus.pending;
        const updatedJob = await tx.documentStorageCleanupJob.update({
          data: {
            attempts,
            lastError: getStorageCleanupErrorMessage(error),
            nextRunAt,
            status
          },
          select: { id: true, nextRunAt: true, tenantId: true },
          where: { id: job.id }
        });
        if (status === DocumentStorageCleanupJobStatus.pending) {
          await enqueueCleanupOutbox(tx, this.outbox, updatedJob);
        }
      });
    }
  }

  async recoverStaleCleanupJobs() {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;
      const staleJobs = await tx.documentStorageCleanupJob.findMany({
        select: { id: true, tenantId: true },
        where: {
          status: "processing",
          updatedAt: { lt: new Date(Date.now() - cleanupProcessingTimeoutMs) }
        }
      });
      const nextRunAt = new Date();
      await tx.documentStorageCleanupJob.updateMany({
        data: { nextRunAt, status: "pending" },
        where: {
          status: "processing",
          updatedAt: { lt: new Date(Date.now() - cleanupProcessingTimeoutMs) }
        }
      });
      for (const job of staleJobs) {
        await enqueueCleanupOutbox(tx, this.outbox, {
          id: job.id,
          nextRunAt,
          tenantId: job.tenantId
        });
      }
    });
  }

  private async deleteUploadedObjectOrEnqueueCleanup(input: CleanupJobInput) {
    try {
      await this.storage.deleteObject(input.objectKey);
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;
        await enqueueCleanupJob(tx, this.outbox, {
          ...input,
          lastError: getStorageCleanupErrorMessage(error)
        });
      });
      if (shouldProcessCleanupInline()) {
        await this.processDueCleanupJobs(1);
      }
    }
  }

  private scheduleNextCleanupRun(delayMs = cleanupIntervalMs) {
    this.cleanupTimer = setTimeout(() => void this.runCleanupSoon(), delayMs);
    this.cleanupTimer.unref?.();
  }

  private async runCleanupSoon() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    try {
      await this.processDueCleanupJobs();
    } catch (error) {
      this.logger.error("Document storage cleanup failed.", error);
    } finally {
      this.scheduleNextCleanupRun();
    }
  }
}

const documentFolderSelect = {
  createdAt: true,
  id: true,
  name: true,
  notes: true,
  parentId: true,
  updatedAt: true
} satisfies Prisma.DocumentFolderSelect;

const documentCategorySelect = {
  description: true,
  displayOrder: true,
  id: true,
  name: true
} satisfies Prisma.DocumentCategorySelect;

const documentSelect = {
  case: { select: { caption: true, caseNumber: true, id: true } },
  caseId: true,
  category: { select: { description: true, id: true, name: true } },
  createdAt: true,
  extension: true,
  folderId: true,
  id: true,
  mimeType: true,
  notes: true,
  originalName: true,
  sizeBytes: true,
  title: true,
  updatedAt: true
} satisfies Prisma.DocumentSelect;

const documentWithObjectSelect = {
  ...documentSelect,
  bucket: true,
  objectKey: true,
  storageProvider: true
} satisfies Prisma.DocumentSelect;

const documentImportItemSelect = {
  documentId: true,
  error: true,
  folderId: true,
  id: true,
  mimeType: true,
  originalName: true,
  relativePath: true,
  sizeBytes: true,
  status: true,
  updatedAt: true
} satisfies Prisma.DocumentImportItemSelect;

const documentImportJobSelect = {
  canceledAt: true,
  completedAt: true,
  completedFiles: true,
  createdAt: true,
  createdByUserId: true,
  failedFiles: true,
  id: true,
  lastError: true,
  processedFiles: true,
  rejectedFiles: true,
  rootFolderId: true,
  skippedFiles: true,
  startedAt: true,
  status: true,
  totalBytes: true,
  totalFiles: true,
  updatedAt: true,
  items: {
    orderBy: { updatedAt: "desc" },
    select: documentImportItemSelect,
    take: 20
  }
} satisfies Prisma.DocumentImportJobSelect;

type DocumentWithSelect = Prisma.DocumentGetPayload<{ select: typeof documentSelect }>;
type CaseDocumentLike = {
  caseId: string | null;
  category: Pick<DocumentCategoryWithSelect, "description" | "id" | "name"> | null;
  createdAt: Date | string;
  id: string;
  mimeType: string;
  notes: string | null;
  originalName: string;
  sizeBytes: number;
};
type DocumentCategoryWithSelect = Prisma.DocumentCategoryGetPayload<{
  select: typeof documentCategorySelect;
}>;
type DocumentFolderWithSelect = Prisma.DocumentFolderGetPayload<{
  select: typeof documentFolderSelect;
}>;
type DocumentImportJobWithSelect = Prisma.DocumentImportJobGetPayload<{
  select: typeof documentImportJobSelect;
}>;
type DocumentImportItemWithSelect = Prisma.DocumentImportItemGetPayload<{
  select: typeof documentImportItemSelect;
}>;
type DocumentsCursor = { createdAt: Date; id: string };
type CategoriesCursor = { displayOrder: number; id: string; name: string };
type CleanupJobInput = {
  bucket: string;
  documentId?: string;
  lastError?: string;
  objectKey: string;
  reason: CleanupReason;
  storageProvider: string;
  tenantId: string;
};

export function toDocumentDto(item: DocumentWithSelect) {
  return {
    id: item.id,
    caseId: item.caseId,
    folderId: item.folderId,
    case: item.case,
    category: item.category ? toDocumentCategoryDto(item.category) : null,
    title: item.title,
    originalName: item.originalName,
    extension: item.extension,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function toCaseDocumentDto(item: CaseDocumentLike) {
  const createdAt = item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt;

  return {
    id: item.id,
    caseId: item.caseId ?? "",
    category: item.category ? toDocumentCategoryDto(item.category) : null,
    originalName: item.originalName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    notes: item.notes,
    createdAt
  };
}

export function toDocumentCategoryDto(
  item: Pick<DocumentCategoryWithSelect, "description" | "id" | "name">
) {
  return { id: item.id, name: item.name, description: item.description };
}

export function toDocumentFolderDto(item: DocumentFolderWithSelect) {
  return {
    id: item.id,
    parentId: item.parentId,
    name: item.name,
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function toDocumentImportJobDto(item: DocumentImportJobWithSelect) {
  return {
    id: item.id,
    folderId: item.rootFolderId,
    status: item.status,
    totalFiles: item.totalFiles,
    totalBytes: item.totalBytes,
    processedFiles: item.processedFiles,
    completedFiles: item.completedFiles,
    skippedFiles: item.skippedFiles,
    rejectedFiles: item.rejectedFiles,
    failedFiles: item.failedFiles,
    lastError: item.lastError,
    createdAt: item.createdAt.toISOString(),
    completedAt: item.completedAt?.toISOString() ?? null,
    recentItems: item.items.map(toDocumentImportItemDto)
  };
}

function toDocumentImportItemDto(item: DocumentImportItemWithSelect) {
  return {
    id: item.id,
    relativePath: item.relativePath,
    originalName: item.originalName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    status: item.status,
    error: item.error,
    documentId: item.documentId,
    folderId: item.folderId,
    updatedAt: item.updatedAt.toISOString()
  };
}

export function isPreviewableDocumentMimeType(mimeType: string) {
  return previewableDocumentMimeTypes.has(mimeType);
}

async function enqueueCleanupJob(
  prisma: PrismaService | Prisma.TransactionClient,
  outbox: AsyncOutboxService,
  input: CleanupJobInput
) {
  const job = await prisma.documentStorageCleanupJob.upsert({
    create: {
      bucket: input.bucket,
      documentId: input.documentId,
      lastError: input.lastError,
      objectKey: input.objectKey,
      reason: input.reason,
      storageProvider: input.storageProvider,
      tenantId: input.tenantId
    },
    update: {
      attempts: 0,
      completedAt: null,
      documentId: input.documentId,
      lastError: input.lastError ?? null,
      nextRunAt: new Date(),
      reason: input.reason,
      status: "pending",
      tenantId: input.tenantId
    },
    where: {
      storageProvider_bucket_objectKey: {
        bucket: input.bucket,
        objectKey: input.objectKey,
        storageProvider: input.storageProvider
      }
    },
    select: { id: true, nextRunAt: true, tenantId: true }
  });
  await enqueueCleanupOutbox(prisma, outbox, job);
}

async function enqueueCleanupOutbox(
  prisma: PrismaService | Prisma.TransactionClient,
  outbox: AsyncOutboxService,
  job: { id: string; nextRunAt: Date; tenantId: string }
) {
  const nextRunAt = job.nextRunAt.toISOString();
  await outbox.enqueue(prisma as Prisma.TransactionClient, {
    payload: {
      deliverAt: nextRunAt,
      jobId: job.id,
      nextRunAt,
      tenantId: job.tenantId
    },
    routingKey: documentCleanupRoutingKey,
    tenantId: job.tenantId,
    topic: "document.cleanup.requested"
  });
}

function shouldProcessCleanupInline() {
  const configuredValue = process.env.DOCUMENT_CLEANUP_INLINE_PROCESSING_ENABLED?.trim();
  if (configuredValue) {
    return configuredValue.toLowerCase() === "true";
  }

  return !shouldUseRabbitMq();
}

async function lockTenant(tx: TenantPrismaClient, tenantId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
}

async function lockDocuments(tx: TenantPrismaClient, tenantId: string, documentIds: string[]) {
  if (!documentIds.length) {
    return;
  }
  await tx.$queryRaw`
    SELECT "id"
    FROM "documents"
    WHERE "tenant_id" = ${tenantId}::uuid AND "id" IN (${Prisma.join(toUuidSqlList(documentIds))})
    FOR UPDATE
  `;
}

async function lockFolders(tx: TenantPrismaClient, tenantId: string, folderIds: string[]) {
  if (!folderIds.length) {
    return;
  }
  await tx.$queryRaw`
    SELECT "id"
    FROM "document_folders"
    WHERE "tenant_id" = ${tenantId}::uuid AND "id" IN (${Prisma.join(toUuidSqlList(folderIds))})
    FOR UPDATE
  `;
}

async function getDescendantFolderIds(
  tx: TenantPrismaClient,
  tenantId: string,
  folderIds: string[]
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE tree AS (
      SELECT "id"
      FROM "document_folders"
      WHERE "tenant_id" = ${tenantId}::uuid AND "id" IN (${Prisma.join(toUuidSqlList(folderIds))})
      UNION ALL
      SELECT child."id"
      FROM "document_folders" child
      JOIN tree ON child."parent_id" = tree."id"
      WHERE child."tenant_id" = ${tenantId}::uuid
    )
    SELECT "id" FROM tree
  `;

  return rows.map((row) => row.id);
}

async function assertFolderMoveDoesNotCreateCycle(
  tx: TenantPrismaClient,
  tenantId: string,
  folderId: string,
  nextParentId: string
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE tree AS (
      SELECT "id"
      FROM "document_folders"
      WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${folderId}::uuid
      UNION ALL
      SELECT child."id"
      FROM "document_folders" child
      JOIN tree ON child."parent_id" = tree."id"
      WHERE child."tenant_id" = ${tenantId}::uuid
    )
    SELECT "id" FROM tree WHERE "id" = ${nextParentId}::uuid
  `;

  if (rows.length > 0) {
    throw new BadRequestException("La carpeta no puede moverse dentro de una subcarpeta propia.");
  }
}

function validateDocumentFile(file: UploadedDocumentFile) {
  if (!allowedDocumentMimeTypes.has(file.mimetype)) {
    throw new BadRequestException("El archivo debe ser PDF, imagen, Word, Excel o PowerPoint.");
  }
  if (file.size > maxDocumentSizeBytes) {
    throw new BadRequestException("El archivo no puede superar 25 MB.");
  }
}

async function ensureSystemDocumentFolder(
  tx: TenantPrismaClient,
  tenantId: string,
  input: { name: string; notes: string; parentId: string | null }
) {
  const name = normalizeSystemFolderName(input.name);
  const existing = await tx.documentFolder.findFirst({
    select: { id: true },
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      parentId: input.parentId,
      tenantId
    }
  });
  if (existing) {
    await tx.documentFolder.update({
      data: { notes: input.notes },
      where: { id: existing.id }
    });
    return existing.id;
  }

  try {
    const folder = await tx.documentFolder.create({
      data: { name, notes: input.notes, parentId: input.parentId, tenantId },
      select: { id: true }
    });
    return folder.id;
  } catch (error) {
    if (!isUniqueConstraintError(error, duplicateFolderIndexName)) {
      throw error;
    }
    const folder = await tx.documentFolder.findFirst({
      select: { id: true },
      where: {
        name: { equals: name, mode: Prisma.QueryMode.insensitive },
        parentId: input.parentId,
        tenantId
      }
    });
    if (!folder) {
      throw error;
    }
    return folder.id;
  }
}

function isTechnicalDocumentFolder(folder: Pick<DocumentFolderWithSelect, "notes">) {
  return folder.notes === systemClientUuidFolderNote || folder.notes === systemCaseUuidFolderNote;
}

function isVisibleDocumentFolder(folder: Pick<DocumentFolderWithSelect, "notes">) {
  return !isTechnicalDocumentFolder(folder);
}

function compareDocumentFoldersByName(left: DocumentFolderWithSelect, right: DocumentFolderWithSelect) {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function normalizeSystemFolderName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120) || "Sin nombre";
}

function getCaseDisplayFolderName(caseItem: {
  caption: string;
  caseNumber: string;
}) {
  return normalizeSystemFolderName(`${caseItem.caseNumber} - ${caseItem.caption}`);
}

function getClientDisplayName(client: {
  businessName: string | null;
  firstName: string | null;
  lastName: string | null;
  type: string;
}) {
  const displayName =
    client.type === "legal_entity"
      ? client.businessName
      : [client.firstName, client.lastName].filter(Boolean).join(" ");

  return normalizeSystemFolderName(displayName || "Cliente sin nombre");
}

async function ensureImportFolderPath(
  tx: TenantPrismaClient,
  tenantId: string,
  rootFolderId: string | null,
  relativePath: string
) {
  let parentId = rootFolderId;
  const segments = getImportFolderSegments(relativePath);

  for (const segment of segments) {
    const name = normalizeImportFolderName(segment);
    const existing = await tx.documentFolder.findFirst({
      select: { id: true },
      where: {
        name: { equals: name, mode: Prisma.QueryMode.insensitive },
        parentId,
        tenantId
      }
    });
    if (existing) {
      parentId = existing.id;
      continue;
    }

    try {
      const folder = await tx.documentFolder.create({
        data: { name, parentId, tenantId },
        select: { id: true }
      });
      parentId = folder.id;
    } catch (error) {
      if (!isUniqueConstraintError(error, duplicateFolderIndexName)) {
        throw error;
      }
      const folder = await tx.documentFolder.findFirst({
        select: { id: true },
        where: {
          name: { equals: name, mode: Prisma.QueryMode.insensitive },
          parentId,
          tenantId
        }
      });
      if (!folder) {
        throw error;
      }
      parentId = folder.id;
    }
  }

  return parentId;
}

function normalizeImportRelativePaths(value: string | string[]) {
  return (Array.isArray(value) ? value : [value]).map((path) =>
    normalizeImportRelativePath(path, path)
  );
}

function getSelectedMimeGroups(query: ListDocumentsQuery) {
  return [
    ...new Set(
      query.mimeGroups?.length ? query.mimeGroups : query.mimeGroup ? [query.mimeGroup] : []
    )
  ];
}

function normalizeImportRelativePath(value: string, fallbackName: string) {
  const normalized = (value || fallbackName).replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    throw new BadRequestException("La ruta relativa de importacion no es valida.");
  }

  return segments.join("/").slice(0, 1000);
}

function getImportFolderSegments(relativePath: string) {
  const segments = relativePath.split("/").filter(Boolean);
  return segments.slice(0, -1);
}

function normalizeImportFolderName(value: string) {
  const name = value.trim().slice(0, 120);
  if (!name || name === "." || name === "..") {
    throw new BadRequestException("El nombre de una carpeta de importacion no es valido.");
  }
  return name;
}

function isTerminalImportStatus(status: string) {
  return ["canceled", "completed", "failed", "partial_failed"].includes(status);
}

function getImportErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "No se pudo importar el archivo.";
  return message.slice(0, 500);
}

function toUuidSqlList(ids: string[]) {
  return ids.map((id) => Prisma.sql`${id}::uuid`);
}

function normalizeNullableUuid(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string" || !isUuid(value)) {
    throw new BadRequestException("El identificador seleccionado no es valido.");
  }
  return value;
}

function normalizeOptionalString(value: unknown, maxLength: number, message: string) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    throw new BadRequestException(message);
  }
  return trimmed;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function handleFolderWriteError(error: unknown): never | void {
  if (isUniqueConstraintError(error, duplicateFolderIndexName)) {
    throw new ConflictException("Ya existe una carpeta con ese nombre en esta ubicacion.");
  }
}

function isUniqueConstraintError(error: unknown, indexName: string) {
  const target = error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.target : null;
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (target === indexName || (Array.isArray(target) && target.includes(indexName)))
  );
}

function encodeDocumentsCursor(cursor: DocumentsCursor) {
  return Buffer.from(
    JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id })
  ).toString("base64url");
}

function decodeDocumentsCursor(cursor?: string): DocumentsCursor | null {
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
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id: parsed.id };
  } catch {
    throw new BadRequestException("El cursor de documentos es invalido.");
  }
}

function getDocumentsCursorWhere(cursor: DocumentsCursor): Prisma.DocumentWhereInput[] {
  return [
    { createdAt: { lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, id: { lt: cursor.id } }
  ];
}

function encodeCategoriesCursor(cursor: CategoriesCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCategoriesCursor(cursor?: string): CategoriesCursor | null {
  if (!cursor) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      displayOrder?: number;
      id?: string;
      name?: string;
    };
    if (
      typeof parsed.displayOrder !== "number" ||
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string"
    ) {
      return null;
    }
    return { displayOrder: parsed.displayOrder, id: parsed.id, name: parsed.name };
  } catch {
    throw new BadRequestException("El cursor de categorias es invalido.");
  }
}

function getCategoriesCursorWhere(cursor: CategoriesCursor): Prisma.DocumentCategoryWhereInput[] {
  return [
    { displayOrder: { gt: cursor.displayOrder } },
    { displayOrder: cursor.displayOrder, name: { gt: cursor.name } },
    { displayOrder: cursor.displayOrder, name: cursor.name, id: { gt: cursor.id } }
  ];
}

function buildDocumentObjectKey({
  documentId,
  folderId,
  originalName,
  tenantId
}: {
  documentId: string;
  folderId: string | null;
  originalName: string;
  tenantId: string;
}) {
  return [
    "tenants",
    tenantId,
    "library",
    folderId ?? "root",
    "documents",
    documentId,
    toSafeFilename(originalName)
  ].join("/");
}

function toSafeFilename(filename: string) {
  const normalized = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return normalized || "documento";
}

function getFileExtension(filename: string) {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return null;
  }
  return filename.slice(lastDot + 1).toLowerCase();
}

function getStorageCleanupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error desconocido";
  return message.slice(0, 500);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}
