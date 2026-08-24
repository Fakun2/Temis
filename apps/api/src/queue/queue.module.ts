import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AsyncOutboxPublisher } from "./async-outbox.publisher";
import { AsyncOutboxService } from "./async-outbox.service";
import { RabbitMqService } from "./rabbitmq.service";

@Module({
  imports: [DatabaseModule],
  providers: [AsyncOutboxPublisher, AsyncOutboxService, RabbitMqService],
  exports: [AsyncOutboxService, RabbitMqService]
})
export class QueueModule {}
