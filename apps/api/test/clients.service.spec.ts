import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ClientStatus, ClientType, Prisma } from "@prisma/client";
import {
  createClientSchema,
  decodeClientCursor,
  encodeClientCursor,
  listClientsQuerySchema,
  updateClientSchema
} from "../src/clients/clients.schemas";
import { ClientsService } from "../src/clients/clients.service";

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";
const clientAId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const clientBId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("ClientsService create", () => {
  it("creates a tenant-scoped human and returns detail", async () => {
    const context = createPrismaMock();
    const service = new ClientsService(context.prisma as never);

    const result = await service.create(
      tenantA,
      createClientSchema.parse({
        cuil: "27301112221",
        dni: "30111222",
        firstName: "Ana",
        lastName: "Perez",
        type: "human"
      })
    );

    assert.equal(result.type, "human");
    assert.equal(result.displayName, "Ana Perez");
    assert.equal(context.clients[0]?.tenantId, tenantA);
    assert.deepEqual(context.runWithTenantCalls, [tenantA]);
  });

  it("creates a tenant-scoped legal entity", async () => {
    const context = createPrismaMock();
    const service = new ClientsService(context.prisma as never);

    const result = await service.create(
      tenantA,
      createClientSchema.parse({
        businessName: "Empresa SA",
        cuit: "30711222334",
        type: "legal_entity"
      })
    );

    assert.equal(result.type, "legal_entity");
    assert.equal(result.displayName, "Empresa SA");
    assert.equal(result.firstName, null);
  });

  for (const duplicate of [
    { field: "dni", label: "DNI", value: "30111222" },
    { field: "cuil", label: "CUIL", value: "27301112221" },
    { field: "cuit", label: "CUIT", value: "30711222334" }
  ] as const) {
    it(`rejects a duplicate ${duplicate.label} within the active tenant`, async () => {
      const existing =
        duplicate.field === "cuit"
          ? makeClient({
              businessName: "Existente SA",
              cuit: duplicate.value,
              id: clientAId,
              tenantId: tenantA,
              type: ClientType.legal_entity
            })
          : makeClient({
              [duplicate.field]: duplicate.value,
              id: clientAId,
              tenantId: tenantA
            });
      const context = createPrismaMock({ clients: [existing] });
      const service = new ClientsService(context.prisma as never);
      const input =
        duplicate.field === "cuit"
          ? createClientSchema.parse({
              businessName: "Nueva SA",
              cuit: duplicate.value,
              type: "legal_entity"
            })
          : createClientSchema.parse({
              [duplicate.field]: duplicate.value,
              firstName: "Nueva",
              lastName: "Persona",
              type: "human"
            });

      await assert.rejects(() => service.create(tenantA, input), ConflictException);
    });
  }

  it("never takes tenantId from the public input", async () => {
    const context = createPrismaMock();
    const service = new ClientsService(context.prisma as never);
    const parsed = createClientSchema.safeParse({
      firstName: "Ana",
      lastName: "Perez",
      tenantId: tenantB,
      type: "human"
    });

    assert.equal(parsed.success, false);

    await service.create(tenantA, {
      firstName: "Ana",
      lastName: "Perez",
      status: "active",
      tenantId: tenantB,
      type: "human"
    } as never);

    assert.equal(context.clients[0]?.tenantId, tenantA);
  });
});

describe("ClientsService list", () => {
  it("returns a normal list with ISO dates inside tenant context", async () => {
    const context = createPrismaMock({ listRows: [makeListRow()] });
    const service = new ClientsService(context.prisma as never);
    const result = await service.list(tenantA, listClientsQuerySchema.parse({}));

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.displayName, "Ana Perez");
    assert.equal(result.items[0]?.createdAt, "2026-08-28T12:00:00.000Z");
    assert.deepEqual(context.runWithTenantCalls, [tenantA]);
  });

  it("builds search, type and explicit status filters over supported fields", async () => {
    const context = createPrismaMock();
    const service = new ClientsService(context.prisma as never);

    await service.list(
      tenantA,
      listClientsQuerySchema.parse({ search: "Ana", status: "archived", type: "human" })
    );

    const query = context.listQueries[0];
    const text = getSqlText(query);
    const values = getSqlValues(query);

    for (const column of [
      "first_name",
      "last_name",
      "business_name",
      "dni",
      "cuil",
      "cuit",
      "email",
      "phone"
    ]) {
      assert.match(text, new RegExp(column));
    }
    assert.ok(values.includes("%Ana%"));
    assert.ok(values.includes("human"));
    assert.ok(values.includes("archived"));
    assert.doesNotMatch(text, /status" <> 'archived'/);
  });

  it("excludes archived clients by default", async () => {
    const context = createPrismaMock();
    const service = new ClientsService(context.prisma as never);

    await service.list(tenantA, listClientsQuerySchema.parse({}));

    assert.match(getSqlText(context.listQueries[0]), /"status" <> 'archived'/);
  });

  it("uses limit plus one and returns a valid compound cursor", async () => {
    const context = createPrismaMock({
      listRows: [
        makeListRow({ displayName: "Ana", id: clientAId, sortValue: "ana" }),
        makeListRow({ displayName: "Beatriz", id: clientBId, sortValue: "beatriz" }),
        makeListRow({
          displayName: "Carla",
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          sortValue: "carla"
        })
      ]
    });
    const service = new ClientsService(context.prisma as never);
    const result = await service.list(tenantA, listClientsQuerySchema.parse({ limit: 2 }));

    assert.equal(result.items.length, 2);
    assert.equal(result.pageInfo.hasNextPage, true);
    assert.ok(result.pageInfo.nextCursor);
    assert.equal(getSqlValues(context.listQueries[0]).at(-1), 3);

    const cursor = decodeClientCursor(result.pageInfo.nextCursor ?? "");
    assert.equal(cursor?.id, clientBId);
    assert.equal(cursor?.sort, "name");
    assert.equal(cursor?.value, "beatriz");
  });

  it("accepts a cursor bound to the same search, filters and order", async () => {
    const token = encodeClientCursor({
      id: clientAId,
      order: "desc",
      search: "Ana",
      sort: "createdAt",
      status: "active",
      type: "human",
      value: "2026-08-28T12:00:00.000Z",
      version: 1
    });
    const context = createPrismaMock();
    const service = new ClientsService(context.prisma as never);

    await service.list(
      tenantA,
      listClientsQuerySchema.parse({
        cursor: token,
        order: "desc",
        search: "Ana",
        sort: "createdAt",
        status: "active",
        type: "human"
      })
    );

    const values = getSqlValues(context.listQueries[0]);
    assert.ok(values.includes(clientAId));
    assert.ok(values.some((value) => value instanceof Date));
  });

  it("rejects an invalid cursor even when the service is called directly", async () => {
    const context = createPrismaMock();
    const service = new ClientsService(context.prisma as never);

    await assert.rejects(
      () =>
        service.list(tenantA, {
          cursor: "invalid-cursor",
          limit: 20,
          order: "asc",
          sort: "name"
        }),
      BadRequestException
    );
  });
});

describe("ClientsService detail", () => {
  it("returns metrics and related cases without double counting", async () => {
    const sharedCase = makeRelatedCase({ id: "10000000-0000-4000-8000-000000000001" });
    const participantCase = makeRelatedCase({
      caseNumber: "EXP-002/2026",
      id: "10000000-0000-4000-8000-000000000002"
    });
    const context = createPrismaMock({
      clients: [
        makeClient({
          caseParticipations: [
            { case: sharedCase },
            { case: participantCase },
            { case: participantCase }
          ],
          id: clientAId,
          primaryCases: [sharedCase],
          tenantId: tenantA
        })
      ]
    });
    const service = new ClientsService(context.prisma as never);

    const result = await service.getDetail(tenantA, clientAId);

    assert.deepEqual(result.metrics, {
      caseParticipations: 1,
      primaryCases: 1,
      totalCases: 2
    });
    assert.equal(result.relatedCases.primaryCases.length, 1);
    assert.equal(result.relatedCases.caseParticipations.length, 1);
  });

  it("returns not found for a missing or cross-tenant client", async () => {
    const context = createPrismaMock({
      clients: [makeClient({ id: clientAId, tenantId: tenantB })]
    });
    const service = new ClientsService(context.prisma as never);

    await assert.rejects(() => service.getDetail(tenantA, clientAId), NotFoundException);
  });
});

describe("ClientsService update", () => {
  it("applies a partial tenant-scoped update", async () => {
    const context = createPrismaMock({
      clients: [makeClient({ id: clientAId, tenantId: tenantA })]
    });
    const service = new ClientsService(context.prisma as never);

    const result = await service.update(
      tenantA,
      clientAId,
      updateClientSchema.parse({ notes: "Nueva nota" })
    );

    assert.equal(result.notes, "Nueva nota");
    assert.deepEqual(context.updateWheres[0], { id: clientAId, tenantId: tenantA });
  });

  it("changes human to legal entity and clears incompatible fields", async () => {
    const context = createPrismaMock({
      clients: [
        makeClient({
          cuil: "27301112221",
          dni: "30111222",
          id: clientAId,
          salaryReceiptRef: "recibo.pdf",
          tenantId: tenantA
        })
      ]
    });
    const service = new ClientsService(context.prisma as never);

    const result = await service.update(
      tenantA,
      clientAId,
      updateClientSchema.parse({
        businessName: "Empresa SA",
        cuit: "30711222334",
        type: "legal_entity"
      })
    );

    assert.equal(result.type, "legal_entity");
    assert.equal(result.businessName, "Empresa SA");
    assert.equal(result.firstName, null);
    assert.equal(result.dni, null);
    assert.equal(result.cuil, null);
    assert.equal(result.salaryReceiptRef, null);
  });

  it("changes legal entity to human and clears incompatible fields", async () => {
    const context = createPrismaMock({
      clients: [
        makeClient({
          businessName: "Empresa SA",
          cuit: "30711222334",
          firstName: null,
          id: clientAId,
          lastName: null,
          statute: "estatuto.pdf",
          tenantId: tenantA,
          type: ClientType.legal_entity
        })
      ]
    });
    const service = new ClientsService(context.prisma as never);

    const result = await service.update(
      tenantA,
      clientAId,
      updateClientSchema.parse({ firstName: "Ana", lastName: "Perez", type: "human" })
    );

    assert.equal(result.type, "human");
    assert.equal(result.firstName, "Ana");
    assert.equal(result.businessName, null);
    assert.equal(result.cuit, null);
    assert.equal(result.statute, null);
  });

  it("rejects duplicates while excluding the current client", async () => {
    const context = createPrismaMock({
      clients: [
        makeClient({ dni: "30111222", id: clientAId, tenantId: tenantA }),
        makeClient({ dni: "30999888", id: clientBId, tenantId: tenantA })
      ]
    });
    const service = new ClientsService(context.prisma as never);

    await service.update(
      tenantA,
      clientAId,
      updateClientSchema.parse({ notes: "Mantiene su DNI" })
    );
    await assert.rejects(
      () => service.update(tenantA, clientAId, updateClientSchema.parse({ dni: "30999888" })),
      ConflictException
    );
  });

  it("returns not found for an update outside the active tenant", async () => {
    const context = createPrismaMock({
      clients: [makeClient({ id: clientAId, tenantId: tenantB })]
    });
    const service = new ClientsService(context.prisma as never);

    await assert.rejects(
      () => service.update(tenantA, clientAId, updateClientSchema.parse({ notes: "No" })),
      NotFoundException
    );
  });
});

describe("ClientsService archive", () => {
  it("archives without deleting the client or its relations", async () => {
    const relatedCase = makeRelatedCase();
    const context = createPrismaMock({
      clients: [makeClient({ id: clientAId, primaryCases: [relatedCase], tenantId: tenantA })]
    });
    const service = new ClientsService(context.prisma as never);

    const result = await service.archive(tenantA, clientAId);

    assert.deepEqual(result, {
      clientId: clientAId,
      clientStatus: "archived",
      status: "ok"
    });
    assert.equal(context.clients.length, 1);
    assert.equal(context.clients[0]?.status, ClientStatus.archived);
    assert.equal(context.clients[0]?.primaryCases.length, 1);
  });

  it("is idempotent when the client is already archived", async () => {
    const context = createPrismaMock({
      clients: [makeClient({ id: clientAId, status: ClientStatus.archived, tenantId: tenantA })]
    });
    const service = new ClientsService(context.prisma as never);

    const result = await service.archive(tenantA, clientAId);

    assert.equal(result.clientStatus, "archived");
    assert.equal(context.updateWheres.length, 0);
  });

  it("returns not found when the client is missing from the active tenant", async () => {
    const context = createPrismaMock({
      clients: [makeClient({ id: clientAId, tenantId: tenantB })]
    });
    const service = new ClientsService(context.prisma as never);

    await assert.rejects(() => service.archive(tenantA, clientAId), NotFoundException);
  });
});

function createPrismaMock({
  clients = [],
  listRows = []
}: {
  clients?: MockClient[];
  listRows?: MockListRow[];
} = {}) {
  const state = clients.map((client) => structuredClone(client));
  const listQueries: Prisma.Sql[] = [];
  const runWithTenantCalls: string[] = [];
  const updateWheres: unknown[] = [];
  let createdSequence = 1;

  const tx = {
    $queryRaw: async (query: Prisma.Sql) => {
      listQueries.push(query);
      return listRows;
    },
    client: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const id = `90000000-0000-4000-8000-${String(createdSequence).padStart(12, "0")}`;
        createdSequence += 1;
        state.push(makeClient({ ...data, id } as Partial<MockClient>));
        return { id };
      },
      findFirst: async ({ where }: { where: MockClientWhere }) =>
        state.find((client) => matchesClientWhere(client, where)) ?? null,
      updateMany: async ({
        data,
        where
      }: {
        data: Record<string, unknown>;
        where: MockClientWhere;
      }) => {
        updateWheres.push(where);
        let count = 0;
        for (const client of state) {
          if (matchesClientWhere(client, where)) {
            Object.assign(client, data, { updatedAt: new Date("2026-08-28T13:00:00.000Z") });
            count += 1;
          }
        }
        return { count };
      }
    }
  };

  return {
    clients: state,
    listQueries,
    prisma: {
      runWithTenant: async (
        tenantId: string,
        callback: (client: typeof tx) => Promise<unknown>
      ) => {
        runWithTenantCalls.push(tenantId);
        return callback(tx);
      }
    },
    runWithTenantCalls,
    updateWheres
  };
}

function matchesClientWhere(client: MockClient, where: MockClientWhere) {
  if (where.tenantId !== undefined && client.tenantId !== where.tenantId) {
    return false;
  }

  if (typeof where.id === "string" && client.id !== where.id) {
    return false;
  }

  if (typeof where.id === "object" && where.id?.not === client.id) {
    return false;
  }

  for (const field of ["dni", "cuil", "cuit"] as const) {
    if (where[field] !== undefined && client[field] !== where[field]) {
      return false;
    }
  }

  return true;
}

function makeClient(overrides: Partial<MockClient> = {}): MockClient {
  return {
    address: null,
    age: 38,
    businessName: null,
    caseParticipations: [],
    cbu: null,
    createdAt: new Date("2026-08-28T12:00:00.000Z"),
    cuil: null,
    cuit: null,
    dni: null,
    email: null,
    firstName: "Ana",
    id: clientAId,
    lastName: "Perez",
    notes: null,
    phone: null,
    primaryCases: [],
    salaryReceiptRef: null,
    statute: null,
    status: ClientStatus.active,
    tenantId: tenantA,
    type: ClientType.human,
    updatedAt: new Date("2026-08-28T12:00:00.000Z"),
    ...overrides
  };
}

function makeRelatedCase(overrides: Partial<MockRelatedCase> = {}): MockRelatedCase {
  return {
    caption: "Perez c/ Gomez",
    caseNumber: "EXP-001/2026",
    id: "10000000-0000-4000-8000-000000000001",
    status: "open",
    ...overrides
  };
}

function makeListRow(overrides: Partial<MockListRow> = {}): MockListRow {
  return {
    casesCount: 0,
    createdAt: new Date("2026-08-28T12:00:00.000Z"),
    cuil: null,
    cuit: null,
    displayName: "Ana Perez",
    dni: "30111222",
    email: "ana@ejemplo.com",
    id: clientAId,
    phone: null,
    sortValue: "ana perez",
    status: "active",
    type: "human",
    updatedAt: new Date("2026-08-28T12:00:00.000Z"),
    ...overrides
  };
}

function getSqlText(query: Prisma.Sql | undefined) {
  assert.ok(query);
  return query.strings.join("?");
}

function getSqlValues(query: Prisma.Sql | undefined) {
  assert.ok(query);
  return query.values;
}

type MockRelatedCase = {
  caption: string;
  caseNumber: string;
  id: string;
  status: "open" | "paused" | "closed";
};

type MockClient = {
  address: string | null;
  age: number | null;
  businessName: string | null;
  caseParticipations: Array<{ case: MockRelatedCase }>;
  cbu: string | null;
  createdAt: Date;
  cuil: string | null;
  cuit: string | null;
  dni: string | null;
  email: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  notes: string | null;
  phone: string | null;
  primaryCases: MockRelatedCase[];
  salaryReceiptRef: string | null;
  statute: string | null;
  status: ClientStatus;
  tenantId: string;
  type: ClientType;
  updatedAt: Date;
};

type MockClientWhere = {
  cuil?: string | null;
  cuit?: string | null;
  dni?: string | null;
  id?: string | { not?: string };
  tenantId?: string;
};

type MockListRow = {
  casesCount: bigint | number;
  createdAt: Date;
  cuil: string | null;
  cuit: string | null;
  displayName: string;
  dni: string | null;
  email: string | null;
  id: string;
  phone: string | null;
  sortValue: Date | string;
  status: "active" | "inactive" | "archived";
  type: "human" | "legal_entity";
  updatedAt: Date;
};
