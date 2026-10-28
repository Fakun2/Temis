import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import type {
  GetObjectResult,
  ObjectStorageStrategy,
  PutObjectInput
} from "./object-storage.strategy";

type S3CompatibleStorageConfig = {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  provider: string;
  region: string;
  secretAccessKey: string;
};

export class S3CompatibleStorageStrategy implements ObjectStorageStrategy {
  private readonly client: S3Client;

  constructor(private readonly config: S3CompatibleStorageConfig) {
    this.client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      region: config.region
    });
  }

  getProvider() {
    return this.config.provider;
  }

  getBucket() {
    return this.config.bucket;
  }

  async checkHealth() {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
  }

  async putObject(input: PutObjectInput) {
    await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: this.config.bucket,
        ContentLength: input.contentLength,
        ContentType: input.contentType,
        Key: input.key
      })
    );
  }

  async getObject(key: string): Promise<GetObjectResult> {
    const object = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      })
    );

    if (!object.Body) {
      throw new Error("El archivo no tiene contenido disponible.");
    }

    return {
      body: toReadable(object.Body),
      contentLength: object.ContentLength,
      contentType: object.ContentType
    };
  }

  async deleteObject(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      })
    );
  }
}

function toReadable(body: unknown): Readable {
  if (body instanceof Readable) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Readable.from(body);
  }

  if (isWebReadableStream(body)) {
    return Readable.fromWeb(body);
  }

  throw new Error("El archivo no se pudo convertir a stream.");
}

function isWebReadableStream(value: unknown): value is ReadableStream {
  return typeof ReadableStream !== "undefined" && value instanceof ReadableStream;
}
