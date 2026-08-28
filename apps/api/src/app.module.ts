import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { AuthModule } from "./auth/auth.module";
import { AiModule } from "./ai/ai.module";
import { CashboxModule } from "./cashbox/cashbox.module";
import { CategoriesModule } from "./categories/categories.module";
import { CasesModule } from "./cases/cases.module";
import { ClientsModule } from "./clients/clients.module";
import { CurrenciesModule } from "./currencies/currencies.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DatabaseModule } from "./database/database.module";
import { DocumentsModule } from "./documents/documents.module";
import { HealthModule } from "./health/health.module";
import { IdentityModule } from "./identity/identity.module";
import { ForumsModule } from "./forums/forums.module";
import { JudicialCentersModule } from "./judicial-centers/judicial-centers.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PracticeAreaTemplatesModule } from "./practice-area-templates/practice-area-templates.module";
import { ProvincesModule } from "./provinces/provinces.module";
import { RedisModule } from "./redis/redis.module";
import { RbacModule } from "./rbac/rbac.module";
import { StaffModule } from "./staff/staff.module";
import { TenancyModule } from "./tenancy/tenancy.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getRootEnvFilePaths(),
      isGlobal: true
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    AiModule,
    TenancyModule,
    RbacModule,
    PracticeAreaTemplatesModule,
    ProvincesModule,
    OnboardingModule,
    IdentityModule,
    CashboxModule,
    CategoriesModule,
    DocumentsModule,
    NotificationsModule,
    CasesModule,
    ClientsModule,
    CurrenciesModule,
    DashboardModule,
    ForumsModule,
    JudicialCentersModule,
    StaffModule,
    HealthModule
  ]
})
export class AppModule {}

function getRootEnvFilePaths() {
  const cwdEnvFiles = findEnvFiles(process.cwd());
  const moduleEnvFiles = findEnvFiles(__dirname);

  return unique([...cwdEnvFiles, ...moduleEnvFiles, join(process.cwd(), ".env")]).filter(
    (path): path is string => Boolean(path)
  );
}

function findEnvFiles(startDir: string) {
  let currentDir = startDir;

  for (let depth = 0; depth < 8; depth += 1) {
    const envFile = join(currentDir, ".env");
    const localEnvFile = join(currentDir, ".env.local");

    if (existsSync(envFile) || existsSync(localEnvFile)) {
      return [localEnvFile, envFile].filter((path) => existsSync(path));
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return [];
    }

    currentDir = parentDir;
  }

  return [];
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values)];
}
