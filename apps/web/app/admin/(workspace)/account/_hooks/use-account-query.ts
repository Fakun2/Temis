"use client";

import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import { accountKeys, getAccount } from "../_api/account.api";

export function useAccountQuery() {
  return useDashboardQuery({
    queryKey: accountKeys.detail(),
    queryFn: () => getAccount()
  });
}
