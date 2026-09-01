"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UnauthorizedState } from "@/components/ui/not-found";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminUserMenu } from "../../(workspace)/_components/user/admin-user-menu";
import { useIaSession } from "../_hooks/use-ia-session";

export function IaShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, sessionReady } = useIaSession();
  const canUseAi = hasPermission(session, "ai:case_chat");

  useEffect(() => {
    if (sessionReady && !session) {
      router.replace("/login");
    }
  }, [router, session, sessionReady]);

  if (!sessionReady || !session) {
    return <main className="min-h-[100svh] bg-[var(--admin-sidebar-bg)]" />;
  }

  return (
    <main className="flex h-[100svh] flex-col overflow-hidden bg-[var(--admin-sidebar-bg)] text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between backdrop-blur px-4 sm:px-12">
        <Link
          href="/admin"
          aria-label="Volver"
          className="flex h-12 w-12 items-center justify-center"
        >
          <ArrowLeft className="h-6 w-6 md:h-6 md:w-6" aria-hidden="true" />
        </Link>
        <AdminUserMenu collapsed session={session} triggerVariant="pill" />
      </header>
      <section className="flex min-h-0 flex-1 overflow-hidden p-2 md:p-3">
        {canUseAi ? children : <RestrictedIa />}
      </section>
    </main>
  );
}

function RestrictedIa() {
  return (
    <UnauthorizedState
      title="IA restringida"
      description="Necesitas permisos de IA para acceder al asistente."
    />
  );
}
