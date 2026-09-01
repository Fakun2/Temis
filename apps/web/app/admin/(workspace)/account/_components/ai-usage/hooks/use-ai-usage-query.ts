"use client";

import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import { accountKeys, getAccountAiUsage } from "../../../_api/account.api";

export function useAiUsageQuery() {
  return useDashboardQuery({
    queryFn: () => getAccountAiUsage(),
    queryKey: accountKeys.aiUsage()
  });
}
