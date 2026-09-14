import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  createNotionMappingSchema,
  notionPropertyMappingSchema,
  notionStatusMappingSchema,
  type CreateNotionMappingInput,
  type ListNotionDataSourcesQuery,
  type NotionPropertyMapping,
  type NotionStatusMapping,
  type ResolveNotionConflictInput,
  type UpdateNotionMappingInput
} from "./notion.schemas";
import {
  NotionClientService,
  type NotionPage,
  type NotionProperty
} from "./notion-client.service";
import { NotionTokenService } from "./notion-token.service";

type TaskSnapshot = {
  caseLabel?: string | null;
  endDate: string | null;
  name: string;
  notes: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
};

@Injectable()
export class NotionIntegrationService {
  constructor(
    private readonly notion: NotionClientService,
    private readonly prisma: PrismaService,
    private readonly tokens: NotionTokenService
  ) {}

  async getStatus(tenantId: string) {
    const connection = await this.prisma.notionConnection.findFirst({
      where: { tenantId, status: "connected" },
      orderBy: { updatedAt: "desc" }
    });
    const [mappings, openConflicts] = await Promise.all([
      this.prisma.notionTaskBoardMapping.findMany({
        where: { tenantId },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }]
      }),
      this.prisma.notionSyncConflict.count({ where: { tenantId, status: "open" } })
    ]);

    return {
      connection: connection
        ? {
            connected: true,
            workspaceId: connection.workspaceId,
            workspaceName: connection.workspaceName,
            lastSyncAt: connection.lastSyncAt?.toISOString() ?? null
          }
        : { connected: false, workspaceId: null, workspaceName: null, lastSyncAt: null },
      mappings: mappings.map(toMappingDto),
      openConflicts
    };
  }

  async getAuthorizationUrl(tenantId: string, actorUserId: string) {
    const clientId = getRequiredEnv("NOTION_CLIENT_ID");
    const redirectUri = getNotionRedirectUri();
    const state = signOAuthState({ tenantId, userId: actorUserId, exp: Date.now() + 10 * 60_000 });
    const url = new URL("https://api.notion.com/v1/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    return { authorizationUrl: url.toString() };
  }

  async completeOAuth(tenantId: string, actorUserId: string, input: { code: string; state: string }) {
    const state = verifyOAuthState(input.state);
    if (state.tenantId !== tenantId || state.userId !== actorUserId) {
      throw new BadRequestException("La autorizacion de Notion no corresponde a este workspace.");
    }

    const membershipId = await this.findActorMembershipIdOrThrow(tenantId, actorUserId);
    const token = await this.notion.exchangeCode({
      code: input.code,
      redirectUri: getNotionRedirectUri()
    });
    const connection = await this.prisma.notionConnection.upsert({
      where: {
        tenantId_workspaceId: {
          tenantId,
          workspaceId: token.workspace_id
        }
      },
      create: {
        botId: token.bot_id,
        connectedByMembershipId: membershipId,
        encryptedAccessToken: this.tokens.encrypt(token.access_token),
        encryptedRefreshToken: token.refresh_token ? this.tokens.encrypt(token.refresh_token) : null,
        status: "connected",
        tenantId,
        workspaceIcon: token.workspace_icon,
        workspaceId: token.workspace_id,
        workspaceName: token.workspace_name
      },
      update: {
        botId: token.bot_id,
        connectedByMembershipId: membershipId,
        encryptedAccessToken: this.tokens.encrypt(token.access_token),
        encryptedRefreshToken: token.refresh_token ? this.tokens.encrypt(token.refresh_token) : null,
        status: "connected",
        workspaceIcon: token.workspace_icon,
        workspaceName: token.workspace_name
      }
    });

    return {
      connected: true,
      lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
      workspaceId: connection.workspaceId,
      workspaceName: connection.workspaceName
    };
  }

  async disconnect(tenantId: string) {
    await this.prisma.notionConnection.updateMany({
      where: { tenantId },
      data: { status: "disconnected" }
    });
    await this.prisma.notionTaskBoardMapping.updateMany({
      where: { tenantId },
      data: { enabled: false }
    });

    return { status: "ok" as const };
  }

  async listDataSources(tenantId: string, query: ListNotionDataSourcesQuery) {
    const connection = await this.findConnectedConnectionOrThrow(tenantId);
    const token = this.tokens.decrypt(connection.encryptedAccessToken);
    const response = await this.notion.searchDataSources({
      cursor: query.cursor,
      pageSize: query.limit,
      query: query.search,
      token
    });

    return {
      items: response.results.map((item) => ({
        id: item.id,
        title: item.title?.map((part) => part.plain_text).filter(Boolean).join("") || "Data source sin titulo"
      })),
      nextCursor: response.next_cursor
    };
  }

  async createMapping(tenantId: string, input: CreateNotionMappingInput) {
    const connection = await this.findConnectedConnectionOrThrow(tenantId);
    const parsedInput = createNotionMappingSchema.parse(input);
    const token = this.tokens.decrypt(connection.encryptedAccessToken);
    const dataSource = await this.notion.retrieveDataSource({
      dataSourceId: parsedInput.dataSourceId,
      token
    });
    const propertyMapping = getResolvedPropertyMapping(
      dataSource.properties,
      parsedInput.propertyMapping
    );
    const mapping = await this.prisma.notionTaskBoardMapping.upsert({
      where: {
        tenantId_dataSourceId: {
          dataSourceId: parsedInput.dataSourceId,
          tenantId
        }
      },
      create: {
        connectionId: connection.id,
        dataSourceId: parsedInput.dataSourceId,
        dataSourceName: parsedInput.dataSourceName,
        enabled: parsedInput.enabled,
        propertyMapping: toInputJson(propertyMapping),
        statusMapping: toInputJson(parsedInput.statusMapping),
        syncIntervalMinutes: parsedInput.syncIntervalMinutes,
        tenantId
      },
      update: {
        connectionId: connection.id,
        dataSourceName: parsedInput.dataSourceName,
        enabled: parsedInput.enabled,
        propertyMapping: toInputJson(propertyMapping),
        statusMapping: toInputJson(parsedInput.statusMapping),
        syncIntervalMinutes: parsedInput.syncIntervalMinutes
      }
    });

    return toMappingDto(mapping);
  }

  async updateMapping(tenantId: string, mappingId: string, input: UpdateNotionMappingInput) {
    await this.findTenantMappingOrThrow(tenantId, mappingId);
    const mapping = await this.prisma.notionTaskBoardMapping.update({
      where: { id: mappingId },
      data: {
        ...(input.dataSourceName ? { dataSourceName: input.dataSourceName } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.propertyMapping ? { propertyMapping: toInputJson(notionPropertyMappingSchema.parse(input.propertyMapping)) } : {}),
        ...(input.statusMapping ? { statusMapping: toInputJson(notionStatusMappingSchema.parse(input.statusMapping)) } : {}),
        ...(input.syncIntervalMinutes ? { syncIntervalMinutes: input.syncIntervalMinutes } : {})
      }
    });

    return toMappingDto(mapping);
  }

  async syncMapping(tenantId: string, mappingId: string) {
    const mapping = await this.findTenantMappingOrThrow(tenantId, mappingId);
    return this.runSync(tenantId, mapping.id);
  }

  async runDueSync(limit = 5) {
    const mappings = await this.prisma.notionTaskBoardMapping.findMany({
      where: {
        enabled: true,
        connection: { status: "connected" }
      },
      orderBy: [{ lastPullAt: "asc" }, { id: "asc" }],
      take: limit * 4,
      select: { id: true, lastPullAt: true, syncIntervalMinutes: true, tenantId: true }
    });
    const dueMappings = mappings
      .filter((mapping) => isMappingDue(mapping.lastPullAt, mapping.syncIntervalMinutes))
      .slice(0, limit);

    for (const mapping of dueMappings) {
      await this.runSync(mapping.tenantId, mapping.id).catch(() => undefined);
    }
  }

  async listConflicts(tenantId: string) {
    const conflicts = await this.prisma.notionSyncConflict.findMany({
      where: { tenantId, status: "open" },
      include: { mapping: { select: { dataSourceName: true } } },
      orderBy: [{ detectedAt: "desc" }, { id: "asc" }]
    });

    return {
      items: conflicts.map((conflict) => ({
        dataSourceName: conflict.mapping.dataSourceName,
        detectedAt: conflict.detectedAt.toISOString(),
        fieldDiff: conflict.fieldDiff,
        id: conflict.id,
        notionPageId: conflict.notionPageId,
        taskId: conflict.taskId
      }))
    };
  }

  async resolveConflict(tenantId: string, conflictId: string, input: ResolveNotionConflictInput) {
    const conflict = await this.prisma.notionSyncConflict.findFirst({
      where: { id: conflictId, tenantId, status: "open" },
      select: { id: true, mappingId: true, notionPageId: true, taskId: true }
    });
    if (!conflict) {
      throw new NotFoundException("El conflicto de Notion no existe en este workspace.");
    }

    if (input.resolution === "manual" && input.manualTask && conflict.taskId) {
      await this.prisma.caseTask.update({
        where: { id: conflict.taskId },
        data: {
          ...(input.manualTask.name ? { name: input.manualTask.name } : {}),
          ...(input.manualTask.status ? { status: input.manualTask.status } : {}),
          ...(input.manualTask.endDate !== undefined
            ? { endDate: input.manualTask.endDate ? toDateOnly(input.manualTask.endDate) : null }
            : {}),
          ...(input.manualTask.notes !== undefined ? { notes: input.manualTask.notes ?? null } : {})
        }
      });
    }

    if ((input.resolution === "bogapp" || input.resolution === "manual") && conflict.taskId) {
      await this.prisma.notionTaskLink.updateMany({
        where: { taskId: conflict.taskId, tenantId },
        data: { syncState: "pending_push" }
      });
      await this.runSync(tenantId, conflict.mappingId);
    }

    if (input.resolution === "notion") {
      await this.pullSinglePage(tenantId, conflict.mappingId, conflict.notionPageId);
    }

    await this.prisma.notionSyncConflict.update({
      where: { id: conflict.id },
      data: { resolvedAt: new Date(), status: "resolved" }
    });

    return { status: "ok" as const };
  }

  private async runSync(tenantId: string, mappingId: string) {
    const job = await this.prisma.notionSyncJob.create({
      data: { direction: "bidirectional", mappingId, status: "processing", startedAt: new Date(), tenantId }
    });

    try {
      const mapping = await this.findTenantMappingOrThrow(tenantId, mappingId);
      const token = this.tokens.decrypt(mapping.connection.encryptedAccessToken);
      const mappingForSync = await this.resolveMappingPropertiesForSync(mapping, token);
      const pullResult = await this.pullPages(tenantId, mappingForSync, token);
      const pushResult = await this.pushPendingTasks(tenantId, mappingForSync, token);

      await this.prisma.$transaction([
        this.prisma.notionSyncJob.update({
          where: { id: job.id },
          data: { attempts: { increment: 1 }, finishedAt: new Date(), status: "completed" }
        }),
        this.prisma.notionConnection.update({
          where: { id: mapping.connectionId },
          data: { lastSyncAt: new Date() }
        }),
        this.prisma.notionTaskBoardMapping.update({
          where: { id: mapping.id },
          data: { lastPullAt: new Date(), lastPushAt: new Date() }
        })
      ]);

      return {
        status: "completed" as const,
        conflicts: pullResult.conflicts,
        imported: pullResult.imported,
        pushed: pushResult.pushed,
        updated: pullResult.updated
      };
    } catch (error) {
      await this.prisma.notionSyncJob.update({
        where: { id: job.id },
        data: {
          attempts: { increment: 1 },
          errorCode: "notion_sync_failed",
          errorMessage: sanitizeErrorMessage(error),
          finishedAt: new Date(),
          status: "failed"
        }
      });
      throw error;
    }
  }

  private async pullSinglePage(tenantId: string, mappingId: string, notionPageId: string | null) {
    if (!notionPageId) {
      return;
    }

    const mapping = await this.findTenantMappingOrThrow(tenantId, mappingId);
    const page = await this.notion.retrievePage({
      pageId: notionPageId,
      token: this.tokens.decrypt(mapping.connection.encryptedAccessToken)
    });
    await this.upsertTaskFromPage(tenantId, mapping, page);
  }

  private async pullPages(
    tenantId: string,
    mapping: TenantMapping,
    token: string
  ): Promise<{ conflicts: number; imported: number; updated: number }> {
    let cursor: string | undefined;
    let imported = 0;
    let updated = 0;
    let conflicts = 0;

    do {
      const page = await this.notion.queryDataSource({
        cursor,
        dataSourceId: mapping.dataSourceId,
        token
      });

      for (const notionPage of page.results) {
        const result = await this.upsertTaskFromPage(tenantId, mapping, notionPage);
        imported += result === "imported" ? 1 : 0;
        updated += result === "updated" ? 1 : 0;
        conflicts += result === "conflict" ? 1 : 0;
      }

      cursor = page.next_cursor ?? undefined;
    } while (cursor);

    return { conflicts, imported, updated };
  }

  private async upsertTaskFromPage(tenantId: string, mapping: TenantMapping, page: NotionPage) {
    const propertyMapping = notionPropertyMappingSchema.parse(mapping.propertyMapping);
    const statusMapping = notionStatusMappingSchema.parse(mapping.statusMapping);
    const snapshot = getTaskSnapshotFromPage(page, propertyMapping, statusMapping);
    const snapshotHash = hashSnapshot(snapshot);
    const caseId = propertyMapping.case
      ? await this.resolveCaseIdFromNotionLabel(tenantId, snapshot.caseLabel)
      : null;
    const link = await this.prisma.notionTaskLink.findFirst({
      where: { notionPageId: page.id, tenantId },
      include: { task: { include: { case: true } } }
    });

    if (!link) {
      const task = await this.prisma.caseTask.create({
        data: {
          assignedMembershipId: null,
          caseId,
          endDate: snapshot.endDate ? toDateOnly(snapshot.endDate) : null,
          name: snapshot.name,
          notes: snapshot.notes,
          status: snapshot.status,
          tenantId
        }
      });
      await this.prisma.notionTaskLink.create({
        data: {
          lastBogAppUpdatedAt: task.updatedAt,
          lastNotionEditedAt: page.last_edited_time ? new Date(page.last_edited_time) : null,
          lastSyncedHash: snapshotHash,
          mappingId: mapping.id,
          notionPageId: page.id,
          syncState: "synced",
          taskId: task.id,
          tenantId
        }
      });
      return "imported" as const;
    }

    const notionEditedAt = page.last_edited_time ? new Date(page.last_edited_time) : null;
    const notionChanged =
      notionEditedAt && (!link.lastNotionEditedAt || notionEditedAt > link.lastNotionEditedAt);
    const bogappChanged = link.task.updatedAt > (link.lastBogAppUpdatedAt ?? new Date(0));
    const mappedDataChanged = link.lastSyncedHash !== snapshotHash;

    if (mappedDataChanged && bogappChanged) {
      await this.createConflict(tenantId, mapping.id, link.taskId, page.id, {
        bogapp: toTaskSnapshot(link.task, Boolean(propertyMapping.case)),
        notion: snapshot
      });
      await this.prisma.notionTaskLink.update({
        where: { id: link.id },
        data: { syncState: "conflict" }
      });
      return "conflict" as const;
    }

    if (!mappedDataChanged) {
      if (notionChanged) {
        await this.prisma.notionTaskLink.update({
          where: { id: link.id },
          data: { lastNotionEditedAt: notionEditedAt }
        });
      }
      return "skipped" as const;
    }

    const task = await this.prisma.caseTask.update({
      where: { id: link.taskId },
      data: {
        ...(propertyMapping.case ? { caseId } : {}),
        endDate: snapshot.endDate ? toDateOnly(snapshot.endDate) : null,
        name: snapshot.name,
        notes: snapshot.notes,
        status: snapshot.status
      }
    });
    await this.prisma.notionTaskLink.update({
      where: { id: link.id },
      data: {
        lastBogAppUpdatedAt: task.updatedAt,
        lastNotionEditedAt: notionEditedAt,
        lastSyncedHash: snapshotHash,
        syncState: "synced"
      }
    });

    return "updated" as const;
  }

  private async pushPendingTasks(tenantId: string, mapping: SyncMapping, token: string) {
    const links = await this.prisma.notionTaskLink.findMany({
      where: { mappingId: mapping.id, syncState: "pending_push", tenantId },
      include: { task: { include: { assignedTo: { include: { user: true } }, case: true } } },
      take: 50
    });
    const propertyMapping = notionPropertyMappingSchema.parse(mapping.propertyMapping);
    const statusMapping = notionStatusMappingSchema.parse(mapping.statusMapping);
    let pushed = 0;

    for (const link of links) {
      const snapshot = toTaskSnapshot(link.task, Boolean(propertyMapping.case));
      await this.notion.updatePage({
        pageId: link.notionPageId,
        properties: getNotionPropertiesFromTask(
          snapshot,
          propertyMapping,
          statusMapping,
          mapping.notionStatusOptions
        ),
        token
      });
      await this.prisma.notionTaskLink.update({
        where: { id: link.id },
        data: {
          lastBogAppUpdatedAt: link.task.updatedAt,
          lastSyncedHash: hashSnapshot(snapshot),
          syncState: "synced"
        }
      });
      pushed += 1;
    }

    return { pushed };
  }

  private async resolveMappingPropertiesForSync(mapping: TenantMapping, token: string): Promise<SyncMapping> {
    const dataSource = await this.notion.retrieveDataSource({
      dataSourceId: mapping.dataSourceId,
      token
    });
    const currentMapping = notionPropertyMappingSchema.parse(mapping.propertyMapping);
    const resolvedMapping = getResolvedPropertyMapping(dataSource.properties, currentMapping);
    const statusProperty = dataSource.properties[resolvedMapping.status];
    const notionStatusOptions =
      statusProperty?.status?.options?.map((option) => option.name).filter((name): name is string => Boolean(name)) ??
      statusProperty?.select?.options?.map((option) => option.name).filter((name): name is string => Boolean(name)) ??
      [];

    if (JSON.stringify(currentMapping) === JSON.stringify(resolvedMapping)) {
      return { ...mapping, notionStatusOptions };
    }

    await this.prisma.notionTaskBoardMapping.update({
      where: { id: mapping.id },
      data: { propertyMapping: toInputJson(resolvedMapping) }
    });

    return {
      ...mapping,
      notionStatusOptions,
      propertyMapping: toInputJson(resolvedMapping) as Prisma.JsonValue
    };
  }

  private async createConflict(
    tenantId: string,
    mappingId: string,
    taskId: string | null,
    notionPageId: string | null,
    fieldDiff: unknown
  ) {
    await this.prisma.notionSyncConflict.create({
      data: {
        fieldDiff: toInputJson(fieldDiff),
        mappingId,
        notionPageId,
        taskId,
        tenantId
      }
    });
  }

  private async findConnectedConnectionOrThrow(tenantId: string) {
    const connection = await this.prisma.notionConnection.findFirst({
      where: { tenantId, status: "connected" },
      orderBy: { updatedAt: "desc" }
    });
    if (!connection) {
      throw new BadRequestException("Primero conecta un workspace de Notion.");
    }

    return connection;
  }

  private async findTenantMappingOrThrow(tenantId: string, mappingId: string) {
    const mapping = await this.prisma.notionTaskBoardMapping.findFirst({
      where: { id: mappingId, tenantId },
      include: { connection: true }
    });
    if (!mapping) {
      throw new NotFoundException("El tablero de Notion no existe en este workspace.");
    }

    return mapping;
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

  private async resolveCaseIdFromNotionLabel(tenantId: string, value: string | null | undefined) {
    const label = value?.trim();
    if (!label) {
      return null;
    }

    const exactId = isUuid(label)
      ? await this.prisma.case.findFirst({ where: { id: label, tenantId }, select: { id: true } })
      : null;

    if (exactId) {
      return exactId.id;
    }

    const cases = await this.prisma.case.findMany({
      where: {
        tenantId,
        OR: [
          { caseNumber: { contains: label, mode: Prisma.QueryMode.insensitive } },
          { caption: { contains: label, mode: Prisma.QueryMode.insensitive } }
        ]
      },
      select: { caption: true, caseNumber: true, id: true },
      take: 20
    });
    const normalizedLabel = normalizeLabel(label);
    const match = cases.find((caseItem) => {
      const displayName = `${caseItem.caseNumber} - ${caseItem.caption}`;

      return [caseItem.id, caseItem.caseNumber, caseItem.caption, displayName].some(
        (candidate) => normalizeLabel(candidate) === normalizedLabel
      );
    });

    return match?.id ?? null;
  }
}

type TenantMapping = Prisma.NotionTaskBoardMappingGetPayload<{ include: { connection: true } }>;
type SyncMapping = TenantMapping & { notionStatusOptions: string[] };

function isMappingDue(lastPullAt: Date | null, syncIntervalMinutes: number) {
  if (!lastPullAt) {
    return true;
  }

  return lastPullAt.getTime() <= Date.now() - syncIntervalMinutes * 60_000;
}

function getTaskSnapshotFromPage(
  page: NotionPage,
  mapping: NotionPropertyMapping,
  statusMapping: NotionStatusMapping
): TaskSnapshot {
  const name = readTextProperty(page.properties[mapping.title]) || "Tarea sin titulo";
  const statusName = readStatusProperty(page.properties[mapping.status]);
  const endDate = readDateProperty(page.properties[mapping.dueDate]);
  const notes = mapping.notes ? readTextProperty(page.properties[mapping.notes]) : null;
  const caseLabel = mapping.case ? readTextProperty(page.properties[mapping.case]) : undefined;

  return {
    ...(mapping.case ? { caseLabel } : {}),
    endDate,
    name,
    notes,
    status: (statusName && statusMapping[statusName]) || "pending"
  };
}

function getResolvedPropertyMapping(
  properties: Record<string, { name?: string; type: string }>,
  requested: NotionPropertyMapping
): NotionPropertyMapping {
  return {
    title:
      getExistingPropertyName(properties, requested.title) ??
      inferPropertyName(properties, {
        labels: ["tarea", "task", "nombre", "name", "descripcion", "description", "titulo", "title"],
        types: ["title"]
      }) ??
      requested.title,
    status:
      getExistingPropertyName(properties, requested.status) ??
      inferPropertyName(properties, {
        labels: ["estado", "status", "fase", "stage"],
        types: ["status", "select"]
      }) ??
      requested.status,
    dueDate:
      getExistingPropertyName(properties, requested.dueDate) ??
      inferPropertyName(properties, {
        labels: ["fecha objetivo", "vencimiento", "due date", "fecha", "date"],
        types: ["date"]
      }) ??
      requested.dueDate,
    assignee:
      getExistingPropertyName(properties, requested.assignee ?? "") ??
      inferPropertyName(properties, {
        labels: ["asignado", "assignee", "responsable", "owner"],
        types: ["people"]
      }) ??
      "",
    case:
      getExistingPropertyName(properties, requested.case ?? "") ??
      inferPropertyName(properties, {
        labels: ["expediente", "case", "causa", "matter"],
        types: ["rich_text"]
      }) ??
      "",
    notes:
      getExistingPropertyName(properties, requested.notes ?? "") ??
      inferPropertyName(properties, {
        labels: ["notas", "notes", "alcance", "scope", "detalle", "details"],
        types: ["rich_text"]
      }) ??
      ""
  };
}

function getExistingPropertyName(
  properties: Record<string, { name?: string; type: string }>,
  name: string
) {
  const normalized = normalizeLabel(name);
  if (!normalized) {
    return null;
  }

  return Object.keys(properties).find((propertyName) => normalizeLabel(propertyName) === normalized) ?? null;
}

function inferPropertyName(
  properties: Record<string, { name?: string; type: string }>,
  options: { labels: string[]; types: string[] }
) {
  const entries = Object.entries(properties);
  const byLabel = entries.find(
    ([name, property]) =>
      options.types.includes(property.type) &&
      options.labels.some((label) => normalizeLabel(name).includes(normalizeLabel(label)))
  );

  if (byLabel) {
    return byLabel[0];
  }

  return entries.find(([, property]) => options.types.includes(property.type))?.[0] ?? null;
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getNotionPropertiesFromTask(
  task: TaskSnapshot,
  mapping: NotionPropertyMapping,
  statusMapping: NotionStatusMapping,
  notionStatusOptions: string[]
) {
  return {
    [mapping.title]: { title: [{ text: { content: task.name } }] },
    [mapping.status]: {
      status: { name: getNotionStatusName(task.status, statusMapping, notionStatusOptions) }
    },
    [mapping.dueDate]: { date: task.endDate ? { start: task.endDate } : null },
    ...(mapping.case
      ? { [mapping.case]: { rich_text: task.caseLabel ? [{ text: { content: task.caseLabel } }] : [] } }
      : {}),
    ...(mapping.notes ? { [mapping.notes]: { rich_text: task.notes ? [{ text: { content: task.notes } }] : [] } } : {})
  };
}

function readTextProperty(property: NotionProperty | undefined) {
  if (!property) {
    return "";
  }

  if (property.type === "title") {
    const title = property.title as Array<{ plain_text?: string; text?: { content?: string } }> | undefined;
    return title?.map((part) => part.plain_text ?? part.text?.content ?? "").join("").trim() ?? "";
  }

  if (property.type === "rich_text") {
    const richText = property.rich_text as Array<{ plain_text?: string; text?: { content?: string } }> | undefined;
    return richText?.map((part) => part.plain_text ?? part.text?.content ?? "").join("").trim() ?? "";
  }

  if (property.type === "select") {
    return (property.select as { name?: string } | null | undefined)?.name ?? "";
  }

  return "";
}

function readStatusProperty(property: NotionProperty | undefined) {
  if (!property) {
    return null;
  }

  if (property.type === "status") {
    return (property.status as { name?: string } | null | undefined)?.name ?? null;
  }

  if (property.type === "select") {
    return (property.select as { name?: string } | null | undefined)?.name ?? null;
  }

  return null;
}

function readDateProperty(property: NotionProperty | undefined) {
  const date = property?.type === "date" ? (property.date as { start?: string | null } | null | undefined) : null;
  return date?.start?.slice(0, 10) ?? null;
}

function getNotionStatusName(
  status: TaskSnapshot["status"],
  statusMapping: NotionStatusMapping,
  notionStatusOptions: string[]
) {
  const mappedNames = Object.entries(statusMapping)
    .filter(([, value]) => value === status)
    .map(([name]) => name);
  const aliases = {
    pending: ["Por hacer", "Pendiente", "Pending", "To do", "Todo", "Not started", "Backlog"],
    in_progress: ["En curso", "En progreso", "In progress", "Doing"],
    completed: ["Finalizado", "Completado", "Completed", "Done", "Complete"],
    cancelled: ["Cancelado", "Cancelled", "Canceled"]
  } satisfies Record<TaskSnapshot["status"], string[]>;
  const candidates = [...mappedNames, ...aliases[status]];

  if (!notionStatusOptions.length) {
    return candidates[0] ?? "Por hacer";
  }

  const validOption = candidates.find((candidate) =>
    notionStatusOptions.some((option) => normalizeLabel(option) === normalizeLabel(candidate))
  );
  if (validOption) {
    return notionStatusOptions.find((option) => normalizeLabel(option) === normalizeLabel(validOption)) ?? validOption;
  }

  throw new BadRequestException(
    `No existe una opción de Notion compatible con el estado "${status}". Opciones disponibles: ${notionStatusOptions.join(
      ", "
    )}.`
  );
}

function toTaskSnapshot(task: {
  case?: { caption: string; caseNumber: string } | null;
  endDate: Date | null;
  name: string;
  notes: string | null;
  status: TaskSnapshot["status"];
}, includeCase = false): TaskSnapshot {
  return {
    ...(includeCase
      ? { caseLabel: task.case ? `${task.case.caseNumber} - ${task.case.caption}` : null }
      : {}),
    endDate: task.endDate ? task.endDate.toISOString().slice(0, 10) : null,
    name: task.name,
    notes: task.notes,
    status: task.status
  };
}

function hashSnapshot(snapshot: TaskSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function toDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toMappingDto(mapping: {
  dataSourceId: string;
  dataSourceName: string;
  enabled: boolean;
  id: string;
  lastPullAt: Date | null;
  lastPushAt: Date | null;
  propertyMapping: Prisma.JsonValue;
  statusMapping: Prisma.JsonValue;
  syncIntervalMinutes: number;
}) {
  return {
    dataSourceId: mapping.dataSourceId,
    dataSourceName: mapping.dataSourceName,
    enabled: mapping.enabled,
    id: mapping.id,
    lastPullAt: mapping.lastPullAt?.toISOString() ?? null,
    lastPushAt: mapping.lastPushAt?.toISOString() ?? null,
    propertyMapping: notionPropertyMappingSchema.parse(mapping.propertyMapping),
    statusMapping: notionStatusMappingSchema.parse(mapping.statusMapping),
    syncIntervalMinutes: mapping.syncIntervalMinutes
  };
}

function sanitizeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Error al sincronizar Notion")
    .replace(/secret_[A-Za-z0-9_-]+/g, "[token]")
    .slice(0, 500);
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new BadRequestException(`Falta configurar ${name} para Notion.`);
  }

  return value;
}

function getNotionRedirectUri() {
  return (
    process.env.NOTION_REDIRECT_URI?.trim() ||
    `${process.env.FRONTEND_PUBLIC_URL ?? process.env.WEB_PUBLIC_URL ?? "http://localhost:3000"}/admin/account?view=notion`
  );
}

function signOAuthState(payload: { exp: number; tenantId: string; userId: string }) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getOAuthStateSecret()).update(body).digest("base64url");

  return `${body}.${signature}`;
}

function verifyOAuthState(state: string) {
  const [body, signature] = state.split(".");
  if (!body || !signature) {
    throw new BadRequestException("El estado OAuth de Notion es invalido.");
  }

  const expected = createHmac("sha256", getOAuthStateSecret()).update(body).digest("base64url");
  if (!safeEqual(signature, expected)) {
    throw new BadRequestException("El estado OAuth de Notion no pudo validarse.");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    exp?: number;
    tenantId?: string;
    userId?: string;
  };
  if (!payload.tenantId || !payload.userId || !payload.exp || payload.exp < Date.now()) {
    throw new BadRequestException("La autorizacion de Notion expiro.");
  }

  return payload as { exp: number; tenantId: string; userId: string };
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

function getOAuthStateSecret() {
  return getRequiredEnv("NOTION_OAUTH_STATE_SECRET");
}
