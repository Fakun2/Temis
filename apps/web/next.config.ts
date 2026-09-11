import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(appRoot, "../..");
const isDev = process.env.NODE_ENV !== "production";

loadEnvConfig(workspaceRoot, isDev);

const lanAllowedDevOrigins = process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? ["[IP_ADDRESS]", "[IP_ADDRESS]"];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot
  },
  transpilePackages: ["@temis/api-client"],
  allowedDevOrigins: lanAllowedDevOrigins
};

export default nextConfig;
