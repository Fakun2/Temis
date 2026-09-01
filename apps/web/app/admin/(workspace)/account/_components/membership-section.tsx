"use client";

import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { AccountResponse } from "../_types/account.types";
import { formatNumber } from "../_utils/account-format";
import { AccountCard, InfoGrid } from "./account-form-ui";

export function MembershipSection({ account }: { account: AccountResponse }) {
  const usagePercent = useMemo(() => {
    if (account.membership.monthlyTokenLimit <= 0) {
      return 0;
    }

    return Math.min(
      Math.round((account.tokenUsage.usedTokens / account.membership.monthlyTokenLimit) * 100),
      100
    );
  }, [account.membership.monthlyTokenLimit, account.tokenUsage.usedTokens]);

  return (
    <AccountCard
      id="membership"
      title="Membresia y tokens"
      icon={CreditCard}
      actionLabel="Actualizar plan"
      editing={false}
      saving={false}
      editDisabled
      editDisabledTooltip="Proximamente"
      onCancel={() => undefined}
      onEdit={() => undefined}
    >
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <InfoGrid
            items={[
              ["Plan", account.membership.accountPlan],
              ["Estado", account.membership.accountPlanStatus],
              ["Rol", account.membership.roleName ?? "Sin rol"],
              ["Limite mensual", formatNumber(account.membership.monthlyTokenLimit)]
            ]}
          />

          <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">Tokens usados</span>
              <span className="text-sm text-muted-foreground">{usagePercent}%</span>
            </div>
            <Progress className="mt-3" value={usagePercent} />
            <p className="mt-3 text-xs text-muted-foreground">
              {formatNumber(account.tokenUsage.usedTokens)} usados ·{" "}
              {formatNumber(account.tokenUsage.remainingTokens)} disponibles
            </p>
          </div>
        </div>
      </div>
    </AccountCard>
  );
}
