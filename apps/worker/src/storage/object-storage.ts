import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getEnv, getOptionalEnv } from "../config";

export class ObjectStorage {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor() {
    const driver = getStorageDriver();
    this.bucket = getEnv("STORAGE_BUCKET");
    this.client = new S3Client({
      credentials: {
        accessKeyId: getEnv("STORAGE_ACCESS_KEY_ID"),
        secretAccessKey: getEnv("STORAGE_SECRET_ACCESS_KEY")
      },
      endpoint: getOptionalEnv("STORAGE_ENDPOINT"),
      forcePathStyle: getForcePathStyle(driver),
      region: getOptionalEnv("STORAGE_REGION") ?? "auto"
    });
  }

  async deleteObject(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );
  }
}

type StorageDriver = "minio" | "r2";

function getStorageDriver(): StorageDriver {
  const configuredDriver = process.env.STORAGE_DRIVER?.toLowerCase();
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (!configuredDriver) {
    if (nodeEnv === "production") {
      throw new Error("STORAGE_DRIVER es requerido en produccion.");
    }
    return "minio";
  }

  if (configuredDriver === "r2" || configuredDriver === "minio") {
    return configuredDriver;
  }

  throw new Error("STORAGE_DRIVER debe ser r2 o minio.");
}

function getForcePathStyle(driver: StorageDriver) {
  const configuredValue = process.env.STORAGE_FORCE_PATH_STYLE;
  if (configuredValue !== undefined && configuredValue !== "") {
    return configuredValue.toLowerCase() === "true";
  }

  return driver === "minio";
}
