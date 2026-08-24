import { DocumentStorageCleanupJobStatus, PrismaClient } from "@prisma/client";
import { getPositiveNumberEnv } from "../config";
import { createLogger } from "../logger";
import { AsyncOutbox } from "../queue/outbox";
import type { DocumentCleanupRunMessage } from "../queue/types";
import { ObjectStorage } from "../storage/object-storage";

const cleanupProcessingTimeoutMs = 10 * 60_000;
const maxCleanupAttempts = 5;

export class DocumentCleanupWorker {
  private readonly logger = createLogger("DocumentCleanupWorker");

  constructor(
    private readonly prisma: PrismaClient,
    private readonly outbox: AsyncOutbox,
    private readonly storage: ObjectStorage
  ) {}

  async processCleanupJobMessage(input: DocumentCleanupRunMessage) {
    const expectedNextRunAt = new Date(input.nextRunAt);
    if (Number.isNaN(expectedNextRunAt.getTime())) {
      throw new Error("La fecha del mensaje de limpieza documental no es valida.");
    }

    const claimed = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;

      return tx.documentStorageCleanupJob.updateMany({
        data: { status: "processing" },
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

  async recoverStaleCleanupJobs() {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.document_cleanup_worker', 'on', true)`;
      const staleSince = new Date(Date.now() - cleanupProcessingTimeoutMs);
      const staleJobs = await tx.documentStorageCleanupJob.findMany({
        select: { id: true, tenantId: true },
        where: {
          status: "processing",
          updatedAt: { lt: staleSince }
        }
      });

      const nextRunAt = new Date();
      await tx.documentStorageCleanupJob.updateMany({
        data: { nextRunAt, status: "pending" },
        where: {
          status: "processing",
          updatedAt: { lt: staleSince }
        }
      });

      for (const job of staleJobs) {
        await this.outbox.enqueueDocumentCleanup(tx, {
          id: job.id,
          nextRunAt,
          tenantId: job.tenantId
        });
      }
    });
  }

  startRecoveryLoop() {
    const intervalMs = getPositiveNumberEnv("DOCUMENT_CLEANUP_RECOVERY_INTERVAL_MS", 10 * 60_000);
    const run = async () => {
      try {
        await this.recoverStaleCleanupJobs();
      } catch (error) {
        this.logger.error("Document cleanup recovery failed.", error);
      } finally {
        const timer = setTimeout(() => void run(), intervalMs);
        timer.unref?.();
      }
    };

    const timer = setTimeout(() => void run(), intervalMs);
    timer.unref?.();
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
          await this.outbox.enqueueDocumentCleanup(tx, updatedJob);
        }
      });
    }
  }
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function getStorageCleanupErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "No se pudo eliminar el archivo del almacenamiento.".slice(0, 500);
}
