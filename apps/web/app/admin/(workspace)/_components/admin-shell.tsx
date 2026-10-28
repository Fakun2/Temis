"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UnauthorizedState } from "@/components/ui/not-found";
import { hasPermission } from "@/lib/auth/permissions";
import { adminNavSections } from "../_constants/navigation";
import { useAdminShellState } from "../_hooks/use-admin-shell-state";
import { getAuthorizedNavSections } from "../_utils/authorization";
import type { AdminNavItem } from "../_types/admin";
import type { AdminShellProps } from "../_types/admin";
import { AdminCommandPalette } from "./command/admin-command-palette";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeaderBreadcrumbsProvider } from "./header/admin-header-breadcrumbs-context";
import { PlatformAnnouncementsBanner } from "./platform-announcements-banner";

export function TenantAdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shortcutPrefixRef = useRef<string | null>(null);
  const shortcutTimeoutRef = useRef<number | null>(null);
  const {
    commandOpen,
    mobileOpen,
    scrolled,
    session,
    sessionReady,
    setCommandOpen,
    setMobileOpen,
    setScrolled,
    setSidebarOpen,
    sidebarOpen
  } = useAdminShellState();
  const canAccessAdmin = hasPermission(session, "admin:access");
  const collapseSidebarFully =
    pathname === "/admin/tasks" && searchParams.get("view") === "kanban" && !sidebarOpen;
  const shortcutItems = useMemo(
    () => flattenShortcutItems(getAuthorizedNavSections(session, adminNavSections)),
    [session]
  );

  useEffect(() => {
    if (sessionReady && !session) {
      router.replace("/login");
    }
  }, [router, session, sessionReady]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (commandOpen || event.defaultPrevented || isEditableShortcutTarget(event.target)) {
        return;
      }

      const key = normalizeShortcutKey(event);

      if (!key) {
        return;
      }

      if (key === "a" && !shortcutPrefixRef.current) {
        event.preventDefault();
        shortcutPrefixRef.current = key;
        resetShortcutPrefixLater(shortcutPrefixRef, shortcutTimeoutRef);
        return;
      }

      const match = shortcutItems.find((item) =>
        matchesShortcutSequence([shortcutPrefixRef.current, key], item)
      );

      if (!match?.href) {
        clearShortcutPrefix(shortcutPrefixRef, shortcutTimeoutRef);
        return;
      }

      event.preventDefault();
      clearShortcutPrefix(shortcutPrefixRef, shortcutTimeoutRef);
      setMobileOpen(false);
      router.push(match.href);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearShortcutPrefix(shortcutPrefixRef, shortcutTimeoutRef);
    };
  }, [commandOpen, router, setMobileOpen, shortcutItems]);

  if (!sessionReady || !session) {
    return <main className="min-h-screen bg-[var(--admin-sidebar-bg)]" />;
  }

  return (
    <AdminHeaderBreadcrumbsProvider>
      <DashboardShell
        authorized={canAccessAdmin}
        banner={<PlatformAnnouncementsBanner />}
        sidebar={<AdminSidebar session={session} />}
        mobileSidebar={<AdminSidebar session={session} variant="mobile" onClose={() => setMobileOpen(false)} />}
        header={<AdminHeader
              onOpenCommand={() => setCommandOpen(true)}
              onOpenMobileSidebar={() => setMobileOpen(true)}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              scrolled={scrolled}
              session={session}
              sidebarOpen={sidebarOpen}
            />}
        commandPalette={<AdminCommandPalette
          open={commandOpen}
          session={session}
          onOpenChange={setCommandOpen}
        />}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        onScroll={setScrolled}
        onSidebarOpenChange={setSidebarOpen}
        restricted={<RestrictedAdminAccess />}
        sidebarOpen={sidebarOpen}
        collapseSidebarFully={collapseSidebarFully}
      >
        {children}
      </DashboardShell>
    </AdminHeaderBreadcrumbsProvider>
  );
}

function RestrictedAdminAccess() {
  return (
    <UnauthorizedState
      title="Panel restringido"
      description="Necesitas permisos adicionales para acceder al panel de administracion."
    />
  );
}

function flattenShortcutItems(sections: Array<{ items: AdminNavItem[] }>): AdminNavItem[] {
  return sections.flatMap((section) => section.items.flatMap(flattenShortcutItem));
}

function flattenShortcutItem(item: AdminNavItem): AdminNavItem[] {
  const self = item.href && item.shortcut && item.status !== "soon" ? [item] : [];
  const children = item.children?.flatMap(flattenShortcutItem) ?? [];

  return [...self, ...children];
}

function matchesShortcutSequence(keys: Array<string | null>, item: AdminNavItem) {
  const shortcutKeys = item.shortcut?.keys;

  if (!shortcutKeys?.length) {
    return false;
  }

  return (
    keys.length === shortcutKeys.length &&
    keys.every((key, index) => {
      const shortcutKey = shortcutKeys[index];

      if (!shortcutKey) {
        return false;
      }

      return key === shortcutKey.toLowerCase();
    })
  );
}

function normalizeShortcutKey(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null;
  }

  const key = event.key.toLowerCase();
  return /^[a-z]$/.test(key) ? key : null;
}

function resetShortcutPrefixLater(
  prefixRef: MutableRefObject<string | null>,
  timeoutRef: MutableRefObject<number | null>
) {
  if (timeoutRef.current) {
    window.clearTimeout(timeoutRef.current);
  }

  timeoutRef.current = window.setTimeout(() => {
    prefixRef.current = null;
    timeoutRef.current = null;
  }, 1200);
}

function clearShortcutPrefix(
  prefixRef: MutableRefObject<string | null>,
  timeoutRef: MutableRefObject<number | null>
) {
  prefixRef.current = null;

  if (timeoutRef.current) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
  );
}
