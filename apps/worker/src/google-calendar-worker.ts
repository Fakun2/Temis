import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { GoogleCalendarTokenCipher, type GoogleCalendarResourceType, type GoogleCalendarSyncMessage } from "@bogaap/integration-contracts";
import { createLogger } from "./logger";
import { GoogleCalendarAuthorizationError, GoogleCalendarClient, GoogleCalendarProviderError, type GoogleCalendarEventInput } from "./google-calendar-client";

type Connection = {
  accessTokenExpiresAt: Date | null;
  calendarId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  id: string;
  tenantId: string;
  tenantMembershipId: string;
  status: string;
  syncMode: "global" | "custom";
  syncSources: string[];
  syncLeaseToken: string | null;
  syncLeaseExpiresAt: Date | null;
};

export class GoogleCalendarWorker {
  private readonly logger = createLogger("GoogleCalendarWorker");
  private readonly google: GoogleCalendarClient | null;
  private readonly tokens: GoogleCalendarTokenCipher | null;
  constructor(private readonly prisma: PrismaClient) {
    this.google = getBooleanEnv("GOOGLE_CALENDAR_ENABLED", false) ? new GoogleCalendarClient() : null;
    this.tokens = getBooleanEnv("GOOGLE_CALENDAR_ENABLED", false) ? new GoogleCalendarTokenCipher(required("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY")) : null;
  }

  async process(message: GoogleCalendarSyncMessage) {
    if (!getBooleanEnv("GOOGLE_CALENDAR_ENABLED", false)) return;
    for (let attempt = 0; ; attempt += 1) {
      try { return await withTimeout(this.processOnce(message), 60_000, message.operation); }
      catch (error) {
        if (isUnavailableConnectionError(error)) return;
        if (isAuthorizationError(error) || isSyncTimeoutError(error) || attempt >= 2) {
          await this.recordFailure(message.tenantId, message.connectionId, error);
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** attempt));
      }
    }
  }

  private async processOnce(message: GoogleCalendarSyncMessage) {
    switch (message.operation) {
      case "provision": return this.provision(message.tenantId, message.connectionId);
      case "initial-sync": return this.initialSync(message.tenantId, message.connectionId);
      case "disconnect": return this.disconnect(message.tenantId, message.connectionId);
      case "upsert":
      case "delete":
        if (!message.resourceId || !message.resourceType) throw new Error("Mensaje de Google Calendar invalido.");
        return message.operation === "delete" ? this.deleteEvent(message.tenantId, message.connectionId, message.resourceType, message.resourceId) : this.upsertEvent(message.tenantId, message.connectionId, message.resourceType, message.resourceId);
      default: throw new Error("Operacion de Google Calendar desconocida.");
    }
  }

  private async provision(tenantId: string, connectionId: string) {
    const connection = await this.prisma.googleCalendarConnection.findFirst({ where: { id: connectionId, tenantId } });
    if (!connection || ["disconnected", "disconnecting", "error"].includes(connection.status)) return;
    if (connection.status === "connected" && connection.calendarId) return;
    if (connection.status !== "provisioning") return;
    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(Date.now() + 5 * 60_000);
    const claimed = await this.prisma.googleCalendarConnection.updateMany({
      // Reconnecting deliberately preserves the Temis calendar ID. The prior
      // calendarId === "" condition left that path in provisioning forever.
      where: { id: connectionId, tenantId, status: "provisioning" },
      data: { status: "syncing", syncLeaseExpiresAt: leaseExpiresAt, syncLeaseToken: leaseToken }
    });
    if (claimed.count === 0) return;
    const token = await this.getToken(connection);
    let calendarId = connection.calendarId;
    if (!calendarId) calendarId = (await this.getGoogle().createCalendar(token.accessToken, "Temis", await this.timezone(tenantId))).id;
    else await this.getGoogle().renameCalendar(token.accessToken, calendarId, "Temis");
    const connected = await this.prisma.googleCalendarConnection.updateMany({
      where: { id: connectionId, tenantId, status: "syncing", syncLeaseToken: leaseToken },
      data: {
        calendarId,
        calendarName: "Temis",
        lastError: null,
        status: "connected",
        syncLeaseExpiresAt: null,
        syncLeaseToken: null
      }
    });
    if (connected.count === 0) return;
    await this.prisma.asyncOutboxEvent.create({
      data: {
        tenantId,
        topic: "google-calendar.initial-sync",
        routingKey: "google-calendar.initial-sync",
        payload: { connectionId, operation: "initial-sync", tenantId }
      }
    });
  }

  private async initialSync(tenantId: string, connectionId: string) {
    const connection = await this.findConnection(tenantId, connectionId, ["connected", "sync_requested", "syncing"]);
    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(Date.now() + 5 * 60_000);
    const claimed = await this.prisma.googleCalendarConnection.updateMany({
      where: {
        id: connectionId,
        tenantId,
        OR: [
          { status: { in: ["connected", "sync_requested"] } },
          {
            status: "syncing",
            OR: [
              { syncLeaseToken: null },
              { syncLeaseExpiresAt: null },
              { syncLeaseExpiresAt: { lt: new Date() } }
            ]
          }
        ]
      },
      data: { status: "syncing", syncLeaseToken: leaseToken, syncLeaseExpiresAt: leaseExpiresAt }
    });
    if (claimed.count === 0) {
      this.logger.info(`Sincronización omitida: ya existe un lease activo para la conexión ${connectionId}.`);
      return;
    }
    try {
      await this.renewLease(tenantId, connectionId, leaseToken);
      const token = await this.getToken(connection);
      await this.getGoogle().renameCalendar(token.accessToken, connection.calendarId, "Temis");
      const [tasks, hearings] = await Promise.all([
        this.prisma.caseTask.findMany({ where: { tenantId }, select: { id: true } }),
        this.prisma.caseHearing.findMany({ where: { tenantId }, select: { id: true } })
      ]);
      for (const task of tasks) {
        await this.renewLease(tenantId, connectionId, leaseToken);
        this.logger.info(`Sincronizando tarea ${task.id} para la conexión ${connectionId}.`);
        await this.upsertEvent(tenantId, connectionId, "case_task", task.id);
      }
      for (const hearing of hearings) {
        await this.renewLease(tenantId, connectionId, leaseToken);
        this.logger.info(`Sincronizando audiencia ${hearing.id} para la conexión ${connectionId}.`);
        await this.upsertEvent(tenantId, connectionId, "case_hearing", hearing.id);
      }
      const existingResources = new Set([
        ...tasks.map((task) => `case_task:${task.id}`),
        ...hearings.map((hearing) => `case_hearing:${hearing.id}`)
      ]);
      const staleLinks = await this.prisma.googleCalendarEventLink.findMany({ where: { tenantId, connectionId, status: "active" }, select: { resourceId: true, resourceType: true } });
      for (const link of staleLinks) {
        if (!existingResources.has(`${link.resourceType}:${link.resourceId}`)) {
          await this.renewLease(tenantId, connectionId, leaseToken);
          this.logger.info(`Eliminando evento obsoleto ${link.resourceType}:${link.resourceId} para la conexión ${connectionId}.`);
          await this.deleteEvent(tenantId, connectionId, link.resourceType, link.resourceId);
        }
      }
      await this.prisma.googleCalendarConnection.updateMany({
        where: { id: connectionId, tenantId, status: "syncing", syncLeaseToken: leaseToken },
        data: { lastError: null, lastSyncAt: new Date(), status: "connected", syncLeaseToken: null, syncLeaseExpiresAt: null }
      });
    } catch (error) {
      await this.prisma.googleCalendarConnection.updateMany({
        where: { id: connectionId, tenantId, syncLeaseToken: leaseToken },
        data: { syncLeaseToken: null, syncLeaseExpiresAt: null }
      });
      throw error;
    }
  }

  private async upsertEvent(tenantId: string, connectionId: string, resourceType: GoogleCalendarResourceType, resourceId: string) {
    const connection = await this.findConnection(tenantId, connectionId, ["connected", "syncing"]);
    const event = await this.buildEvent(tenantId, connection.tenantMembershipId, resourceType, resourceId);
    if (!event) return this.deleteEvent(tenantId, connectionId, resourceType, resourceId);
    const link = await this.prisma.googleCalendarEventLink.findUnique({ where: { connectionId_resourceType_resourceId: { connectionId, resourceType, resourceId } } });
    try {
      const token = await this.getToken(connection);
      let external;
      if (link?.googleEventId && link.status === "active") {
        try {
          external = await this.getGoogle().patchEvent(token.accessToken, connection.calendarId, link.googleEventId, event);
          // Google keeps a deleted event in the calendar as cancelled. Patching
          // it does not reliably revive it, so create a new external event and
          // replace the link instead of reporting a false internal success.
          if (external.status === "cancelled") {
            external = await this.getGoogle().insertEvent(token.accessToken, connection.calendarId, event);
          }
        } catch (error) {
          if (!isGone(error)) throw error;
          external = await this.getGoogle().insertEvent(token.accessToken, connection.calendarId, event);
        }
      } else {
        external = await this.getGoogle().insertEvent(token.accessToken, connection.calendarId, event);
      }
      await this.prisma.googleCalendarEventLink.upsert({
        where: { connectionId_resourceType_resourceId: { connectionId, resourceType, resourceId } },
        create: { connectionId, googleCalendarId: connection.calendarId, googleEventEtag: external.etag, googleEventId: external.id, lastError: null, lastSyncedAt: new Date(), resourceId, resourceType, status: "active", tenantId },
        update: { googleEventEtag: external.etag, googleEventId: external.id, lastError: null, lastSyncedAt: new Date(), status: "active" }
      });
      await this.prisma.googleCalendarConnection.update({ where: { id: connectionId }, data: { lastError: null, lastSyncAt: new Date() } });
    } catch (error) {
      if (isGone(error) && link) await this.prisma.googleCalendarEventLink.update({ where: { id: link.id }, data: { status: "failed", lastError: "El evento externo ya no existe; se reintentará crear." } });
      throw error;
    }
  }

  private async deleteEvent(tenantId: string, connectionId: string, resourceType: GoogleCalendarResourceType, resourceId: string) {
    // Initial sync deletes stale links and skips resources that are no longer
    // eligible (for example, tasks without dates). It owns a `syncing` lease,
    // so deletion must be valid in that state as well.
    const connection = await this.findConnection(tenantId, connectionId, ["connected", "syncing", "disconnecting", "disconnected"]);
    const link = await this.prisma.googleCalendarEventLink.findUnique({ where: { connectionId_resourceType_resourceId: { connectionId, resourceType, resourceId } } });
    if (!link || !connection.encryptedAccessToken) return;
    const token = await this.getToken(connection);
    await this.getGoogle().deleteEvent(token.accessToken, link.googleCalendarId, link.googleEventId);
    await this.prisma.googleCalendarEventLink.update({ where: { id: link.id }, data: { lastError: null, lastSyncedAt: new Date(), status: "deleted" } });
  }

  private async disconnect(tenantId: string, connectionId: string) {
    const connection = await this.findConnection(tenantId, connectionId, ["disconnecting", "connected", "error"]);
    const links = await this.prisma.googleCalendarEventLink.findMany({ where: { tenantId, connectionId, status: "active" }, select: { googleCalendarId: true, googleEventId: true } });
    if (connection.encryptedAccessToken) {
      const token = await this.getToken(connection);
      for (const link of links) await this.getGoogle().deleteEvent(token.accessToken, link.googleCalendarId, link.googleEventId);
    }
    await this.prisma.$transaction([
      this.prisma.googleCalendarConnection.update({ where: { id: connectionId }, data: { encryptedAccessToken: "", encryptedRefreshToken: "", lastError: null, status: "disconnected", syncLeaseToken: null, syncLeaseExpiresAt: null } }),
      this.prisma.googleCalendarEventLink.updateMany({ where: { connectionId }, data: { status: "deleted", lastError: null, lastSyncedAt: new Date() } })
    ]);
  }

  private async getToken(connection: Connection) {
    const accessToken = this.getTokens().decrypt(connection.encryptedAccessToken);
    const refreshToken = this.getTokens().decrypt(connection.encryptedRefreshToken);
    if (connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) return { accessToken, expiresAt: connection.accessTokenExpiresAt };
    const refreshed = await this.getGoogle().refreshAccessToken(refreshToken);
    await this.prisma.googleCalendarConnection.update({ where: { id: connection.id }, data: { accessTokenExpiresAt: refreshed.expiresAt, encryptedAccessToken: this.getTokens().encrypt(refreshed.accessToken) } });
    return refreshed;
  }

  private async buildEvent(tenantId: string, membershipId: string, resourceType: GoogleCalendarResourceType, resourceId: string): Promise<GoogleCalendarEventInput | null> {
    const base = { extendedProperties: { private: { bogaapResourceId: resourceId, bogaapResourceType: resourceType, bogaapTenantId: tenantId } } };
    if (resourceType === "case_task") {
      const task = await this.prisma.caseTask.findFirst({ where: { id: resourceId, tenantId }, include: { case: { select: { caseNumber: true, id: true } } } });
      if ((!task?.startDate && !task?.endDate) || !task || !(await this.shouldSyncTask(tenantId, membershipId, task))) return null;
      const startDate = (task.startDate ?? task.endDate!).toISOString().slice(0, 10);
      const endDate = (task.endDate ?? task.startDate!).toISOString().slice(0, 10);
      const caseLabel = task.case?.caseNumber ? ` · Expte. ${task.case.caseNumber}` : "";
      return { ...base, description: eventDescription(tenantId, task.case?.id ?? task.caseId, `Tarea asignada en Temis${caseLabel}`), end: { date: nextDay(endDate) }, start: { date: startDate }, summary: `Tarea: ${task.name?.trim() || "Sin título"}${caseLabel}` };
    }
    const hearing = await this.prisma.caseHearing.findFirst({ where: { id: resourceId, tenantId }, include: { case: { select: { caseNumber: true, id: true } } } });
    if (!hearing || !(await this.shouldSyncHearing(tenantId, membershipId, hearing.id))) return null;
    const date = hearing.date.toISOString().slice(0, 10);
    const caseLabel = hearing.case.caseNumber ? ` · Expte. ${hearing.case.caseNumber}` : "";
    const title = hearing.description?.trim() || hearingTypeLabel(hearing.type);
    const [endDate, endTime] = addMinutes(date, hearing.time, 60);
    const timezone = await this.timezone(tenantId);
    return { ...base, description: eventDescription(tenantId, hearing.case.id, `Audiencia ${hearingTypeLabel(hearing.type)}${caseLabel}`), end: { dateTime: `${endDate}T${endTime}:00`, timeZone: timezone }, start: { dateTime: `${date}T${hearing.time}:00`, timeZone: timezone }, summary: `Audiencia: ${title}${caseLabel}` };
  }

  private async shouldSyncTask(tenantId: string, membershipId: string, task: { id: string; assignedMembershipId: string | null }) {
    const connection = await this.prisma.googleCalendarConnection.findFirst({ where: { tenantId, tenantMembershipId: membershipId }, select: { syncMode: true, syncSources: true } });
    if (!connection) return false;
    if (connection.syncMode === "global" || connection.syncSources.includes("all_tasks")) return true;
    if (connection.syncSources.includes("my_tasks") && task.assignedMembershipId === membershipId) return true;
    if (connection.syncSources.includes("my_area_tasks")) {
      const [memberAreas, assigned] = await Promise.all([
        this.prisma.tenantMembershipPracticeArea.findMany({ where: { tenantMembershipId: membershipId }, select: { practiceAreaId: true } }),
        task.assignedMembershipId ? this.prisma.tenantMembership.findFirst({ where: { id: task.assignedMembershipId, tenantId }, include: { practiceAreas: { select: { practiceAreaId: true } } } }) : null
      ]);
      const areas = new Set(memberAreas.map((item) => item.practiceAreaId));
      return Boolean(assigned?.practiceAreas.some((item) => areas.has(item.practiceAreaId)));
    }
    return false;
  }

  private async shouldSyncHearing(tenantId: string, membershipId: string, hearingId: string) {
    const connection = await this.prisma.googleCalendarConnection.findFirst({ where: { tenantId, tenantMembershipId: membershipId }, select: { syncMode: true, syncSources: true } });
    if (!connection) return false;
    return connection.syncMode === "global" || connection.syncSources.includes("all_hearings") || (connection.syncSources.includes("participating_hearings") && Boolean(await this.prisma.caseHearingParticipant.findFirst({ where: { tenantId, hearingId, tenantMembershipId: membershipId }, select: { id: true } })));
  }

  private async findConnection(tenantId: string, connectionId: string, statuses: string[]) {
    const connection = await this.prisma.googleCalendarConnection.findFirst({ where: { id: connectionId, tenantId } });
    if (!connection || !statuses.includes(connection.status) || (connection.status === "connected" && !connection.calendarId)) throw new Error("La conexion de Google Calendar no esta disponible.");
    return connection as Connection;
  }
  private async renewLease(tenantId: string, connectionId: string, leaseToken: string) {
    const renewed = await this.prisma.googleCalendarConnection.updateMany({
      where: { id: connectionId, tenantId, status: "syncing", syncLeaseToken: leaseToken },
      data: { syncLeaseExpiresAt: new Date(Date.now() + 5 * 60_000) }
    });
    if (renewed.count === 0) {
      throw new GoogleCalendarLeaseLostError();
    }
  }
  async recoverStaleSynchronizations() {
    const staleRequestedBefore = new Date(Date.now() - 5 * 60_000);
    const result = await this.prisma.googleCalendarConnection.updateMany({
      where: {
        OR: [
          {
            status: "syncing",
            OR: [
              { syncLeaseToken: null },
              { syncLeaseExpiresAt: null },
              { syncLeaseExpiresAt: { lt: new Date() } }
            ]
          },
          { status: "sync_requested", updatedAt: { lt: staleRequestedBefore } },
          // Legacy connections could be left in provisioning before this state
          // gained a lease. Do not leave them pending forever.
          { status: "provisioning", updatedAt: { lt: staleRequestedBefore } }
        ]
      },
      data: {
        lastError: "La sincronización de Google Calendar no fue confirmada por el worker. Podés reintentarla.",
        status: "error",
        syncLeaseExpiresAt: null,
        syncLeaseToken: null
      }
    });
    if (result.count > 0) this.logger.warn(`Se recuperaron ${result.count} operaciones de Google Calendar sin confirmar.`);
    return result.count;
  }
  private async timezone(tenantId: string) { const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { timezone: true } }); return settings?.timezone ?? "America/Argentina/Buenos_Aires"; }
  private async recordFailure(tenantId: string, connectionId: string, error: unknown) {
    const message = toUserFacingError(error);
    this.logger.error(`Google Calendar sync failed for connection ${connectionId}: ${message}`);
    await this.prisma.googleCalendarConnection.updateMany({
      where: { id: connectionId, tenantId, status: { notIn: ["disconnected", "disconnecting"] } },
      data: { lastError: message, status: isAuthorizationError(error) ? "reauthorization_required" : "error", syncLeaseToken: null, syncLeaseExpiresAt: null }
    });
  }
  private getGoogle() { if (!this.google) throw new Error("Google Calendar no esta habilitado."); return this.google; }
  private getTokens() { if (!this.tokens) throw new Error("Google Calendar no esta habilitado."); return this.tokens; }
}

function required(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`Falta configurar ${name}.`); return value; }
function getBooleanEnv(name: string, fallback: boolean) { return process.env[name] === undefined ? fallback : process.env[name]!.toLowerCase() === "true"; }
function nextDay(date: string) { const value = new Date(`${date}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString().slice(0, 10); }
function addMinutes(date: string, value: string, minutesToAdd: number) {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const result = new Date(`${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00Z`);
  result.setUTCMinutes(result.getUTCMinutes() + minutesToAdd);
  return [result.toISOString().slice(0, 10), result.toISOString().slice(11, 16)] as const;
}
function hearingTypeLabel(value: string) {
  const labels: Record<string, string> = {
    preliminary: "Preliminar",
    trial_view: "Vista de causa",
    conciliation: "Conciliación",
    mediation: "Mediación",
    testimonial: "Testimonial",
    confessional: "Confesional",
    debate: "Debate",
    investigative_statement: "Declaración indagatoria",
    other: "Audiencia"
  };
  return labels[value] ?? "Audiencia";
}
function eventDescription(tenantId: string, caseId: string | null | undefined, context: string) {
  const frontend = process.env.FRONTEND_PUBLIC_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim();
  const link = frontend && caseId ? `\nAbrir expediente: ${frontend.replace(/\/$/, "")}/admin/cases/${caseId}` : "";
  return `${context}.\nEvento generado por Temis.${link}`;
}
function isGone(error: unknown) { return error instanceof GoogleCalendarProviderError && [404, 410].includes(error.providerStatus); }
function isAuthorizationError(error: unknown) { return error instanceof GoogleCalendarAuthorizationError || (error instanceof GoogleCalendarProviderError && error.providerStatus === 401) || (error instanceof Error && /invalid_grant/.test(error.message)); }
function isUnavailableConnectionError(error: unknown) { return error instanceof GoogleCalendarLeaseLostError || (error instanceof Error && error.message === "La conexion de Google Calendar no esta disponible."); }
function isSyncTimeoutError(error: unknown) { return error instanceof GoogleCalendarSyncTimeoutError; }
function toUserFacingError(error: unknown) {
  if (error instanceof GoogleCalendarProviderError) {
    const messages: Record<number, string> = {
      403: "Google rechazó el acceso al calendario. Verificá los permisos de la cuenta y volvé a conectar la integración.",
      404: "Google no encontró el calendario configurado. Volvé a conectar la integración para crear o vincular un calendario válido.",
      409: "Google detectó un conflicto al actualizar el calendario. Esperá unos segundos y reintentá la sincronización.",
      429: "Google limitó temporalmente las solicitudes. Esperá unos minutos y reintentá la sincronización."
    };
    return messages[error.providerStatus] ?? (error.providerStatus >= 500
      ? "Google Calendar no está disponible temporalmente. Reintentá la sincronización más tarde."
      : `Google Calendar rechazó la operación (${error.providerStatus}). Podés reintentarla.`);
  }
  return (error instanceof Error ? error.message : "Error de Google Calendar").replace(/Bearer\s+[^\s]+/gi, "Bearer [token]").slice(0, 500);
}

class GoogleCalendarLeaseLostError extends Error {
  constructor() { super("La sincronización de Google Calendar perdió su lease y fue cancelada."); this.name = "GoogleCalendarLeaseLostError"; }
}

class GoogleCalendarSyncTimeoutError extends Error {
  constructor(operation: string) { super(`La sincronización de Google Calendar excedió el tiempo máximo durante ${operation}.`); this.name = "GoogleCalendarSyncTimeoutError"; }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new GoogleCalendarSyncTimeoutError(operation)), timeoutMs); })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
