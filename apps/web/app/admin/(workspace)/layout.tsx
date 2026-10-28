import type { ReactNode } from "react";
import { TenantAdminShell } from "./_components/admin-shell";

export default function AdminWorkspaceLayout({ children }: { children: ReactNode }) {
  return <TenantAdminShell>{children}</TenantAdminShell>;
}
