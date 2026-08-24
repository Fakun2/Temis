const { spawnSync } = require("node:child_process");
const { cpSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { relative, resolve } = require("node:path");

const repoRoot = resolve(__dirname, "..");
const envPath = resolve(repoRoot, ".env");
const localEnvPath = resolve(repoRoot, ".env.local");
const command = process.argv[2];
const flags = new Set(process.argv.slice(3));
const mode = getDockerMode(command);
const stagedRoot = resolve(tmpdir(), mode === "dev" ? "bogaap-docker-dev" : "bogaap-docker");
const selectedEnvFile = mode === "dev" ? localEnvPath : envPath;

if (!command) {
  fail("Usage: node scripts/docker.cjs <up|recreate|infra|down> [--detached]");
}

if (!existsSync(selectedEnvFile)) {
  fail(
    mode === "dev"
      ? "No se encontro .env.local en el root. Crea uno copiando .env.example."
      : "No se encontro .env en el root. Crea uno copiando .env.example."
  );
}

switch (command) {
  case "up":
  case "recreate":
    syncWorkspaceToStaging();
    removeConflictingContainers();
    compose([
      "up",
      "--build",
      "--force-recreate",
      ...(flags.has("--detached") || flags.has("-d") ? ["-d"] : [])
    ]);
    break;
  case "infra":
    syncWorkspaceToStaging();
    removeConflictingContainers();
    compose([
      "up",
      "-d",
      "--force-recreate",
      "postgres",
      "redis",
      "rabbitmq",
      "minio",
      "minio-init"
    ]);
    compose(["stop", "api", "worker", "web", "nginx"]);
    break;
  case "infra:down":
    compose(["stop"]);
    break;
  case "down":
    compose(["stop"]);
    break;
  default:
    fail(`Comando Docker desconocido: ${command}`);
}

function compose(args) {
  const result = spawnSync("docker", ["compose", ...getProjectArgs(), ...getEnvFileArgs(), ...args], {
    cwd: getComposeRoot(),
    env: {
      ...process.env,
      COMPOSE_PROJECT_NAME: getComposeProjectName(),
      CONTAINER_PREFIX: getContainerPrefix()
    },
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function removeConflictingContainers() {
  const containerNames = [
    "postgres",
    "redis",
    "rabbitmq",
    "minio",
    "minio-init",
    "api",
    "worker",
    "web",
    "nginx"
  ].map((service) => `${getContainerPrefix()}-${service}`);

  for (const containerName of containerNames) {
    const exists = spawnSync("docker", ["container", "inspect", containerName], {
      encoding: "utf8",
      stdio: "pipe"
    }).status === 0;

    if (!exists) {
      continue;
    }

    const result = spawnSync("docker", ["rm", "-f", containerName], {
      stdio: "inherit"
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

function getEnvFileArgs() {
  const composeRoot = getComposeRoot();
  const envFileName = mode === "dev" ? ".env.local" : ".env";
  const envFile = resolve(composeRoot, envFileName);

  if (existsSync(envFile)) {
    return ["--env-file", envFileName];
  }

  return [];
}

function getProjectArgs() {
  return ["--project-name", getComposeProjectName()];
}

function getComposeProjectName() {
  return mode === "dev" ? "bogaap-dev" : "bogaap";
}

function getContainerPrefix() {
  return mode === "dev" ? "bogaap-dev" : "bogaap";
}

function syncWorkspaceToStaging() {
  assertSafeStagingPath();

  rmSync(stagedRoot, { force: true, recursive: true });
  mkdirSync(stagedRoot, { recursive: true });
  cpSync(repoRoot, stagedRoot, {
    dereference: true,
    errorOnExist: false,
    filter: shouldCopyPath,
    force: true,
    recursive: true
  });
}

function shouldCopyPath(sourcePath) {
  const normalized = relative(repoRoot, sourcePath).replaceAll("\\", "/");
  if (!normalized) {
    return true;
  }

  const pathParts = normalized.split("/");
  const ignoredDirectories = new Set([
    ".agents",
    ".git",
    ".github",
    ".next",
    ".turbo",
    "coverage",
    "dist",
    "node_modules"
  ]);

  if (pathParts.some((part) => ignoredDirectories.has(part))) {
    return false;
  }

  return !normalized.endsWith(".log");
}

function getComposeRoot() {
  if ((command === "down" || command === "infra:down") && !existsSync(resolve(stagedRoot, "docker-compose.yml"))) {
    return repoRoot;
  }

  return stagedRoot;
}

function getDockerMode(currentCommand) {
  return currentCommand?.startsWith("infra") ? "dev" : "full";
}

function assertSafeStagingPath() {
  const relativeToTemp = relative(resolve(tmpdir()), stagedRoot);
  if (relativeToTemp.startsWith("..") || relativeToTemp === "") {
    fail(`Refusing to sync unexpected staging path: ${stagedRoot}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
