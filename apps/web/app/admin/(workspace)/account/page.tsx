"use client";

import { useSearchParams } from "next/navigation";
import { AiUsageView } from "./_components/ai-usage/ai-usage-view";
import { AccountLoadError, AccountSkeleton } from "./_components/account-states";
import { AccountView } from "./_components/account-view";
import { ConnectorDetailView } from "./_components/connectors/connector-detail-view";
import { ConnectorsView } from "./_components/connectors/connectors-view";
import { NotionIntegrationView } from "./_components/notion/notion-integration-view";
import { GoogleCalendarIntegrationView } from "./_components/google-calendar/google-calendar-integration-view";
import { connectors, connectorViews } from "./_constants/connectors";
import { useAccountQuery } from "./_hooks/use-account-query";

export default function AccountPage() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view");
  const hasNotionOAuthCallback =
    Boolean(searchParams.get("code") && searchParams.get("state")) ||
    Boolean(searchParams.get("error"));

  if (activeView === "ia" || activeView === "ai") {
    return <AiUsageView />;
  }

  if (activeView === "notion" || hasNotionOAuthCallback) {
    return <NotionIntegrationView />;
  }

  if (activeView === "google-calendar") {
    return <GoogleCalendarIntegrationView />;
  }

  if (activeView === "connectors") {
    return <ConnectorsView />;
  }

  if (activeView && connectorViews.has(activeView)) {
    const connector = connectors.find((item) => item.view === activeView);

    if (connector) {
      return <ConnectorDetailView connector={connector} />;
    }
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
