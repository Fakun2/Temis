import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { DevicePostureUnavailableError } from "../src/auth/device-posture.provider";
import { OpswatDevicePostureProvider } from "../src/auth/opswat-device-posture.provider";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("OpswatDevicePostureProvider", () => {
  it("accepts a fresh compliant Windows endpoint", async () => {
    globalThis.fetch = async (input) => {
      if (String(input).includes("oauth")) {
        return Response.json({ access_token: "test-token", expires_in: 300 });
      }
      return Response.json({
        agentActive: true,
        antimalwareHealthy: true,
        bitlockerEnabled: true,
        checkedAt: new Date().toISOString(),
        criticalFindings: false,
        firewallEnabled: true,
        oldestCriticalPatchAgeDays: 2,
        os: "Windows 11",
        secureBootEnabled: true,
        tpmEnabled: true
      });
    };

    const result = await provider().assess("CN=device-1");
    assert.equal(result.compliant, true);
    assert.deepEqual(result.failures, []);
  });

  it("normalizes posture failures without returning provider details", async () => {
    globalThis.fetch = async (input) =>
      String(input).includes("oauth")
        ? Response.json({ access_token: "test-token", expires_in: 300 })
        : Response.json({
            agentActive: true,
            antimalwareHealthy: false,
            bitlockerEnabled: false,
            checkedAt: new Date().toISOString(),
            criticalFindings: true,
            firewallEnabled: false,
            oldestCriticalPatchAgeDays: 10,
            os: "Windows 11",
            secureBootEnabled: false,
            tpmEnabled: false
          });

    const result = await provider().assess("CN=device-1");
    assert.equal(result.compliant, false);
    assert.deepEqual(result.failures.sort(), [
      "antimalware",
      "bitlocker",
      "critical_patches",
      "firewall",
      "secure_boot",
      "tpm"
    ]);
  });

  it("fails closed when OPSWAT is unavailable", async () => {
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(() => provider().assess("CN=device-1"), DevicePostureUnavailableError);
  });
});

function provider() {
  const values: Record<string, string> = {
    OPSWAT_API_URL: "https://opswat.test/api/",
    OPSWAT_CLIENT_ID: "client",
    OPSWAT_CLIENT_SECRET: "secret",
    OPSWAT_TOKEN_URL: "https://opswat.test/oauth",
    PLATFORM_SECURITY_MODE: "required"
  };
  return new OpswatDevicePostureProvider({ get: (key: string) => values[key] } as never);
}
