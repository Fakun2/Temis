const { readdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const directory = process.argv[2] ?? "test";
const excludedSuffix = process.argv[3];
const includedPattern = process.argv[4] ? new RegExp(process.argv[4]) : null;
const project = process.argv[5] ? resolve(process.cwd(), process.argv[5]) : null;
const absoluteDirectory = resolve(process.cwd(), directory);
const files = readdirSync(absoluteDirectory)
  .filter((file) => file.endsWith(".spec.ts"))
  .filter((file) => !excludedSuffix || !file.endsWith(excludedSuffix))
  .filter((file) => !includedPattern || includedPattern.test(file))
  .map((file) => resolve(absoluteDirectory, file));

if (!files.length) {
  console.error(`No TypeScript specs found in ${absoluteDirectory}.`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    "--test",
    "--test-concurrency=1",
    "-r",
    "ts-node/register",
    "-r",
    "tsconfig-paths/register",
    ...files
  ],
  {
    cwd: process.cwd(),
    env: project ? { ...process.env, TS_NODE_PROJECT: project } : process.env,
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
