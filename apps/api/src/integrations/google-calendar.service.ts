import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { GoogleCalendarSyncSource, Prisma } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import type Redis from "ioredis";
import { PrismaService } from "../database/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.constants";
import { AsyncOutboxService } from "../queue/async-outbox.service";
import {
  googleCalendarDisconnectRoutingKey,
  googleCalendarInitialSyncRoutingKey,
  googleCalendarProvisionRoutingKey,
  googleCalendarRoutingKey
} from "../queue/queue.constants";
import { GoogleCalendarClientService } from "./google-calendar-client.service";
import { GoogleCalendarTokenService } from "./google-calendar-token.service";
import { Inject } from "@nestjs/common";
import type { GoogleCalendarSyncPreferencesDto } from "./google-calendar.schemas";

type ResourceType = "case_task" | "case_hearing";

@Injectable()
export class GoogleCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleCalendarClientService,
    private readonly tokens: GoogleCalendarTokenService,
    private readonly outbox: AsyncOutboxService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  async getStatus(tenantId: string, userId: string) {
    const membership = await this.findMembership(tenantId, userId);
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { tenantId_tenantMembershipId: { tenantId, tenantMembershipId: membership.id } },
      select: {
        calendarName: true,
        googleEmail: true,
        lastError: true,
        lastSyncAt: true,
        syncLeaseExpiresAt: true,
        status: true,
        syncMode: true,
        syncSources: true
      }
    });
    const activeEventCount = connection
      ? await this.prisma.googleCalendarEventLink.count({
          where: { connection: { tenantId, tenantMembershipId: membership.id }, status: "active" }
        })
      : 0;
    return {
      activeEventCount,
      calendarName: connection?.calendarName ?? null,
      connected: connection?.status === "connected",
      googleEmail: connection?.googleEmail ?? null,
      lastError: connection?.lastError ?? null,
      lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
      syncLeaseExpiresAt: connection?.syncLeaseExpiresAt?.toISOString() ?? null,
      canRetry: !connection?.syncLeaseExpiresAt || connection.syncLeaseExpiresAt <= new Date(),
      requiresReauthorization: connection?.status === "reauthorization_required",
      status: connection?.status ?? null,
      syncMode: connection?.syncMode ?? "global",
      syncSources: connection?.syncSources ?? []
    };
  }

  async getAuthorizationUrl(
    tenantId: string,
    userId: string,
    preferences: GoogleCalendarSyncPreferencesDto
  ) {
    if (process.env.GOOGLE_CALENDAR_ENABLED !== "true")
      throw new BadRequestException("Google Calendar no esta habilitado.");
    const membership = await this.findMembership(tenantId, userId);
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    await this.redis.set(
      this.stateKey(state),
      JSON.stringify({ membershipId: membership.id, tenantId, userId, verifier, ...preferences }),
      "EX",
      600
    );
    return { authorizationUrl: this.google.getAuthorizationUrl({ challenge, state }) };
  }

  async completeOAuth(input: { code: string; state: string }) {
    const rawState = await this.redis.get(this.stateKey(input.state));
    await this.redis.del(this.stateKey(input.state));
    if (!rawState)
      throw new BadRequestException(
        "La autorizacion de Google Calendar expiro o ya fue utilizada."
      );
    const state = JSON.parse(rawState) as {
      membershipId: string;
      tenantId: string;
      userId: string;
      verifier: string;
      syncMode?: "global" | "custom";
      syncSources?: string[];
    };
    const token = await this.google.exchangeCode(input.code, state.verifier);
    const connection = await this.prisma.googleCalendarConnection.upsert({
      where: {
        tenantId_tenantMembershipId: {
          tenantId: state.tenantId,
          tenantMembershipId: state.membershipId
        }
      },
      create: {
        accessTokenExpiresAt: token.expiresAt,
        calendarId: "",
        calendarName: "Temis",
        encryptedAccessToken: this.tokens.encrypt(token.accessToken),
        encryptedRefreshToken: this.tokens.encrypt(token.refreshToken),
        googleEmail: token.googleEmail,
        googleSubject: token.googleSubject,
        status: "provisioning",
        syncLeaseToken: null,
        syncLeaseExpiresAt: null,
        tenantId: state.tenantId,
        tenantMembershipId: state.membershipId,
        userId: state.userId,
        syncMode: state.syncMode ?? "global",
        syncSources: (state.syncSources ?? []) as GoogleCalendarSyncSource[]
      },
      update: {
        accessTokenExpiresAt: token.expiresAt,
        encryptedAccessToken: this.tokens.encrypt(token.accessToken),
        encryptedRefreshToken: this.tokens.encrypt(token.refreshToken),
        googleEmail: token.googleEmail,
        googleSubject: token.googleSubject,
        calendarName: "Temis",
        lastError: null,
        status: "provisioning",
        syncLeaseToken: null,
        syncLeaseExpiresAt: null,
        userId: state.userId,
        syncMode: state.syncMode ?? "global",
        syncSources: (state.syncSources ?? []) as GoogleCalendarSyncSource[]
      }
    });
    await this.outbox.enqueue(this.prisma, {
      payload: { connectionId: connection.id, operation: "provision", tenantId: state.tenantId },
      routingKey: googleCalendarProvisionRoutingKey,
      tenantId: state.tenantId,
      topic: "google-calendar.connection-provision"
    });
    return { connection, tenantId: state.tenantId };
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    preferences: GoogleCalendarSyncPreferencesDto
  ) {
    const connection = await this.findUserConnection(tenantId, userId);
    if (
      connection.status === "sync_requested" ||
      (connection.status === "syncing" && connection.syncLeaseExpiresAt && connection.syncLeaseExpiresAt > new Date())
    ) {
      throw new BadRequestException("No se puede cambiar la configuracion mientras hay una sincronizacion en curso.");
    }
    await this.prisma.$transaction(async (transaction) => {
      await transaction.googleCalendarConnection.update({
        where: { id: connection.id },
        data: {
          lastError: null,
          // Only the worker enters `syncing`, atomically with its lease.
          status: "sync_requested",
          syncLeaseExpiresAt: null,
          syncLeaseToken: null,
          syncMode: preferences.syncMode,
          syncSources: preferences.syncSources
        }
      });
      await this.enqueueInitialSync(tenantId, connection.id, transaction);
    });
    return { status: "accepted" as const };
  }

  async requestSync(tenantId: string, userId: string) {
    const connection = await this.findUserConnection(tenantId, userId);
    const activeLease =
      connection.status === "sync_requested" ||
      (connection.status === "syncing" && connection.syncLeaseExpiresAt && connection.syncLeaseExpiresAt > new Date());
    if (activeLease) {
      throw new BadRequestException("Ya hay una sincronizacion de Google Calendar en curso.");
    }
    if (connection.status !== "connected" && connection.status !== "error" && connection.status !== "syncing") {
      throw new BadRequestException(
        connection.status === "reauthorization_required"
          ? "La conexion requiere autorizacion nuevamente."
          : "La conexion de Google Calendar todavia no esta lista."
      );
    }
    await this.prisma.$transaction(async (transaction) => {
      await transaction.googleCalendarConnection.update({
        where: { id: connection.id },
        data: {
          lastError: null,
          status: "sync_requested",
          syncLeaseExpiresAt: null,
          syncLeaseToken: null
        }
      });
      await this.enqueueInitialSync(tenantId, connection.id, transaction);
    });
    return { status: "accepted" as const };
  }

  async disconnect(tenantId: string, userId: string) {
    const connection = await this.findUserConnection(tenantId, userId);
    await this.prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: { lastError: null, status: "disconnecting" }
    });
    await this.outbox.enqueue(this.prisma, {
      payload: { connectionId: connection.id, operation: "disconnect", tenantId },
      routingKey: googleCalendarDisconnectRoutingKey,
      tenantId,
      topic: "google-calendar.connection-disconnect"
    });
    return { status: "accepted" as const };
  }

  async enqueueResource(
    prisma: Prisma.TransactionClient,
    tenantId: string,
    resourceType: ResourceType,
    resourceId: string,
    operation: "upsert" | "delete"
  ) {
    const connections = await prisma.googleCalendarConnection.findMany({
      where: { tenantId, status: "connected" },
      select: { id: true }
    });
    for (const connection of connections) {
      await this.outbox.enqueue(prisma, {
        payload: { connectionId: connection.id, operation, resourceId, resourceType, tenantId },
        routingKey: googleCalendarRoutingKey,
        tenantId,
        topic: `google-calendar.event-${operation}`
      });
    }
  }

  private async enqueueInitialSync(
    tenantId: string,
    connectionId: string,
    prisma: Prisma.TransactionClient | PrismaService = this.prisma
  ) {
    await this.outbox.enqueue(prisma, {
      payload: { connectionId, operation: "initial-sync", tenantId },
      routingKey: googleCalendarInitialSyncRoutingKey,
      tenantId,
      topic: "google-calendar.initial-sync"
    });
  }

  private async findMembership(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId, userId, status: "active", tenant: { status: "active" } },
      select: { id: true }
    });
    if (!membership)
      throw new UnauthorizedException("No tenes una membresia activa en este estudio.");
    return membership;
  }

  private async findUserConnection(tenantId: string, userId: string) {
    const membership = await this.findMembership(tenantId, userId);
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { tenantId_tenantMembershipId: { tenantId, tenantMembershipId: membership.id } }
    });
    if (!connection || ["disconnected", "disconnecting"].includes(connection.status))
      throw new NotFoundException("No hay una conexion activa con Google Calendar.");
    return connection;
  }

  private stateKey(state: string) {
    return `bogaap:google-calendar:oauth:${state}`;
  }
}
