"use client";

import { useEffect, useState } from "react";
import {
  clearSession,
  readSession,
  saveSession,
  subscribeSession,
  type BogaapSession
} from "@/lib/auth/session";

export function useAdminShellState() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [session, setSession] = useState<BogaapSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            clearSession();
            setSession(null);
            setSessionReady(true);
          }
          return;
        }

        const serverSession = (await response.json()) as BogaapSession;
        saveSession(serverSession);
        if (!cancelled) {
          setSession(readSession());
          setSessionReady(true);
        }
      } catch {
        if (!cancelled) {
          clearSession();
          setSession(null);
          setSessionReady(true);
        }
      }
    }

    void loadSession();

    const tabletQuery = window.matchMedia("(max-width: 1279px)");
    const syncCollapsed = () => setSidebarOpen(false);
    syncCollapsed();
    tabletQuery.addEventListener("change", syncCollapsed);

    return () => {
      cancelled = true;
      tabletQuery.removeEventListener("change", syncCollapsed);
    };
  }, []);

  useEffect(() => subscribeSession(() => setSession(readSession())), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return {
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
  };
}
