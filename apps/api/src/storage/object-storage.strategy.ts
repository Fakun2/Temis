import type { Readable } from "node:stream";

export type PutObjectInput = {
  body: Buffer;
  contentLength: number;
  contentType: string;
  key: string;
};

export type GetObjectResult = {
  body: Readable;
  contentLength?: number;
  contentType?: string;
};

export interface ObjectStorageStrategy {
  checkHealth(): Promise<void>;
  deleteObject(key: string): Promise<void>;
  getObject(key: string): Promise<GetObjectResult>;
  getProvider(): string;
  getBucket(): string;
  putObject(input: PutObjectInput): Promise<void>;
}
