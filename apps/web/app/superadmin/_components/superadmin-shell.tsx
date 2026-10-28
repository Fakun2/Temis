"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UnauthorizedState } from "@/components/ui/not-found";
import { hasSuperAdminPermission } from "@/lib/auth/superadmin-permissions";
import { clearSuperAdminSession, saveSuperAdminSession } from "@/lib/auth/superadmin-session";
import { useSuperAdminSession } from "@/lib/auth/use-superadmin-session";
import { SuperAdminHeader } from "./superadmin-header";
import { SuperAdminSidebar } from "./superadmin-sidebar";

export function SuperAdminShell({
  children,
  initialSession
}: {
  children: React.ReactNode;
  initialSession: ReturnType<typeof useSuperAdminSession>;
}) {
  const router = useRouter();
  const storedSession = useSuperAdminSession();
  const session = storedSession ?? initialSession;
  const [ready, setReady] = useState(Boolean(initialSession));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (initialSession) {
      saveSuperAdminSession(initialSession);
      return;
    }
    let cancelled = false;
    fetch("/api/superadmin-auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("unauthorized");
        const loaded = await response.json();
        if (!cancelled) saveSuperAdminSession(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          clearSuperAdminSession();
          router.replace("/superadmin/login");
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialSession, router]);

  useEffect(() => {
    const tabletQuery = window.matchMedia("(max-width: 1279px)");
    const syncCollapsed = () => setSidebarOpen(false);
    syncCollapsed();
    tabletQuery.addEventListener("change", syncCollapsed);
    return () => tabletQuery.removeEventListener("change", syncCollapsed);
  }, []);

  if (!ready || !session) return <main className="min-h-screen bg-[var(--admin-sidebar-bg)]" />;

  return (
    <DashboardShell
      authorized={hasSuperAdminPermission(session, "platform:access")}
      banner={
        session.platformAccess.securityMode === "disabled" ? (
          <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-2 text-xs font-semibold text-amber-950">
            <AlertTriangle className="size-4" /> Seguridad reforzada desactivada
          </div>
        ) : undefined
      }
      header={
        <SuperAdminHeader
          onLogout={logout}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          scrolled={scrolled}
          session={session}
          sidebarOpen={sidebarOpen}
        />
      }
      mobileOpen={mobileOpen}
      mobileSidebar={
        <SuperAdminSidebar
          session={session}
          variant="mobile"
          onClose={() => setMobileOpen(false)}
        />
      }
      onMobileOpenChange={setMobileOpen}
      onScroll={setScrolled}
      onSidebarOpenChange={setSidebarOpen}
      restricted={
        <UnauthorizedState
          title="Panel restringido"
          description="No tenés permisos de plataforma."
        />
      }
      sidebar={<SuperAdminSidebar session={session} />}
      sidebarOpen={sidebarOpen}
    >
      {children}
    </DashboardShell>
  );
}

async function logout() {
  await fetch("/api/superadmin-auth/logout", { method: "POST" }).catch(() => null);
  clearSuperAdminSession();
  window.location.assign("/superadmin/login");
}
