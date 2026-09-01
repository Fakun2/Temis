"use client";

import { useState } from "react";
import { AccountLoadError, AccountSkeleton } from "../account-states";
import { AiUsageMetrics } from "./components/ai-usage-metrics";
import { AiUsageProfile } from "./components/ai-usage-profile";
import { TokenHeatmap } from "./components/token-heatmap";
import { TokenUsageAlert } from "./components/token-usage-alert";
import { useAiUsageQuery } from "./hooks/use-ai-usage-query";
import type { UsageViewMode } from "./types";

export function AiUsageView() {
  const usageQuery = useAiUsageQuery();
  const usage = usageQuery.data;
  const [viewMode, setViewMode] = useState<UsageViewMode>("daily");
  const [usageAlertOpen, setUsageAlertOpen] = useState(true);

  if (usageQuery.isLoading && !usage) {
    return <AccountSkeleton />;
  }

  if (usageQuery.error || !usage) {
    return <AccountLoadError message={usageQuery.error?.message} />;
  }

  return (
    <>
      <div className="mx-auto flex min-h-0 w-full max-w-[1098px] flex-1 flex-col gap-8 overflow-y-auto scrollbar-none px-2 pb-8 sm:px-6 lg:px-0">
        <div className="flex min-w-0 flex-col gap-1 px-1">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Uso de IA</h1>
          <p className="text-sm text-muted-foreground">
            Consumo de tokens, plan y actividad del workspace activo.
          </p>
        </div>

        <section id="ai-usage" className="grid scroll-mt-20 gap-14 px-8 md:px-12 xl:px-16">
          <AiUsageProfile usage={usage} />
          <AiUsageMetrics usage={usage} />
          <TokenHeatmap dailyUsage={usage.dailyUsage} mode={viewMode} onModeChange={setViewMode} />
        </section>
      </div>

      {usageAlertOpen ? (
        <TokenUsageAlert
          monthlyLimit={usage.membership.monthlyTokenLimit}
          onClose={() => setUsageAlertOpen(false)}
          remainingTokens={usage.tokenUsage.remainingTokens}
          usedTokens={usage.tokenUsage.usedTokens}
        />
      ) : null}
    </>
  );
}
