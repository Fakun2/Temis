import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseModule } from "./database/database.module";
import { DocumentsModule } from "./documents/documents.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { QueueConsumersService } from "./queue/queue-consumers.service";
import { QueueModule } from "./queue/queue.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getRootEnvFilePaths(),
      isGlobal: true
    }),
    DatabaseModule,
    QueueModule,
    DocumentsModule,
    NotificationsModule,
    IntegrationsModule,
    RedisModule
  ],
  providers: [QueueConsumersService]
})
export class WorkerModule {}

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
