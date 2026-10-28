import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DevicePostureProvider,
  DevicePostureResult,
  DevicePostureUnavailableError,
  type DevicePostureFailure
} from "./device-posture.provider";

type OpswatToken = { access_token?: string; expires_in?: number };

@Injectable()
export class OpswatDevicePostureProvider implements DevicePostureProvider {
  private accessToken: { expiresAt: number; value: string } | null = null;

  constructor(private readonly config: ConfigService) {}

  async assess(externalDeviceId: string): Promise<DevicePostureResult> {
    const mode = this.config.get<string>("PLATFORM_SECURITY_MODE") ?? "disabled";
    if (mode === "disabled") {
      return { checkedAt: new Date(), compliant: true, failures: [] };
    }

    const apiUrl = this.required("OPSWAT_API_URL");
    const pathTemplate =
      this.config.get<string>("OPSWAT_DEVICE_POSTURE_PATH") ?? "/devices/{deviceId}/posture";
    const path = pathTemplate.replace("{deviceId}", encodeURIComponent(externalDeviceId));

    try {
      const response = await fetch(new URL(path, apiUrl), {
        headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
        signal: AbortSignal.timeout(5_000)
      });
      if (!response.ok) throw new DevicePostureUnavailableError();
      return normalizePosture(await response.json());
    } catch (error) {
      if (error instanceof DevicePostureUnavailableError) throw error;
      throw new DevicePostureUnavailableError();
    }
  }

  private async getAccessToken() {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) {
      return this.accessToken.value;
    }

    const response = await fetch(this.required("OPSWAT_TOKEN_URL"), {
      body: new URLSearchParams({
        client_id: this.required("OPSWAT_CLIENT_ID"),
        client_secret: this.required("OPSWAT_CLIENT_SECRET"),
        grant_type: "client_credentials"
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) throw new DevicePostureUnavailableError();
    const token = (await response.json()) as OpswatToken;
    if (!token.access_token) throw new DevicePostureUnavailableError();
    this.accessToken = {
      expiresAt: Date.now() + Math.max(token.expires_in ?? 300, 60) * 1_000,
      value: token.access_token
    };
    return token.access_token;
  }

  private required(key: string) {
    const value = this.config.get<string>(key);
    if (!value) throw new DevicePostureUnavailableError();
    return value;
  }
}

function normalizePosture(input: unknown): DevicePostureResult {
  if (!input || typeof input !== "object") throw new DevicePostureUnavailableError();
  const value = input as Record<string, unknown>;
  const failures: DevicePostureFailure[] = [];
  const checkedAt = parseFreshDate(value.checkedAt ?? value.lastSeenAt);
  const platform = String(value.platform ?? value.os ?? "").toLowerCase();

  if (!platform.includes("windows")) failures.push("platform");
  if (value.agentActive !== true) failures.push("agent_stale");
  if (value.bitlockerEnabled !== true) failures.push("bitlocker");
  if (value.secureBootEnabled === false) failures.push("secure_boot");
  if (value.tpmEnabled === false) failures.push("tpm");
  if (value.antimalwareHealthy !== true) failures.push("antimalware");
  if (value.firewallEnabled !== true) failures.push("firewall");
  if (Number(value.oldestCriticalPatchAgeDays ?? 0) > 7 || value.criticalFindings === true) {
    failures.push("critical_patches");
  }
  if (Date.now() - checkedAt.getTime() > 5 * 60_000) failures.push("agent_stale");

  return { checkedAt, compliant: failures.length === 0, failures: [...new Set(failures)] };
}

function parseFreshDate(value: unknown) {
  const date = new Date(typeof value === "string" ? value : "");
  if (Number.isNaN(date.getTime())) throw new DevicePostureUnavailableError();
  return date;
}
