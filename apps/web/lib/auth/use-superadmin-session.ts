"use client";

import { useEffect, useState } from "react";
import { readSuperAdminSession, subscribeSuperAdminSession } from "./superadmin-session";

export function useSuperAdminSession() {
  const [session, setSession] = useState(() => readSuperAdminSession());
  useEffect(() => subscribeSuperAdminSession(() => setSession(readSuperAdminSession())), []);
  return session;
}
