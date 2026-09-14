import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type GoogleCalendarResourceType = "case_task" | "case_hearing";

export type GoogleCalendarSyncMode = "global" | "custom";
export type GoogleCalendarSyncSource =
  | "all_hearings"
  | "my_tasks"
  | "my_area_tasks"
  | "participating_hearings"
  | "all_tasks";

export const googleCalendarSyncSources: GoogleCalendarSyncSource[] = [
  "all_hearings",
  "my_tasks",
  "my_area_tasks",
  "participating_hearings",
  "all_tasks"
];

export type GoogleCalendarOperation =
  | "provision"
  | "initial-sync"
  | "upsert"
  | "delete"
  | "disconnect";

export type GoogleCalendarSyncMessage = {
  connectionId: string;
  operation: GoogleCalendarOperation;
  resourceId?: string;
  resourceType?: GoogleCalendarResourceType;
  tenantId: string;
};

export class GoogleCalendarTokenCipher {
  constructor(private readonly secret: string) {
    if (!secret.trim()) {
      throw new Error("Falta configurar GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY.");
    }
  }

  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
  }

  decrypt(value: string) {
    const parts = value.split(".");
    if (parts.length !== 3) {
      throw new Error("El token de Google Calendar guardado es invalido.");
    }

    const iv = Buffer.from(parts[0]!, "base64url");
    const tag = Buffer.from(parts[1]!, "base64url");
    const encrypted = Buffer.from(parts[2]!, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }

  private key() {
    return createHash("sha256").update(this.secret).digest();
  }
}
