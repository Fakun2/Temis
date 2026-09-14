import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

@Injectable()
export class NotionTokenService {
  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
  }

  decrypt(value: string) {
    const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    if (!iv || !tag || !encrypted) {
      throw new Error("El token de Notion guardado es invalido.");
    }

    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}

function getEncryptionKey() {
  const secret =
    process.env.NOTION_TOKEN_ENCRYPTION_KEY ??
    process.env.JWT_REFRESH_SECRET ??
    process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("Falta configurar NOTION_TOKEN_ENCRYPTION_KEY.");
  }

  return createHash("sha256").update(secret).digest();
}
