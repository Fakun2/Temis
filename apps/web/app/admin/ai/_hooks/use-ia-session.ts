"use client";

import { useEffect, useState } from "react";
import { clearSession, saveSession, type TemisSession } from "@/lib/auth/session";

export function useIaSession() {
  const [session, setSession] = useState<TemisSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) {
          clearSession();
          if (!cancelled) {
            setSession(null);
            setSessionReady(true);
          }
          return;
        }

        const serverSession = (await response.json()) as TemisSession;
        saveSession(serverSession);
        if (!cancelled) {
          setSession(serverSession);
          setSessionReady(true);
        }
      } catch {
        clearSession();
        if (!cancelled) {
          setSession(null);
          setSessionReady(true);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return { session, sessionReady };
}
