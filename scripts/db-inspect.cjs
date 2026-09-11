const { resolve } = require("node:path");
const { dirname } = require("node:path");
const { mkdirSync, writeFileSync } = require("node:fs");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

const repoRoot = resolve(__dirname, "..");
dotenv.config({ path: resolve(repoRoot, ".env") });
dotenv.config({ path: resolve(repoRoot, ".env.local"), override: true });

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const outputJson = args.has("--json");
const skipExplain = args.has("--no-explain");
const analyzeFirst = args.has("--analyze");
const outputPath = getOutputPath(rawArgs);

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL no esta configurada. No se ejecuto la inspeccion.");
}

const prisma = new PrismaClient();

main()
  .catch((error) => {
    fail(error.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  if (analyzeFirst) {
    await prisma.$executeRawUnsafe("ANALYZE");
  }

  const [tables, indexes, rls, policies, duplicateIndexes] = await Promise.all([
    getTables(),
    getIndexes(),
    getRlsStatus(),
    getPolicies(),
    getDuplicateIndexes()
  ]);
  const explains = skipExplain ? [] : await getCriticalExplains();

  const report = sanitize({
    generatedAt: new Date().toISOString(),
    analyzeExecuted: analyzeFirst,
    databaseUrlPrinted: false,
    tables,
    indexes,
    rls,
    policies,
    duplicateIndexes,
    explains
  });
  writeOutputFile(report);

  if (outputJson) {
    console.log(json(report));
    return;
  }

  printHumanReport(report);
}

async function getTables() {
  return prisma.$queryRawUnsafe(`
    SELECT
      relname AS table_name,
      n_live_tup::bigint AS live_rows,
      n_dead_tup::bigint AS dead_rows,
      seq_scan::bigint AS seq_scan,
      idx_scan::bigint AS idx_scan,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
      pg_size_pretty(pg_relation_size(relid)) AS table_size,
      pg_size_pretty(pg_indexes_size(relid)) AS indexes_size,
      last_analyze,
      last_autoanalyze,
      last_vacuum,
      last_autovacuum
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC, relname;
  `);
}

async function getIndexes() {
  return prisma.$queryRawUnsafe(`
    SELECT
      s.relname AS table_name,
      s.indexrelname AS index_name,
      s.idx_scan::bigint AS idx_scan,
      pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size,
      i.indexdef AS definition
    FROM pg_stat_user_indexes s
    JOIN pg_indexes i
      ON i.schemaname = s.schemaname
      AND i.tablename = s.relname
      AND i.indexname = s.indexrelname
    ORDER BY s.relname, s.indexrelname;
  `);
}

async function getRlsStatus() {
  return prisma.$queryRawUnsafe(`
    SELECT
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS rls_forced,
      count(p.polname)::int AS policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
    ORDER BY c.relname;
  `);
}

async function getPolicies() {
  return prisma.$queryRawUnsafe(`
    SELECT
      schemaname,
      tablename AS table_name,
      policyname AS policy_name,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
}

async function getDuplicateIndexes() {
  return prisma.$queryRawUnsafe(`
    WITH indexes AS (
      SELECT indrelid, indexrelid, indkey, indisunique, indisprimary
      FROM pg_index
    )
    SELECT
      t.relname AS table_name,
      i1c.relname AS index_a,
      i2c.relname AS index_b
    FROM indexes i1
    JOIN indexes i2 ON i1.indrelid = i2.indrelid AND i1.indexrelid < i2.indexrelid
      AND i1.indkey = i2.indkey
      AND i1.indisunique = i2.indisunique
      AND i1.indisprimary = i2.indisprimary
    JOIN pg_class t ON t.oid = i1.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_class i1c ON i1c.oid = i1.indexrelid
    JOIN pg_class i2c ON i2c.oid = i2.indexrelid
    WHERE n.nspname = 'public'
    ORDER BY t.relname, i1c.relname;
  `);
}

async function getCriticalExplains() {
  const tenantSample = await prisma.$queryRawUnsafe(`
    SELECT
      c.tenant_id::text AS tenant_id,
      c.id::text AS case_id,
      tm.user_id::text AS user_id
    FROM cases c
    LEFT JOIN tenant_memberships tm ON tm.tenant_id = c.tenant_id
    ORDER BY c.created_at DESC
    LIMIT 1;
  `);
  const fallbackTenant = await prisma.$queryRawUnsafe(`
    SELECT
      t.id::text AS tenant_id,
      tm.user_id::text AS user_id
    FROM tenants t
    LEFT JOIN tenant_memberships tm ON tm.tenant_id = t.id
    ORDER BY t.created_at DESC
    LIMIT 1;
  `);
  const sample = tenantSample[0] ?? fallbackTenant[0];

  if (!sample?.tenant_id) {
    return [{ name: "sample-data", skipped: true, reason: "No hay tenants/cases para EXPLAIN." }];
  }

  const tenantId = sample.tenant_id;
  const caseId = sample.case_id;
  const userId = sample.user_id;
  const explains = [];

  explains.push(
    await explain(
      "cases:list-default",
      [
        `SELECT id, case_number, caption, status, created_at`,
        `FROM cases`,
        `WHERE tenant_id = $1::uuid`,
        `ORDER BY created_at DESC, id DESC`,
        `LIMIT 9`
      ].join("\n"),
      [tenantId]
    )
  );

  explains.push(
    await explain(
      "cases:search",
      [
        `SELECT id, case_number, caption, subject`,
        `FROM cases`,
        `WHERE tenant_id = $1::uuid`,
        `  AND (case_number ILIKE '%' || $2 || '%'`,
        `    OR caption ILIKE '%' || $2 || '%'`,
        `    OR subject ILIKE '%' || $2 || '%')`,
        `ORDER BY created_at DESC, id DESC`,
        `LIMIT 9`
      ].join("\n"),
      [tenantId, "test"]
    )
  );

  if (caseId) {
    explains.push(
      await explain(
        "cases:detail",
        [
          `SELECT c.id, c.case_number, c.caption, c.status`,
          `FROM cases c`,
          `WHERE c.tenant_id = $1::uuid AND c.id = $2::uuid`,
          `LIMIT 1`
        ].join("\n"),
        [tenantId, caseId]
      )
    );

    explains.push(
      await explain(
        "calendar:expenses",
        [
          `SELECT id, concept, amount, payment_date, status`,
          `FROM case_expenses`,
          `WHERE tenant_id = $1::uuid AND case_id = $2::uuid`,
          `  AND payment_date >= date_trunc('month', current_date)::date`,
          `  AND payment_date < (date_trunc('month', current_date) + interval '1 month')::date`,
          `  AND status IN ('pending','overdue')`,
          `ORDER BY payment_date ASC, id ASC`
        ].join("\n"),
        [tenantId, caseId]
      )
    );

    explains.push(
      await explain(
        "calendar:tasks",
        [
          `SELECT id, name, start_date, end_date, status`,
          `FROM case_tasks`,
          `WHERE tenant_id = $1::uuid AND case_id = $2::uuid`,
          `  AND status IN ('pending','in_progress')`,
          `  AND ((end_date >= date_trunc('month', current_date)::date`,
          `        AND end_date < (date_trunc('month', current_date) + interval '1 month')::date)`,
          `    OR (end_date IS NULL`,
          `        AND start_date >= date_trunc('month', current_date)::date`,
          `        AND start_date < (date_trunc('month', current_date) + interval '1 month')::date))`,
          `ORDER BY end_date ASC, start_date ASC, id ASC`
        ].join("\n"),
        [tenantId, caseId]
      )
    );

    explains.push(
      await explain(
        "calendar:hearings",
        [
          `SELECT id, description, date, time, type`,
          `FROM case_hearings`,
          `WHERE tenant_id = $1::uuid AND case_id = $2::uuid`,
          `  AND date >= date_trunc('month', current_date)::date`,
          `  AND date < (date_trunc('month', current_date) + interval '1 month')::date`,
          `ORDER BY date ASC, time ASC, id ASC`
        ].join("\n"),
        [tenantId, caseId]
      )
    );
  }

  explains.push(
    await explain(
      "roles:list",
      [
        `SELECT id, code, name, active, is_system, tenant_id`,
        `FROM roles`,
        `WHERE (is_system = true AND tenant_id IS NULL) OR tenant_id = $1::uuid`,
        `ORDER BY is_system DESC, name ASC`
      ].join("\n"),
      [tenantId]
    )
  );

  if (userId) {
    explains.push(
      await explain(
        "staff:list",
        [
          `SELECT tm.id, tm.status, tm.created_at, u.full_name, r.code`,
          `FROM tenant_memberships tm`,
          `JOIN users u ON u.id = tm.user_id`,
          `LEFT JOIN roles r ON r.id = tm.role_id`,
          `WHERE tm.tenant_id = $1::uuid`,
          `ORDER BY tm.created_at DESC, tm.id DESC`,
          `LIMIT 9`
        ].join("\n"),
        [tenantId]
      )
    );
  }

  return explains;
}

async function explain(name, sql, params) {
  const parameterPlaceholders = params.map((_, index) => `$${index + 1}`);
  const plan = await prisma.$queryRawUnsafe(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)\n${sql}`,
    ...params
  );
  const root = plan[0]["QUERY PLAN"][0];
  const rootPlan = root.Plan;

  return {
    name,
    parameters: parameterPlaceholders,
    nodeType: rootPlan["Node Type"],
    totalCost: rootPlan["Total Cost"],
    actualTotalTimeMs: rootPlan["Actual Total Time"],
    actualRows: rootPlan["Actual Rows"],
    planningTimeMs: root["Planning Time"],
    executionTimeMs: root["Execution Time"],
    plan: root
  };
}

function printHumanReport(report) {
  console.log("Temis DB Inspect");
  console.log(`Generated at: ${report.generatedAt}`);
  console.log(`ANALYZE executed first: ${report.analyzeExecuted ? "yes" : "no"}`);
  console.log("DATABASE_URL printed: no");

  console.log("\nTables");
  for (const table of report.tables) {
    console.log(
      [
        `- ${table.table_name}`,
        `rows=${table.live_rows}`,
        `dead=${table.dead_rows}`,
        `seq=${table.seq_scan}`,
        `idx=${table.idx_scan}`,
        `size=${table.total_size}`
      ].join(" ")
    );
  }

  console.log("\nRLS");
  for (const item of report.rls) {
    console.log(
      `- ${item.table_name} enabled=${item.rls_enabled} forced=${item.rls_forced} policies=${item.policy_count}`
    );
  }

  console.log("\nPolicies");
  if (report.policies.length === 0) {
    console.log("- none");
  } else {
    for (const policy of report.policies) {
      console.log(`- ${policy.table_name}.${policy.policy_name} cmd=${policy.cmd}`);
    }
  }

  console.log("\nDuplicate indexes");
  if (report.duplicateIndexes.length === 0) {
    console.log("- none");
  } else {
    for (const item of report.duplicateIndexes) {
      console.log(`- ${item.table_name}: ${item.index_a} / ${item.index_b}`);
    }
  }

  console.log("\nIndexes");
  for (const index of report.indexes) {
    console.log(
      `- ${index.table_name}.${index.index_name} scans=${index.idx_scan} size=${index.index_size}`
    );
  }

  console.log("\nCritical EXPLAIN summaries");
  if (report.explains.length === 0) {
    console.log("- skipped");
  } else {
    for (const item of report.explains) {
      if (item.skipped) {
        console.log(`- ${item.name}: skipped (${item.reason})`);
        continue;
      }
      console.log(
        `- ${item.name}: node=${item.nodeType} rows=${item.actualRows} planning=${item.planningTimeMs}ms execution=${item.executionTimeMs}ms`
      );
    }
  }
}

function sanitize(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "<uuid>"
    );
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }

  return value;
}

function json(value) {
  return JSON.stringify(value, (_, item) => (typeof item === "bigint" ? item.toString() : item), 2);
}

function getOutputPath(argv) {
  const outputFlagIndex = argv.indexOf("--output");
  if (outputFlagIndex >= 0) {
    return argv[outputFlagIndex + 1];
  }

  const inlineFlag = argv.find((arg) => arg.startsWith("--output="));
  return inlineFlag ? inlineFlag.slice("--output=".length) : null;
}

function writeOutputFile(report) {
  if (!outputPath) {
    return;
  }

  const absoluteOutputPath = resolve(repoRoot, outputPath);
  if (!absoluteOutputPath.startsWith(repoRoot)) {
    fail("--output debe apuntar a un archivo dentro del repositorio.");
  }

  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, `${json(report)}\n`, "utf8");
  console.error(`Reporte escrito en ${outputPath}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
