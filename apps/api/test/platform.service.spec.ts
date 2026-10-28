import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformService } from "../src/platform/platform.service";

describe("PlatformService user summaries", () => {
  it("counts founder accounts by active and inactive status", async () => {
    const countCalls: unknown[] = [];
    const service = new PlatformService({
      $transaction: async (queries: Promise<unknown>[]) => Promise.all(queries),
      user: {
        count: async (input: unknown) => {
          countCalls.push(input);
          return [12, 9, 3][countCalls.length - 1];
        }
      }
    } as never);

    const summary = await service.getDashboardSummary();

    assert.deepEqual(summary.users.active, 9);
    assert.deepEqual(summary.users.inactive, 3);
    assert.deepEqual(summary.users.total, 12);
    assert.deepEqual(countCalls, [
      {
        where: {
          createdTenants: { some: {} },
          platformRoleAssignment: null
        }
      },
      {
        where: {
          createdTenants: { some: {} },
          platformRoleAssignment: null,
          status: "active"
        }
      },
      {
        where: {
          createdTenants: { some: {} },
          platformRoleAssignment: null,
          status: "inactive"
        }
      }
    ]);
  });

  it("lists only founders and exposes people counts without private fields", async () => {
    let listInput: Record<string, unknown> | null = null;
    const service = new PlatformService({
      user: {
        findMany: async (input: Record<string, unknown>) => {
          listInput = input;
          return [
            {
              createdAt: new Date("2026-01-10T00:00:00.000Z"),
              createdTenants: [
                {
                  _count: { memberships: 4 },
                  id: "10000000-0000-0000-0000-000000000001",
                  name: "Estudio Perez",
                  status: "active"
                }
              ],
              email: "ana@example.com",
              fullName: "Ana Perez",
              id: "00000000-0000-0000-0000-000000000001",
              lastLoginAt: new Date("2026-02-10T00:00:00.000Z"),
              status: "active"
            }
          ];
        }
      }
    } as never);

    const result = await service.listUsers({
      limit: 20,
      search: "ana",
      sortBy: "createdAt",
      sortDirection: "desc"
    });

    const listedWhere = (listInput as unknown as { where: { platformRoleAssignment?: unknown } })
      .where;
    assert.equal(listedWhere.platformRoleAssignment, null);
    assert.deepEqual(listedWhere, {
      OR: [
        { email: { contains: "ana", mode: "insensitive" } },
        { fullName: { contains: "ana", mode: "insensitive" } }
      ],
      createdTenants: { some: {} },
      platformRoleAssignment: null
    });
    assert.deepEqual(result.items, [
      {
        createdAt: new Date("2026-01-10T00:00:00.000Z"),
        email: "ana@example.com",
        foundedTenants: [
          {
            id: "10000000-0000-0000-0000-000000000001",
            name: "Estudio Perez",
            peopleCount: 4,
            status: "active"
          }
        ],
        fullName: "Ana Perez",
        id: "00000000-0000-0000-0000-000000000001",
        lastLoginAt: new Date("2026-02-10T00:00:00.000Z"),
        peopleCount: 4,
        status: "active"
      }
    ]);
    assert.equal("dni" in result.items[0]!, false);
    assert.equal("phone" in result.items[0]!, false);
  });

  it("uses a compound seek cursor instead of offset pagination", async () => {
    const listInputs: Array<Record<string, unknown>> = [];
    const rows = [
      {
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
        createdTenants: [],
        email: "a@example.com",
        fullName: "A",
        id: "00000000-0000-0000-0000-000000000002",
        lastLoginAt: null,
        status: "active"
      },
      {
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        createdTenants: [],
        email: "b@example.com",
        fullName: "B",
        id: "00000000-0000-0000-0000-000000000001",
        lastLoginAt: null,
        status: "active"
      }
    ];
    const service = new PlatformService({
      user: {
        findMany: async (input: Record<string, unknown>) => {
          listInputs.push(input);
          return listInputs.length === 1 ? rows : [];
        }
      }
    } as never);

    const firstPage = await service.listUsers({
      limit: 1,
      sortBy: "createdAt",
      sortDirection: "desc"
    });
    await service.listUsers({
      cursor: firstPage.pageInfo.nextCursor ?? undefined,
      limit: 1,
      sortBy: "createdAt",
      sortDirection: "desc"
    });

    assert.equal("cursor" in listInputs[1]!, false);
    assert.equal("skip" in listInputs[1]!, false);
    assert.deepEqual(listInputs[1]!.where, {
      AND: [
        { createdTenants: { some: {} }, platformRoleAssignment: null },
        {
          OR: [
            { createdAt: { lt: new Date("2026-04-02T00:00:00.000Z") } },
            {
              createdAt: new Date("2026-04-02T00:00:00.000Z"),
              id: { lt: "00000000-0000-0000-0000-000000000002" }
            }
          ]
        }
      ]
    });
  });

  it("rejects an invalid user-list cursor", async () => {
    const service = new PlatformService({} as never);

    await assert.rejects(
      service.listUsers({
        cursor: "not-a-cursor",
        limit: 20,
        sortBy: "createdAt",
        sortDirection: "desc"
      }),
      /cursor de usuarios es invalido/i
    );
  });
});
