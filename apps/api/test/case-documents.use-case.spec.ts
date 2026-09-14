import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { CaseDocumentsUseCase } from "../src/cases/use-cases/case-documents.use-case";
import { PrismaService } from "../src/database/prisma.service";
import { ObjectStorageService } from "../src/storage/object-storage.service";

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const caseA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const categoryA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const userId = "99999999-9999-4999-8999-999999999999";
const userWithoutMembershipId = "88888888-8888-4888-8888-888888888888";

describe("CaseDocumentsUseCase", () => {
  it("uploads a tenant-scoped document and stores private object metadata", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    const document = await useCase.create(
      tenantA,
      caseA,
      userId,
      { categoryId: categoryA, notes: "Demanda inicial" },
      makeFile()
    );

    assert.equal(document.caseId, caseA);
    assert.equal(document.category?.id, categoryA);
    assert.equal(document.notes, "Demanda inicial");
    assert.equal(storage.puts.length, 1);
    assert.equal(prisma.createdDocuments.length, 1);
    assert.match(
      prisma.createdDocuments[0].objectKey,
      /^tenants\/1111.*\/cases\/aaaa.*\/documents\//
    );
    assert.equal(prisma.createdDocuments[0].bucket, "temis-test");
    assert.equal(prisma.createdDocuments[0].storageProvider, "minio");
  });

  it("rejects unsupported document types before writing storage or metadata", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    await assert.rejects(
      () =>
        useCase.create(
          tenantA,
          caseA,
          userId,
          {},
          {
            ...makeFile(),
            mimetype: "application/x-msdownload"
          }
        ),
      BadRequestException
    );
    assert.equal(storage.puts.length, 0);
    assert.equal(prisma.createdDocuments.length, 0);
  });

  it("rejects exact duplicate active documents in the same case before writing storage", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    await useCase.create(tenantA, caseA, userId, {}, makeFile());

    await assert.rejects(
      () => useCase.create(tenantA, caseA, userId, {}, makeFile()),
      ConflictException
    );
    assert.equal(storage.puts.length, 1);
    assert.equal(prisma.createdDocuments.length, 1);
  });

  it("rejects uploads from users without active tenant membership before writing storage", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    await assert.rejects(
      () => useCase.create(tenantA, caseA, userWithoutMembershipId, {}, makeFile()),
      BadRequestException
    );
    assert.equal(storage.puts.length, 0);
    assert.equal(prisma.createdDocuments.length, 0);
  });

  it("allows reuploading an exact duplicate after the previous document is deleted", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    const firstDocument = await useCase.create(tenantA, caseA, userId, {}, makeFile());
    await useCase.delete(tenantA, caseA, firstDocument.id);
    const secondDocument = await useCase.create(tenantA, caseA, userId, {}, makeFile());

    assert.notEqual(secondDocument.id, firstDocument.id);
    assert.equal(storage.puts.length, 2);
    assert.equal(prisma.createdDocuments.length, 2);
  });

  it("filters list and preview by active tenant and case", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    await useCase.create(tenantA, caseA, userId, {}, makeFile());
    const listed = await useCase.list(tenantA, caseA, { limit: 8 });

    assert.equal(listed.items.length, 1);
    await assert.rejects(
      () => useCase.readObject(tenantB, caseA, listed.items[0].id),
      NotFoundException
    );
  });

  it("soft deletes metadata and removes the object best-effort", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    const document = await useCase.create(tenantA, caseA, userId, {}, makeFile());
    const result = await useCase.delete(tenantA, caseA, document.id);

    assert.deepEqual(result, { status: "ok" });
    assert.equal(prisma.documents[0].deletedAt instanceof Date, true);
    assert.equal(storage.deletes.length, 1);
    assert.equal(prisma.cleanupJobs[0].status, "completed");
  });

  it("removes the uploaded object when metadata creation fails", async () => {
    const prisma = makePrisma({ failCreate: true });
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    await assert.rejects(() => useCase.create(tenantA, caseA, userId, {}, makeFile()));
    assert.equal(storage.puts.length, 1);
    assert.equal(storage.deletes.length, 1);
    assert.equal(prisma.cleanupJobs.length, 0);
  });

  it("keeps a retryable cleanup job when deleting the stored object fails", async () => {
    const prisma = makePrisma();
    const storage = makeStorage({ failDelete: true });
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    const document = await useCase.create(tenantA, caseA, userId, {}, makeFile());
    await useCase.delete(tenantA, caseA, document.id);

    assert.equal(prisma.documents[0].deletedAt instanceof Date, true);
    assert.equal(prisma.cleanupJobs.length, 1);
    assert.equal(prisma.cleanupJobs[0].status, "pending");
    assert.equal(prisma.cleanupJobs[0].attempts, 1);
    assert.equal(prisma.cleanupJobs[0].reason, "document_deleted");
  });

  it("keeps a retryable cleanup job when metadata creation and uploaded object cleanup fail", async () => {
    const prisma = makePrisma({ failCreate: true });
    const storage = makeStorage({ failDelete: true });
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    await assert.rejects(() => useCase.create(tenantA, caseA, userId, {}, makeFile()));

    assert.equal(storage.puts.length, 1);
    assert.equal(storage.deletes.length, 1);
    assert.equal(prisma.cleanupJobs.length, 1);
    assert.equal(prisma.cleanupJobs[0].status, "pending");
    assert.equal(prisma.cleanupJobs[0].attempts, 1);
    assert.equal(prisma.cleanupJobs[0].reason, "metadata_create_failed");
  });

  it("enqueues cleanup jobs for every case document before case deletion", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );

    const firstDocument = await useCase.create(tenantA, caseA, userId, {}, makeFile());
    await useCase.create(
      tenantA,
      caseA,
      userId,
      {},
      { ...makeFile(), buffer: Buffer.from("second document") }
    );

    const result = await useCase.enqueueCleanupForCaseDeletion(
      prisma as unknown as never,
      tenantA,
      caseA
    );

    assert.deepEqual(result, { enqueued: 2 });
    assert.equal(firstDocument.caseId, caseA);
    assert.equal(prisma.cleanupJobs.every((job) => job.documentId === undefined), true);
    assert.equal(
      prisma.cleanupJobs.every((job) => job.reason === "case_deleted"),
      true
    );
  });

  it("recovers stale processing cleanup jobs before retrying them", async () => {
    const prisma = makePrisma();
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );
    prisma.cleanupJobs.push(
      makeCleanupJob({
        objectKey: "tenants/tenant/cases/case/documents/document/stale.pdf",
        status: "processing",
        updatedAt: new Date(Date.now() - 11 * 60_000)
      })
    );

    await useCase.processDueCleanupJobs();

    assert.equal(storage.deletes.length, 1);
    assert.equal(prisma.cleanupJobs[0].status, "completed");
  });

  it("does not delete storage when another worker already claimed the cleanup job", async () => {
    const prisma = makePrisma({ skipCleanupClaim: true });
    const storage = makeStorage();
    const useCase = new CaseDocumentsUseCase(
      prisma as unknown as PrismaService,
      storage as unknown as ObjectStorageService
    );
    prisma.cleanupJobs.push(makeCleanupJob());

    await useCase.processDueCleanupJobs();

    assert.equal(storage.deletes.length, 0);
    assert.equal(prisma.cleanupJobs[0].status, "pending");
  });
});

function makePrisma({
  failCreate = false,
  skipCleanupClaim = false
}: { failCreate?: boolean; skipCleanupClaim?: boolean } = {}) {
  const state = {
    cases: [
      { id: caseA, tenantId: tenantA },
      { id: caseA, tenantId: tenantB }
    ],
    categories: [
      {
        active: true,
        description: null,
        displayOrder: 0,
        id: categoryA,
        name: "Escritos",
        tenantId: tenantA
      }
    ],
    memberships: [{ status: "active", tenantId: tenantA, userId }],
    cleanupJobs: [] as CleanupJobRecord[],
    createdDocuments: [] as DocumentWriteData[],
    documents: [] as DocumentRecord[]
  };

  const client = {
    get createdDocuments() {
      return state.createdDocuments;
    },
    get documents() {
      return state.documents;
    },
    get cleanupJobs() {
      return state.cleanupJobs;
    },
    case: {
      findFirst: async ({ where }: { where: { id: string; tenantId: string } }) =>
        state.cases.find(
          (caseItem) => caseItem.id === where.id && caseItem.tenantId === where.tenantId
        ) ?? null
    },
    documentCategory: {
      findFirst: async ({ where }: { where: { active: boolean; id: string; tenantId: string } }) =>
        state.categories.find(
          (category) =>
            category.active === where.active &&
            category.id === where.id &&
            category.tenantId === where.tenantId
        ) ?? null,
      findMany: async () => state.categories
    },
    tenantMembership: {
      findFirst: async ({
        where
      }: {
        where: { status: "active"; tenantId: string; userId: string };
      }) =>
        state.memberships.find(
          (membership) =>
            membership.status === where.status &&
            membership.tenantId === where.tenantId &&
            membership.userId === where.userId
        ) ?? null
    },
    document: {
      create: async ({ data }: { data: DocumentWriteData }) => {
        state.createdDocuments.push(data);
        if (failCreate) {
          throw new Error("metadata write failed");
        }

        const record: DocumentRecord = {
          ...data,
          category: data.categoryId
            ? { description: null, id: data.categoryId, name: "Escritos" }
            : null,
          createdAt: new Date("2026-08-18T12:00:00.000Z"),
          deletedAt: null
        };
        state.documents.push(record);
        return record;
      },
      findFirst: async ({ where }: { where: DocumentWhere }) =>
        state.documents.find((document) => matchesDocument(document, where)) ?? null,
      findMany: async ({ take, where }: { take: number; where: DocumentWhere }) =>
        state.documents.filter((document) => matchesDocument(document, where)).slice(0, take),
      update: async ({ data, where }: { data: { deletedAt: Date }; where: { id: string } }) => {
        const document = state.documents.find((item) => item.id === where.id);
        if (!document) {
          throw new Error("document not found");
        }

        document.deletedAt = data.deletedAt;
        return document;
      }
    },
    documentStorageCleanupJob: {
      findMany: async ({
        take,
        where
      }: {
        take: number;
        where: { nextRunAt: { lte: Date }; status: { in: CleanupJobStatus[] } };
      }) =>
        state.cleanupJobs
          .filter(
            (job) => job.nextRunAt <= where.nextRunAt.lte && where.status.in.includes(job.status)
          )
          .slice(0, take),
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.cleanupJobs.find((job) => job.id === where.id) ?? null,
      update: async ({
        data,
        where
      }: {
        data: Partial<CleanupJobRecord>;
        where: { id: string };
      }) => {
        const job = state.cleanupJobs.find((item) => item.id === where.id);
        if (!job) {
          throw new Error("cleanup job not found");
        }

        Object.assign(job, data);
        return job;
      },
      updateMany: async ({
        data,
        where
      }: {
        data: Partial<CleanupJobRecord>;
        where: CleanupJobUpdateManyWhere;
      }) => {
        let count = 0;
        for (const job of state.cleanupJobs) {
          if (!matchesCleanupJobUpdateManyWhere(job, where)) {
            continue;
          }

          if (
            skipCleanupClaim &&
            where.id &&
            cleanupJobWhereIncludesStatus(where, "pending") &&
            data.status === "processing"
          ) {
            continue;
          }

          Object.assign(job, data, { updatedAt: new Date() });
          count += 1;
        }

        return { count };
      },
      upsert: async ({
        create,
        update,
        where
      }: {
        create: CleanupJobWriteData;
        update: Partial<CleanupJobRecord>;
        where: {
          storageProvider_bucket_objectKey: {
            bucket: string;
            objectKey: string;
            storageProvider: string;
          };
        };
      }) => {
        const existingJob = state.cleanupJobs.find(
          (job) =>
            job.bucket === where.storageProvider_bucket_objectKey.bucket &&
            job.objectKey === where.storageProvider_bucket_objectKey.objectKey &&
            job.storageProvider === where.storageProvider_bucket_objectKey.storageProvider
        );

        if (existingJob) {
          Object.assign(existingJob, update);
          return existingJob;
        }

        const job: CleanupJobRecord = {
          attempts: 0,
          completedAt: null,
          createdAt: new Date("2026-08-18T12:00:00.000Z"),
          id: `cleanup-${state.cleanupJobs.length + 1}`,
          lastError: null,
          nextRunAt: new Date("2026-08-18T12:00:00.000Z"),
          status: "pending",
          updatedAt: new Date("2026-08-18T12:00:00.000Z"),
          ...create
        };
        state.cleanupJobs.push(job);
        return job;
      }
    }
  };
  const transactionalClient = client as typeof client & {
    $transaction: <T>(callback: (tx: typeof client) => Promise<T>) => Promise<T>;
  };
  transactionalClient.$transaction = async (callback) => callback(client);

  return transactionalClient;
}

function makeCleanupJob(input: Partial<CleanupJobRecord> = {}): CleanupJobRecord {
  return {
    attempts: 0,
    bucket: "temis-test",
    completedAt: null,
    createdAt: new Date("2026-08-18T12:00:00.000Z"),
    documentId: undefined,
    id: "cleanup-existing",
    lastError: null,
    nextRunAt: new Date("2026-08-18T12:00:00.000Z"),
    objectKey: "tenants/tenant/cases/case/documents/document/file.pdf",
    reason: "document_deleted",
    status: "pending",
    storageProvider: "minio",
    tenantId: tenantA,
    updatedAt: new Date("2026-08-18T12:00:00.000Z"),
    ...input
  };
}

function makeStorage({ failDelete = false }: { failDelete?: boolean } = {}) {
  const state = {
    deletes: [] as string[],
    puts: [] as Array<{ key: string }>
  };

  return {
    deletes: state.deletes,
    puts: state.puts,
    deleteObject: async (key: string) => {
      state.deletes.push(key);
      if (failDelete) {
        throw new Error("storage delete failed");
      }
      return undefined;
    },
    getBucket: () => "temis-test",
    getObject: async () => ({
      body: Buffer.from("document"),
      contentLength: 8,
      contentType: "application/pdf"
    }),
    getProvider: () => "minio",
    putObject: async (input: { key: string }) => {
      state.puts.push(input);
      return undefined;
    }
  };
}

function makeFile() {
  return {
    buffer: Buffer.from("document"),
    mimetype: "application/pdf",
    originalname: "demanda inicial.pdf",
    size: 8
  };
}

type DocumentWriteData = {
  bucket: string;
  caseId: string;
  categoryId?: string;
  checksum: string;
  id: string;
  mimeType: string;
  notes?: string;
  objectKey: string;
  originalName: string;
  sizeBytes: number;
  storageProvider: string;
  tenantId: string;
  uploadedByUserId: string;
};

type DocumentRecord = DocumentWriteData & {
  category: { description: string | null; id: string; name: string } | null;
  createdAt: Date;
  deletedAt: Date | null;
};

type CleanupJobStatus = "pending" | "processing" | "completed" | "failed";

type CleanupJobReason = "case_deleted" | "document_deleted" | "metadata_create_failed";

type CleanupJobWriteData = {
  bucket: string;
  documentId?: string;
  lastError?: string | null;
  objectKey: string;
  reason: CleanupJobReason;
  storageProvider: string;
  tenantId: string;
};

type CleanupJobRecord = CleanupJobWriteData & {
  attempts: number;
  completedAt: Date | null;
  createdAt: Date;
  id: string;
  lastError: string | null;
  nextRunAt: Date;
  status: CleanupJobStatus;
  updatedAt: Date;
};

type CleanupJobUpdateManyWhere = {
  id?: string;
  nextRunAt?: { lte: Date };
  status?: CleanupJobStatus | { in: CleanupJobStatus[] };
  updatedAt?: { lt: Date };
};

function matchesCleanupJobUpdateManyWhere(job: CleanupJobRecord, where: CleanupJobUpdateManyWhere) {
  if (where.id && job.id !== where.id) {
    return false;
  }

  if (where.nextRunAt && job.nextRunAt > where.nextRunAt.lte) {
    return false;
  }

  if (where.updatedAt && job.updatedAt >= where.updatedAt.lt) {
    return false;
  }

  if (!where.status) {
    return true;
  }

  return typeof where.status === "string"
    ? job.status === where.status
    : where.status.in.includes(job.status);
}

function cleanupJobWhereIncludesStatus(where: CleanupJobUpdateManyWhere, status: CleanupJobStatus) {
  return typeof where.status === "string"
    ? where.status === status
    : (where.status?.in.includes(status) ?? false);
}

type DocumentWhere = {
  caseId: string;
  checksum?: string;
  deletedAt: null;
  id?: string;
  tenantId: string;
};

function matchesDocument(document: DocumentRecord, where: DocumentWhere) {
  return (
    document.caseId === where.caseId &&
    (!where.checksum || document.checksum === where.checksum) &&
    document.deletedAt === where.deletedAt &&
    (!where.id || document.id === where.id) &&
    document.tenantId === where.tenantId
  );
}
