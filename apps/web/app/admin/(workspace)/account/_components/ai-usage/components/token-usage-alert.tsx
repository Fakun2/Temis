import type { CSSProperties } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "../../../_utils/account-format";

export function TokenUsageAlert({
  monthlyLimit,
  onClose,
  remainingTokens,
  usedTokens
}: {
  monthlyLimit: number;
  onClose: () => void;
  remainingTokens: number;
  usedTokens: number;
}) {
  const usagePercent = monthlyLimit > 0 ? Math.min((usedTokens / monthlyLimit) * 100, 100) : 0;

  return (
    <aside
      role="alertdialog"
      aria-labelledby="token-usage-alert-title"
      aria-describedby="token-usage-alert-description"
      className="fixed bottom-4 right-4 z-50 grid w-[calc(100vw-2rem)] max-w-sm gap-3 rounded-2xl border border-border/70 bg-popover p-4 text-popover-foreground shadow-[0_24px_70px_-32px_rgba(15,23,42,0.65)] backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id="token-usage-alert-title" className="text-sm font-semibold text-foreground">
            Tokens restantes
          </p>
          <p id="token-usage-alert-description" className="mt-1 text-xs text-muted-foreground">
            {formatNumber(remainingTokens)} disponibles de {formatNumber(monthlyLimit)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="size-8 rounded-xl border-transparent bg-transparent p-0 shadow-none"
          onClick={onClose}
          aria-label="Cerrar consumo de tokens"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{formatNumber(usedTokens)} usados</span>
          <span className="font-medium text-foreground">{Math.round(usagePercent)}%</span>
        </div>
        <Progress
          value={usagePercent}
          className="h-2.5 bg-background"
          style={{ "--progress-fill": "#2f6bdb" } as CSSProperties}
        />
      </div>

      <Button type="button" variant="outline" disabled className="justify-center">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Añadir tokens
      </Button>
    </aside>
  );
}
