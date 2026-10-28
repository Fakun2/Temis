import { createHash } from "node:crypto";

export function digestPlatformValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
