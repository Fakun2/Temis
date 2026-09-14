import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  CaseExpenseCashboxSyncJobAction,
  CaseExpenseCashboxSyncJobStatus,
  CashboxMovementType
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

const syncIntervalMs = 30_000;
const maxAttempts = 5;

@Injectable()
export class CaseExpenseCashboxSyncUseCase implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CaseExpenseCashboxSyncUseCase.name);
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.scheduleNextRun(1_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async enqueueUpsert(input: {
    actorUserId: string;
    caseExpenseId: string;
    caseId: string;
    tenantId: string;
  }) {
    await this.enqueue({
      ...input,
      action: CaseExpenseCashboxSyncJobAction.upsert_cashbox_movement
    });
  }

  async enqueueDelete(input: { caseExpenseId: string; caseId: string; tenantId: string }) {
    await this.enqueue({
      ...input,
      actorUserId: null,
      action: CaseExpenseCashboxSyncJobAction.delete_cashbox_movement
    });
  }

  async processDueJobs(limit = 10) {
    if (this.isRunning) {
      return { processed: 0 };
    }

    this.isRunning = true;

    try {
      const jobs = await this.prisma.caseExpenseCashboxSyncJob.findMany({
        where: {
          nextRunAt: { lte: new Date() },
          status: {
            in: [
              CaseExpenseCashboxSyncJobStatus.pending,
              CaseExpenseCashboxSyncJobStatus.failed
            ]
          }
        },
        orderBy: [{ nextRunAt: "asc" }, { createdAt: "asc" }],
        take: limit
      });

      for (const job of jobs) {
        await this.processJob(job.id);
      }

      return { processed: jobs.length };
    } finally {
      this.isRunning = false;
    }
  }

  private async enqueue(input: {
    action: CaseExpenseCashboxSyncJobAction;
    actorUserId: string | null;
    caseExpenseId: string;
    caseId: string;
    tenantId: string;
  }) {
    await this.prisma.caseExpenseCashboxSyncJob.upsert({
      where: { caseExpenseId: input.caseExpenseId },
      update: {
        action: input.action,
        actorUserId: input.actorUserId,
        attempts: 0,
        caseId: input.caseId,
        lastError: null,
        nextRunAt: new Date(),
        status: CaseExpenseCashboxSyncJobStatus.pending,
        tenantId: input.tenantId
      },
      create: {
        action: input.action,
        actorUserId: input.actorUserId,
        caseExpenseId: input.caseExpenseId,
        caseId: input.caseId,
        tenantId: input.tenantId
      }
    });

    void this.runSoon();
  }

  private scheduleNextRun(delayMs = syncIntervalMs) {
    this.timer = setTimeout(() => {
      void this.runSoon();
    }, delayMs);
    this.timer.unref?.();
  }

  private async runSoon() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    try {
      await this.processDueJobs();
    } catch (error) {
      this.logger.error("Case expense cashbox sync failed.", error);
    } finally {
      this.scheduleNextRun();
    }
  }

  private async processJob(jobId: string) {
    const job = await this.prisma.caseExpenseCashboxSyncJob.findUnique({
      where: { id: jobId }
    });

    if (
      !job ||
      (job.status !== CaseExpenseCashboxSyncJobStatus.pending &&
        job.status !== CaseExpenseCashboxSyncJobStatus.failed)
    ) {
      return;
    }

    await this.prisma.caseExpenseCashboxSyncJob.update({
      where: { id: job.id },
      data: { status: CaseExpenseCashboxSyncJobStatus.processing }
    });

    try {
      if (job.action === CaseExpenseCashboxSyncJobAction.delete_cashbox_movement) {
        await this.deleteCashboxMovement(job.tenantId, job.caseExpenseId);
      } else {
        await this.upsertCashboxMovement(job);
      }

      await this.prisma.caseExpenseCashboxSyncJob.update({
        where: { id: job.id },
        data: {
          lastError: null,
          status: CaseExpenseCashboxSyncJobStatus.completed
        }
      });
    } catch (error) {
      const attempts = job.attempts + 1;
      const retryDelayMinutes = Math.min(60, 2 ** attempts);

      await this.prisma.caseExpenseCashboxSyncJob.update({
        where: { id: job.id },
        data: {
          attempts,
          lastError: error instanceof Error ? error.message : "Error desconocido",
          nextRunAt: addMinutes(new Date(), retryDelayMinutes),
          status:
            attempts >= maxAttempts
              ? CaseExpenseCashboxSyncJobStatus.failed
              : CaseExpenseCashboxSyncJobStatus.pending
        }
      });
    }
  }

  private async upsertCashboxMovement(job: {
    actorUserId: string | null;
    caseExpenseId: string;
    tenantId: string;
  }) {
    if (!job.actorUserId) {
      throw new Error("El job no tiene usuario actor para crear el movimiento de caja.");
    }

    const expense = await this.prisma.caseExpense.findFirst({
      where: { id: job.caseExpenseId, tenantId: job.tenantId },
      select: {
        amount: true,
        caseId: true,
        concept: true,
        currencyCode: true,
        paymentDate: true,
        status: true,
        updatedAt: true
      }
    });

    if (!expense || expense.status !== "paid") {
      await this.deleteCashboxMovement(job.tenantId, job.caseExpenseId);
      return;
    }

    const tenantCurrency = await this.prisma.tenantCurrency.findFirst({
      where: {
        active: true,
        currencyCode: expense.currencyCode,
        tenantId: job.tenantId
      },
      select: { id: true }
    });

    if (!tenantCurrency) {
      throw new Error("La moneda del gasto no esta activa en este estudio.");
    }

    await this.prisma.cashboxMovement.upsert({
      where: { caseExpenseId: job.caseExpenseId },
      update: {
        amount: expense.amount,
        currencyCode: expense.currencyCode,
        description: toCashboxDescription(expense.concept),
        occurredAt: expense.updatedAt,
        tenantId: job.tenantId,
        type: CashboxMovementType.expense
      },
      create: {
        amount: expense.amount,
        caseExpenseId: job.caseExpenseId,
        createdByUserId: job.actorUserId,
        currencyCode: expense.currencyCode,
        description: toCashboxDescription(expense.concept),
        occurredAt: expense.updatedAt,
        tenantId: job.tenantId,
        type: CashboxMovementType.expense
      }
    });
  }

  private async deleteCashboxMovement(tenantId: string, caseExpenseId: string) {
    await this.prisma.cashboxMovement.deleteMany({
      where: {
        caseExpenseId,
        tenantId
      }
    });
  }
}

function toCashboxDescription(concept: string) {
  return `Gasto de expediente: ${concept}`.slice(0, 240);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}
