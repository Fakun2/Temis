import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { PrismaService } from "../src/database/prisma.service";
import { CaseTasksUseCase } from "../src/cases/use-cases/case-tasks.use-case";
import { NotificationsService } from "../src/notifications/notifications.service";

const tenantId = "11111111-1111-4111-8111-111111111111";
const caseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const clientId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const taskId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("CaseTasksUseCase global list", () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it("lists tenant-scoped tasks with case and client context", async () => {
    const findManyCalls: unknown[] = [];
    const useCase = makeUseCase({
      findManyCalls,
      rows: [makeGlobalTask()]
    });

    const response = await useCase.listTenant(tenantId, {
      clientId,
      limit: 8,
      offset: 0,
      search: "presentar",
      sortBy: "createdAt",
      sortDirection: "desc"
    });

    assert.equal(response.items.length, 1);
    assert.equal(response.items[0]?.case?.caseNumber, "EXP-123/2026");
    assert.deepEqual(response.items[0]?.client, {
      displayName: "Ana Perez",
      id: clientId
    });
    assert.equal(response.pageInfo.hasNextPage, false);

    const call = findManyCalls[0] as {
      skip: number;
      take: number;
      where: {
        AND: Array<{ OR: unknown[] }>;
        case: { OR: unknown[]; tenantId: string };
        tenantId: string;
      };
    };

    assert.equal(call.take, 9);
    assert.equal(call.skip, undefined);
    assert.equal(call.where.tenantId, tenantId);
    assert.equal(call.where.case.tenantId, tenantId);
    assert.equal(call.where.case.OR.length, 2);
    assert.equal(call.where.AND[0]?.OR.length, 4);
  });

  it("applies overdue filters only to actionable tasks", async () => {
    const findManyCalls: unknown[] = [];
    const useCase = makeUseCase({
      findManyCalls,
      rows: []
    });

    mock.timers.enable({
      apis: ["Date"],
      now: new Date("2026-09-02T15:00:00.000Z")
    });

    await useCase.listTenant(tenantId, {
      dueStatus: "overdue",
      limit: 8,
      offset: 0,
      sortBy: "createdAt",
      sortDirection: "desc"
    });

    const call = findManyCalls[0] as {
      where: {
        endDate: { lt: Date };
        status: { in: string[] };
        tenantId: string;
      };
    };

    assert.equal(call.where.tenantId, tenantId);
    assert.deepEqual(call.where.status.in, ["pending", "in_progress"]);
    assert.equal(call.where.endDate.lt.toISOString(), "2026-09-02T00:00:00.000Z");
  });

  it("orders tenant tasks by requested fields", async () => {
    const findManyCalls: unknown[] = [];
    const useCase = makeUseCase({
      findManyCalls,
      rows: []
    });

    await useCase.listTenant(tenantId, {
      limit: 8,
      offset: 16,
      sortBy: "name",
      sortDirection: "asc"
    });

    const call = findManyCalls[0] as {
      orderBy: unknown[];
      skip: number;
    };

    assert.equal(call.skip, undefined);
    assert.deepEqual(call.orderBy, [{ name: "asc" }, { createdAt: "desc" }, { id: "asc" }]);
  });

  it("counts task metrics with the seven day due-soon window", async () => {
    const countCalls: unknown[] = [];
    const useCase = makeUseCase({
      countCalls,
      rows: []
    });

    mock.timers.enable({
      apis: ["Date"],
      now: new Date("2026-09-02T15:00:00.000Z")
    });

    const metrics = await useCase.getTenantMetrics(tenantId);

    assert.deepEqual(metrics, {
      done: 2,
      dueSoon: 3,
      overdue: 4,
      todo: 1
    });
    assert.deepEqual(
      countCalls.map((call) => (call as { where: { tenantId: string } }).where.tenantId),
      [tenantId, tenantId, tenantId, tenantId]
    );

    const dueSoonCall = countCalls[2] as {
      where: { endDate: { gte: Date; lte: Date }; status: { in: string[] } };
    };
    assert.equal(dueSoonCall.where.endDate.gte.toISOString(), "2026-09-02T00:00:00.000Z");
    assert.equal(dueSoonCall.where.endDate.lte.toISOString(), "2026-09-09T00:00:00.000Z");
    assert.deepEqual(dueSoonCall.where.status.in, ["pending", "in_progress"]);
  });
});

describe("CaseTasksUseCase task boards", () => {
  it("creates tenant-scoped boards with validated filters", async () => {
    const calls: unknown[] = [];
    const useCase = makeBoardUseCase({ calls });

    const board = await useCase.createBoard(tenantId, "user-id", {
      name: "Tablero de cliente Ana",
      filters: {
        assignedMembershipId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        caseId,
        clientId
      },
      settings: {
        chartGroupBy: "status",
        chartShowHorizontalLines: true,
        chartSortBy: "count",
        chartSortDirection: "desc",
        chartType: "vertical_bar",
        hideZeroValues: false,
        kanbanCardLayout: "compact",
        kanbanCardSize: "medium",
        kanbanColorColumns: true,
        openTaskIn: "side_sheet",
        sortBy: "endDate",
        sortDirection: "asc",
        viewMode: "kanban",
        visibleProperties: ["case", "client"]
      }
    });

    assert.equal(board.name, "Tablero de cliente Ana");
    assert.deepEqual(board.filters, {
      assignedMembershipId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      caseId,
      clientId
    });
    assert.deepEqual(board.settings, {
      chartGroupBy: "status",
      chartShowHorizontalLines: true,
      chartSortBy: "count",
      chartSortDirection: "desc",
      chartType: "vertical_bar",
      hideZeroValues: false,
      kanbanCardLayout: "compact",
      kanbanCardSize: "medium",
      kanbanColorColumns: true,
      openTaskIn: "side_sheet",
      sortBy: "endDate",
      sortDirection: "asc",
      viewMode: "kanban",
      visibleProperties: ["case", "client"]
    });

    const createCall = calls.find((call) => (call as { model?: string }).model === "create");
    assert.deepEqual((createCall as { data: { tenantId: string; createdByMembershipId: string } }).data, {
      createdByMembershipId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      filters: {
        assignedMembershipId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        caseId,
        clientId
      },
      name: "Tablero de cliente Ana",
      settings: {
        chartGroupBy: "status",
        chartShowHorizontalLines: true,
        chartSortBy: "count",
        chartSortDirection: "desc",
        chartType: "vertical_bar",
        hideZeroValues: false,
        kanbanCardLayout: "compact",
        kanbanCardSize: "medium",
        kanbanColorColumns: true,
        openTaskIn: "side_sheet",
        sortBy: "endDate",
        sortDirection: "asc",
        viewMode: "kanban",
        visibleProperties: ["case", "client"]
      },
      tenantId
    });
  });

  it("rejects board filters with cross-tenant relations", async () => {
    const useCase = makeBoardUseCase({ clientExists: false });

    await assert.rejects(
      () =>
        useCase.createBoard(tenantId, "user-id", {
          name: "Tablero invalido",
          filters: { clientId }
        }),
      /cliente del tablero no pertenece/i
    );
  });

  it("lists, updates and deletes boards inside the active tenant", async () => {
    const calls: unknown[] = [];
    const useCase = makeBoardUseCase({ calls });

    await useCase.listBoards(tenantId);
    await useCase.updateBoard(tenantId, "ffffffff-ffff-4fff-8fff-ffffffffffff", {
      name: "Tablero actualizado"
    });
    await useCase.deleteBoard(tenantId, "ffffffff-ffff-4fff-8fff-ffffffffffff");

    assert.deepEqual(
      calls
        .filter((call) => (call as { where?: { tenantId?: string } }).where?.tenantId)
        .map((call) => (call as { where: { tenantId: string } }).where.tenantId),
      [tenantId, tenantId, tenantId]
    );
  });
});

function makeUseCase({
  countCalls = [],
  findManyCalls,
  rows
}: {
  countCalls?: unknown[];
  findManyCalls?: unknown[];
  rows: unknown[];
}) {
  let count = 0;
  const prisma = {
    caseTask: {
      count: async (args: unknown) => {
        countCalls.push(args);
        count += 1;
        return count;
      },
      findMany: async (args: unknown) => {
        findManyCalls?.push(args);
        return rows;
      }
    }
  } as unknown as PrismaService;
  const notifications = {
    getReminderConfigs: async () => new Map()
  } as unknown as NotificationsService;

  return new CaseTasksUseCase(prisma, notifications);
}

function makeGlobalTask() {
  return {
    assignedMembershipId: null,
    assignedTo: null,
    case: {
      caption: "Perez c/ Gomez",
      caseNumber: "EXP-123/2026",
      id: caseId,
      participants: [],
      primaryClient: {
        businessName: null,
        firstName: "Ana",
        id: clientId,
        lastName: "Perez",
        type: "human"
      }
    },
    caseId,
    createdAt: new Date("2026-09-02T12:00:00.000Z"),
    endDate: new Date("2026-09-09T00:00:00.000Z"),
    id: taskId,
    lastSeenAt: null,
    name: "Presentar escrito",
    notes: "Notas",
    startDate: null,
    status: "pending",
    updatedAt: new Date("2026-09-02T12:00:00.000Z")
  };
}

function makeBoardUseCase({
  calls = [],
  caseExists = true,
  clientExists = true,
  membershipExists = true
}: {
  calls?: unknown[];
  caseExists?: boolean;
  clientExists?: boolean;
  membershipExists?: boolean;
} = {}) {
  const board = {
    createdAt: new Date("2026-09-03T12:00:00.000Z"),
    createdByMembershipId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    filters: {
      assignedMembershipId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      caseId,
      clientId
    },
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    name: "Tablero de cliente Ana",
    settings: {
      chartGroupBy: "status",
      chartShowHorizontalLines: true,
      chartSortBy: "count",
      chartSortDirection: "desc",
      chartType: "vertical_bar",
      hideZeroValues: false,
      kanbanCardLayout: "compact",
      kanbanCardSize: "medium",
      kanbanColorColumns: true,
      openTaskIn: "side_sheet",
      sortBy: "createdAt",
      sortDirection: "desc",
      viewMode: "table",
      visibleProperties: ["case", "client", "assignedTo", "endDate", "status"]
    },
    updatedAt: new Date("2026-09-03T12:00:00.000Z")
  };
  const prisma = {
    case: {
      findFirst: async (args: unknown) => {
        calls.push({ model: "case", ...(args as object) });
        return caseExists ? { id: caseId } : null;
      }
    },
    client: {
      findFirst: async (args: unknown) => {
        calls.push({ model: "client", ...(args as object) });
        return clientExists ? { id: clientId } : null;
      }
    },
    taskBoardView: {
      create: async (args: unknown) => {
        calls.push({ model: "create", ...(args as object) });
        return {
          ...board,
          ...((args as { data?: { filters?: unknown; name?: string } }).data ?? {})
        };
      },
      delete: async (args: unknown) => {
        calls.push({ model: "delete", ...(args as object) });
        return board;
      },
      findFirst: async (args: unknown) => {
        calls.push({ model: "board", ...(args as object) });
        return board;
      },
      findMany: async (args: unknown) => {
        calls.push({ model: "list", ...(args as object) });
        return [board];
      },
      update: async (args: unknown) => {
        calls.push({ model: "update", ...(args as object) });
        return {
          ...board,
          ...((args as { data?: { filters?: unknown; name?: string } }).data ?? {})
        };
      }
    },
    tenantMembership: {
      findFirst: async (args: unknown) => {
        calls.push({ model: "membership", ...(args as object) });
        return membershipExists ? { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" } : null;
      }
    }
  } as unknown as PrismaService;
  const notifications = {
    getReminderConfigs: async () => new Map()
  } as unknown as NotificationsService;

  return new CaseTasksUseCase(prisma, notifications);
}
