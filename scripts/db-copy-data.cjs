const { spawnSync } = require("node:child_process");
const { existsSync, mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const dotenv = require("dotenv");

const repoRoot = resolve(__dirname, "..");
const schemaPath = resolve(repoRoot, "packages/database/prisma/schema.prisma");
dotenv.config({ path: resolve(repoRoot, ".env") });
dotenv.config({ path: resolve(repoRoot, ".env.local"), override: true });

const sourceUrl = process.env.SOURCE_DATABASE_URL ?? process.env.OLD_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL ?? process.env.NEW_DATABASE_URL;
const allowNonEmptyTarget = process.argv.includes("--allow-non-empty-target");
const skipSeeds = process.argv.includes("--skip-seeds");
const useDockerPgTools =
  process.argv.includes("--docker-tools") || !hasCommand("pg_dump") || !hasCommand("psql");

if (!sourceUrl || !targetUrl) {
  fail(
    [
      "Faltan URLs de base de datos.",
      "Uso:",
      "  SOURCE_DATABASE_URL=\"postgresql://...vieja\" TARGET_DATABASE_URL=\"postgresql://...nueva\" npm run db:copy-data",
      "",
      "Aliases aceptados: OLD_DATABASE_URL y NEW_DATABASE_URL."
    ].join("\n")
  );
}

if (sourceUrl === targetUrl) {
  fail("SOURCE_DATABASE_URL y TARGET_DATABASE_URL no pueden ser iguales.");
}

if (useDockerPgTools) {
  assertCommandAvailable("docker");
} else {
  assertCommandAvailable("pg_dump");
  assertCommandAvailable("psql");
}

const targetEnv = { ...process.env, DATABASE_URL: targetUrl };
const tempDir = mkdtempSync(join(tmpdir(), "temis-db-copy-"));
const dumpPath = join(tempDir, "data.sql");

try {
  console.log("Preparing target schema...");
  run("npx", ["prisma", "migrate", "deploy", "--schema", schemaPath], { env: targetEnv });

  if (!allowNonEmptyTarget) {
    assertTargetIsEmpty(targetUrl);
  }

  console.log("Dumping source data...");
  runPgTool("pg_dump", [
    "--dbname",
    toToolDatabaseUrl(sourceUrl),
    "--data-only",
    "--inserts",
    "--on-conflict-do-nothing",
    "--no-owner",
    "--no-privileges",
    "--exclude-table-data=public._prisma_migrations",
    "--file",
    dumpPath
  ]);

  console.log("Restoring data into target...");
  runPgTool("psql", [
    "--dbname",
    toToolDatabaseUrl(targetUrl),
    "--set",
    "ON_ERROR_STOP=1",
    "--file",
    dumpPath
  ]);

  if (!skipSeeds) {
    console.log("Refreshing RBAC and legal catalog seeds...");
    run("node", ["packages/database/prisma/seed-rbac.cjs"], { env: targetEnv });
    run("node", ["packages/database/prisma/seed-legal-catalogs.cjs"], { env: targetEnv });
  }

  console.log("Database copy completed.");
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}

function assertTargetIsEmpty(databaseUrl) {
  const query = `
    SELECT
      (SELECT count(*) FROM tenants) +
      (SELECT count(*) FROM users) +
      (SELECT count(*) FROM roles) +
      (SELECT count(*) FROM permissions) +
      (SELECT count(*) FROM provinces) +
      (SELECT count(*) FROM cases)
    AS total_records;
  `;
  const result = spawnPgTool("psql", [
    "--dbname",
    toToolDatabaseUrl(databaseUrl),
    "--tuples-only",
    "--no-align",
    "--command",
    query
  ]);

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    fail("No se pudo verificar si la base destino esta vacia.");
  }

  const totalRecords = Number(result.stdout.trim() || "0");
  if (totalRecords > 0) {
    fail(
      [
        `La base destino no esta vacia (${totalRecords} registros base detectados).`,
        "Para evitar conflictos de FK/roles, usa una base nueva o ejecuta con --allow-non-empty-target bajo tu responsabilidad."
      ].join("\n")
    );
  }
}

function assertCommandAvailable(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    fail(`No encontre ${command} en PATH. Instala PostgreSQL client tools o agrega ${command} al PATH.`);
  }
}

function hasCommand(command) {
  return spawnSync(command, ["--version"], { encoding: "utf8" }).status === 0;
}

function runPgTool(command, args) {
  const result = spawnPgTool(command, args, "inherit");

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function spawnPgTool(command, args, stdio = "pipe") {
  if (!useDockerPgTools) {
    return spawnSync(command, args, {
      encoding: stdio === "pipe" ? "utf8" : undefined,
      stdio
    });
  }

  return spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      `${tempDir}:/backup`,
      "postgres:16-alpine",
      command,
      ...toDockerPgToolArgs(args)
    ],
    {
      encoding: stdio === "pipe" ? "utf8" : undefined,
      stdio
    }
  );
}

function toDockerPgToolArgs(args) {
  return args.map((arg) => (arg === dumpPath ? "/backup/data.sql" : arg));
}

function toToolDatabaseUrl(databaseUrl) {
  if (!useDockerPgTools) {
    return databaseUrl;
  }

  const url = new URL(databaseUrl);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    url.hostname = "host.docker.internal";
  }

  return url.toString();
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
