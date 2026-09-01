import { formatCompactTokens } from "../utils";
import type { AccountAiUsageResponse } from "../types";

export function AiUsageMetrics({ usage }: { usage: AccountAiUsageResponse }) {
  const stats: Array<[string, string]> = [
    ["Tokens del mes", formatCompactTokens(usage.tokenUsage.usedTokens)],
    ["Maximo diario", formatCompactTokens(usage.metrics.maxDailyTokens)],
    ["Racha actual", `${usage.metrics.currentStreak} dias`],
    ["Racha mas larga", `${usage.metrics.longestStreak} dias`],
    ["Consumo total", formatCompactTokens(usage.metrics.totalTokens)]
  ];

  return (
    <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border/50 bg-background sm:grid-cols-2 lg:grid-cols-5">
      {stats.map(([label, value]) => (
        <div
          key={label}
          className="grid min-h-20 place-items-center gap-1 border-border/50 px-3 py-4 text-center sm:border-r sm:last:border-r-0"
        >
          <p className="text-lg font-semibold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      ))}
    </section>
  );
}
