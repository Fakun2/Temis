"use client";

import { useMemo, useRef, useState } from "react";
import { connectors } from "../_constants/connectors";
import { useNotionStatusQuery } from "./use-notion-integration";
import { useGoogleCalendarStatusQuery } from "./use-google-calendar";
import type { ConnectorDefinition, ConnectorStatus } from "../_types/connectors.types";

export type ConnectorsTab = "discover" | "installed" | "manage";

export function useConnectorsView() {
  const [activeTab, setActiveTab] = useState<ConnectorsTab>("discover");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notionStatus = useNotionStatusQuery();
  const googleCalendarStatus = useGoogleCalendarStatusQuery();
  const notionConnected = Boolean(notionStatus.data?.connection.connected);
  const googleCalendarConnected = Boolean(googleCalendarStatus.data?.connected);
  const visibleConnectors = useMemo(
    () => filterConnectors(connectors, activeTab, search, notionConnected, googleCalendarConnected),
    [activeTab, googleCalendarConnected, notionConnected, search]
  );

  return {
    activeTab,
    notionConnected,
    googleCalendarConnected,
    search,
    searchInputRef,
    searchOpen,
    setActiveTab,
    setSearch,
    setSearchOpen,
    visibleConnectors
  };
}

export function getConnectorStatus(
  connector: ConnectorDefinition,
  notionConnected: boolean,
  googleCalendarConnected = false
): ConnectorStatus {
  const connected = connector.id === "notion" ? notionConnected : connector.id === "google-calendar" ? googleCalendarConnected : false;
  return connector.implemented && connected ? "connected" : connector.implemented ? "available" : "coming_soon";
}

function filterConnectors(
  items: ConnectorDefinition[],
  activeTab: ConnectorsTab,
  search: string,
  notionConnected: boolean,
  googleCalendarConnected: boolean
) {
  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((connector) => {
    if (activeTab === "installed" && !((connector.id === "notion" && notionConnected) || (connector.id === "google-calendar" && googleCalendarConnected))) {
      return false;
    }

    if (activeTab === "manage" && !["notion", "google-calendar"].includes(connector.id)) {
      return false;
    }

    return !normalizedSearch || getConnectorKeywords(connector).some((keyword) => keyword.includes(normalizedSearch));
  });
}

function getConnectorKeywords(connector: ConnectorDefinition) {
  return [connector.id, connector.name, connector.description, connector.category, connector.view].map((value) =>
    value.toLowerCase()
  );
}
