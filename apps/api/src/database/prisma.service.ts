import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

export type TenantPrismaClient = Prisma.TransactionClient;
type TenantTransactionOptions = {
  isolationLevel?: Prisma.TransactionIsolationLevel;
  maxWait?: number;
  timeout?: number;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async runWithTenant<T>(
    tenantId: string,
    callback: (prisma: TenantPrismaClient) => Promise<T>,
    options?: TenantTransactionOptions
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT set_config('app.tenant_id', ${tenantId}, true)
      `;

      return callback(tx);
    }, options);
  }
}
