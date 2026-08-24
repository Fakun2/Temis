import {
  outboxDatabaseRetryAttempts,
  outboxDatabaseRetryBaseDelayMs
} from "./constants";

export async function withTransientDatabaseRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= outboxDatabaseRetryAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientPrismaError(error) || attempt === outboxDatabaseRetryAttempts) {
        throw error;
      }

      await sleep(getRetryDelayMs(attempt));
    }
  }

  throw lastError;
}

export function isTransientPrismaError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return ["P2024", "P2028", "P2034"].includes(String(error.code));
}

function getRetryDelayMs(attempt: number) {
  const exponentialDelay = outboxDatabaseRetryBaseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * outboxDatabaseRetryBaseDelayMs);
  return exponentialDelay + jitter;
}

export function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
