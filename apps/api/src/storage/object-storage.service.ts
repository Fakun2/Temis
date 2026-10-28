import { Injectable } from "@nestjs/common";
import type {
  GetObjectResult,
  ObjectStorageStrategy,
  PutObjectInput
} from "./object-storage.strategy";
import { StorageStrategyFactory } from "./storage-strategy.factory";

@Injectable()
export class ObjectStorageService {
  private strategy?: ObjectStorageStrategy;

  constructor(private readonly strategyFactory: StorageStrategyFactory) {}

  getProvider() {
    return this.getStrategy().getProvider();
  }

  getBucket() {
    return this.getStrategy().getBucket();
  }

  checkHealth() {
    return this.getStrategy().checkHealth();
  }

  putObject(input: PutObjectInput) {
    return this.getStrategy().putObject(input);
  }

  getObject(key: string): Promise<GetObjectResult> {
    return this.getStrategy().getObject(key);
  }

  deleteObject(key: string) {
    return this.getStrategy().deleteObject(key);
  }

  private getStrategy() {
    this.strategy ??= this.strategyFactory.create();
    return this.strategy;
  }
}
