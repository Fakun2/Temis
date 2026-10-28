export type DevicePostureFailure =
  | "agent_stale"
  | "antimalware"
  | "bitlocker"
  | "critical_patches"
  | "firewall"
  | "platform"
  | "secure_boot"
  | "tpm";

export type DevicePostureResult = {
  checkedAt: Date;
  compliant: boolean;
  failures: DevicePostureFailure[];
};

export const DEVICE_POSTURE_PROVIDER = Symbol("DEVICE_POSTURE_PROVIDER");

export interface DevicePostureProvider {
  assess(externalDeviceId: string): Promise<DevicePostureResult>;
}

export class DevicePostureUnavailableError extends Error {
  constructor() {
    super("Device posture provider unavailable");
  }
}
