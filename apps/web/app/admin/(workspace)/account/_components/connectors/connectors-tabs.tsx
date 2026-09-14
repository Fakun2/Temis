"use client";

import { cn } from "@/lib/utils";
import type { ConnectorsTab } from "../../_hooks/use-connectors-view";

const tabs: Array<{ id: ConnectorsTab; label: string }> = [
  { id: "discover", label: "Descubrir" },
  { id: "installed", label: "Instalados" },
  { id: "manage", label: "Gestionar" }
];

export function ConnectorsTabs({
  activeTab,
  onTabChange
}: {
  activeTab: ConnectorsTab;
  onTabChange: (tab: ConnectorsTab) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn(
            "rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground",
            activeTab === tab.id && "bg-secondary text-foreground"
          )}
          type="button"
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
