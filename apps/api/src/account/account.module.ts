import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { StorageModule } from "../storage/storage.module";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [AccountController],
  providers: [AccountService]
})
export class AccountModule {}
