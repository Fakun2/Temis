export function createLogger(scope: string) {
  return {
    error(message: string, error?: unknown) {
      console.error(format(scope, "ERROR", message), error ?? "");
    },
    info(message: string) {
      console.log(format(scope, "INFO", message));
    },
    warn(message: string, error?: unknown) {
      console.warn(format(scope, "WARN", message), error ?? "");
    }
  };
}

function format(scope: string, level: string, message: string) {
  return `[${new Date().toISOString()}] [${level}] [${scope}] ${message}`;
}
