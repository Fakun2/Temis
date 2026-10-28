import type { ReactNode } from "react";
import { getVerifiedPlatformSession } from "@/lib/api/platform-server";
import { SuperAdminShell } from "../_components/superadmin-shell";

export default async function SuperAdminConsoleLayout({ children }: { children: ReactNode }) {
  const session = await getVerifiedPlatformSession();
  return <SuperAdminShell initialSession={session}>{children}</SuperAdminShell>;
}
