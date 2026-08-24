import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import dotenv from "dotenv";

export function loadEnv() {
  for (const file of getEnvFilePaths()) {
    dotenv.config({ path: file, override: file.endsWith(".local") });
  }
}

export function getEnv(name: string, fallback?: string) {
  const value = process.env[name];
  if (value !== undefined && value !== "") {
    return value;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`${name} es requerido.`);
}

export function getOptionalEnv(name: string) {
  const value = process.env[name];
  return value !== undefined && value !== "" ? value : undefined;
}

export function getPositiveNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

function getEnvFilePaths() {
  const root = resolve(__dirname, "../../..");
  const cwdEnvFiles = findEnvFiles(process.cwd());
  const moduleEnvFiles = findEnvFiles(__dirname);
  return unique([...cwdEnvFiles, ...moduleEnvFiles, join(root, ".env"), join(root, ".env.local")]);
}

function findEnvFiles(startDir: string) {
  let currentDir = startDir;

  for (let depth = 0; depth < 8; depth += 1) {
    const envFile = join(currentDir, ".env");
    const localEnvFile = join(currentDir, ".env.local");

    if (existsSync(envFile) || existsSync(localEnvFile)) {
      return [envFile, localEnvFile].filter((path) => existsSync(path));
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return [];
    }

    currentDir = parentDir;
  }

  return [];
}

function unique(values: string[]) {
  return [...new Set(values)].filter((path) => existsSync(path));
}
