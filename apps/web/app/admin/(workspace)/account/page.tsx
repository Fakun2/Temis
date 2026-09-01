"use client";

import { useSearchParams } from "next/navigation";
import { AiUsageView } from "./_components/ai-usage/ai-usage-view";
import { AccountLoadError, AccountSkeleton } from "./_components/account-states";
import { AccountView } from "./_components/account-view";
import { useAccountQuery } from "./_hooks/use-account-query";

export default function AccountPage() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view");

  if (activeView === "ia" || activeView === "ai") {
    return <AiUsageView />;
  }

  return <AccountDetailsView />;
}

function AccountDetailsView() {
  const accountQuery = useAccountQuery();
  const account = accountQuery.data;

  if (accountQuery.isLoading && !account) {
    return <AccountSkeleton />;
  }

  if (accountQuery.error || !account) {
    return <AccountLoadError message={accountQuery.error?.message} />;
  }

  return <AccountView account={account} />;
}
