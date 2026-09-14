import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { DocumentsService } from "../src/documents/documents.service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const caseId = "22222222-2222-4222-8222-222222222222";
const clientId = "33333333-3333-4333-8333-333333333333";
const uploadedByUserId = "44444444-4444-4444-8444-444444444444";
const now = new Date("2026-09-02T12:00:00.000Z");
const clientUuidFolderId = "55555555-5555-4555-8555-555555555551";
const manualRootFolderId = "55555555-5555-4555-8555-555555555552";
const clientNameFolderId = "55555555-5555-4555-8555-555555555553";
const caseUuidFolderId = "55555555-5555-4555-8555-555555555554";
const caseNameFolderId = "55555555-5555-4555-8555-555555555555";
const folderIds = [
  clientUuidFolderId,
  clientNameFolderId,
  caseUuidFolderId,
  caseNameFolderId
];

type CaseFixture = {
  caption: string;
  caseNumber: string;
  id: string;
  primaryClient: {
    businessName: string | null;
    firstName: string | null;
    id: string;
    lastName: string | null;
    type: string;
  } | null;
};

describe("DocumentsService case library folders", () => {
  it("creates case documents inside client and case folder hierarchy", async () => {
    const prisma = createPrismaMock();
    const storage = createStorageMock();
    const service = new DocumentsService(prisma as never, createOutboxMock() as never, storage as never);

    const document = await service.createCaseDocument(
      tenantId,
      caseId,
      uploadedByUserId,
      { notes: "Contrato firmado" },
      createFile()
    );

    assert.equal(document.id, "document-1");
    assert.equal(document.caseId, caseId);
    assert.equal(document.originalName, "demanda.pdf");
    assert.equal(prisma.documentFolder.created.length, 4);
    assert.deepEqual(
      prisma.documentFolder.created.map((folder) => ({
        name: folder.name,
        notes: folder.notes,
        parentId: folder.parentId
      })),
      [
        { name: clientId, notes: "system:case-library:client-uuid", parentId: null },
        { name: "Ana Perez", notes: "system:case-library:client-name", parentId: clientUuidFolderId },
        { name: caseId, notes: "system:case-library:case-uuid", parentId: clientNameFolderId },
        {
          name: "EXP-1 - Perez c/ Gomez",
          notes: "system:case-library:case-name",
          parentId: caseUuidFolderId
        }
      ]
    );
    assert.equal(prisma.document.created[0]?.folderId, caseNameFolderId);
    assert.equal(storage.putObjectCalls[0]?.key.includes(`/library/${caseNameFolderId}/documents/`), true);
  });

  it("rejects case document uploads when the case has no primary client", async () => {
    const prisma = createPrismaMock({
      caseItem: {
        caption: "Sin cliente",
        caseNumber: "EXP-2",
        id: caseId,
        primaryClient: null
      }
    });
    const storage = createStorageMock();
    const service = new DocumentsService(prisma as never, createOutboxMock() as never, storage as never);

    await assert.rejects(
      () => service.createCaseDocument(tenantId, caseId, uploadedByUserId, {}, createFile()),
      (error) =>
        error instanceof BadRequestException &&
        error.message === "El expediente debe tener un cliente principal para subir documentos."
    );
    assert.equal(storage.putObjectCalls.length, 0);
    assert.equal(prisma.document.created.length, 0);
  });

  it("hides technical folders while exposing client and case folders in library navigation", async () => {
    const prisma = createPrismaMock({
      folders: [
        createFolder(clientUuidFolderId, clientId, null, "system:case-library:client-uuid"),
        createFolder(manualRootFolderId, "Generales", null, null),
        createFolder(clientNameFolderId, "Ana Perez", clientUuidFolderId, "system:case-library:client-name"),
        createFolder(caseUuidFolderId, caseId, clientNameFolderId, "system:case-library:case-uuid"),
        createFolder(
          caseNameFolderId,
          "EXP-1 - Perez c/ Gomez",
          caseUuidFolderId,
          "system:case-library:case-name"
        )
      ]
    });
    const service = new DocumentsService(
      prisma as never,
      createOutboxMock() as never,
      createStorageMock() as never
    );

    const root = await service.list(tenantId, { limit: 20 });
    assert.deepEqual(
      root.folders.map((folder) => folder.name),
      ["Ana Perez", "Generales"]
    );
    assert.equal(prisma.document.findManyCalls[0]?.where.caseId, null);

    const clientFolder = await service.list(tenantId, { folderId: clientNameFolderId, limit: 20 });
    assert.deepEqual(
      clientFolder.folders.map((folder) => folder.name),
      ["EXP-1 - Perez c/ Gomez"]
    );
    assert.deepEqual(
      clientFolder.breadcrumbs.map((folder) => folder.name),
      ["Ana Perez"]
    );
  });
});

function createPrismaMock({
  caseItem = {
    caption: "Perez c/ Gomez",
    caseNumber: "EXP-1",
    id: caseId,
    primaryClient: {
      businessName: null,
      firstName: "Ana",
      id: clientId,
      lastName: "Perez",
      type: "human"
    }
  } satisfies CaseFixture,
  folders = [] as ReturnType<typeof createFolder>[]
}: { caseItem?: CaseFixture; folders?: ReturnType<typeof createFolder>[] } = {}) {
  const state = {
    caseItem,
    document: {
      created: [] as Array<{ caseId: string | null; folderId: string | null }>,
      findManyCalls: [] as Array<{ where: Record<string, unknown> }>
    },
    documentFolder: {
      created: [] as Array<{ name: string; notes: string | null; parentId: string | null }>,
      folders: [...folders]
    }
  };
  const prisma = {
    ...state,
    runWithTenant: async (_tenantId: string, callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
    $executeRaw: async () => [],
    case: {
      findFirst: async () => state.caseItem
    },
    tenantMembership: {
      findFirst: async () => ({ id: "membership-1" })
    },
    documentFolder: {
      ...state.documentFolder,
      count: async () => state.documentFolder.folders.length,
      create: async ({ data }: { data: { name: string; notes?: string | null; parentId: string | null } }) => {
        const folder = createFolder(
          folderIds[state.documentFolder.folders.length] ?? randomUUID(),
          data.name,
          data.parentId,
          data.notes ?? null
        );
        state.documentFolder.folders.push(folder);
        state.documentFolder.created.push({
          name: folder.name,
          notes: folder.notes,
          parentId: folder.parentId
        });
        return { id: folder.id };
      },
      findFirst: async ({ where }: { where: { name?: { equals: string }; parentId?: string | null } }) =>
        state.documentFolder.folders.find(
          (folder) =>
            folder.parentId === (where.parentId ?? null) &&
            (!where.name || folder.name.toLowerCase() === where.name.equals.toLowerCase())
        ) ?? null,
      findMany: async ({ where }: { where: { parentId?: string | null | { in: string[] } } }) => {
        const parentId = where.parentId;
        const items = Array.isArray((parentId as { in?: string[] })?.in)
          ? state.documentFolder.folders.filter((folder) =>
              (parentId as { in: string[] }).in.includes(folder.parentId ?? "")
            )
          : state.documentFolder.folders.filter((folder) => folder.parentId === (parentId ?? null));
        return [...items].sort((left, right) => left.name.localeCompare(right.name));
      }
    },
    document: {
      ...state.document,
      aggregate: async () => ({ _sum: { sizeBytes: 0 } }),
      count: async () => 0,
      create: async ({ data }: { data: { caseId: string | null; folderId: string | null } }) => {
        state.document.created.push({ caseId: data.caseId, folderId: data.folderId });
        return createDocument(data);
      },
      findFirst: async () => null,
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        state.document.findManyCalls.push({ where });
        return [];
      }
    },
    $queryRaw: async () =>
      state.documentFolder.folders
        .filter((folder) => folder.id === clientNameFolderId)
        .map((folder) => ({
          createdAt: folder.createdAt,
          id: folder.id,
          name: folder.name,
          notes: folder.notes,
          parentId: folder.parentId,
          updatedAt: folder.updatedAt
        }))
  };

  return prisma;
}

function createFolder(id: string, name: string, parentId: string | null, notes: string | null) {
  return { createdAt: now, id, name, notes, parentId, updatedAt: now };
}

function createDocument(input: { caseId: string | null; folderId: string | null }) {
  return {
    case: { caption: "Perez c/ Gomez", caseNumber: "EXP-1", id: caseId },
    caseId: input.caseId,
    category: null,
    createdAt: now,
    extension: "pdf",
    folderId: input.folderId,
    id: "document-1",
    mimeType: "application/pdf",
    notes: "Contrato firmado",
    originalName: "demanda.pdf",
    sizeBytes: 10,
    title: "demanda.pdf",
    updatedAt: now
  };
}

function createFile() {
  return {
    buffer: Buffer.from("demanda"),
    mimetype: "application/pdf",
    originalname: "demanda.pdf",
    size: 10
  };
}

function createStorageMock() {
  const storage = {
    putObjectCalls: [] as Array<{ key: string }>,
    getBucket: () => "documents",
    getProvider: () => "local",
    putObject: async (input: { key: string }) => {
      storage.putObjectCalls.push(input);
    }
  };

  return storage;
}

function createOutboxMock() {
  return { enqueue: async () => undefined };
}
