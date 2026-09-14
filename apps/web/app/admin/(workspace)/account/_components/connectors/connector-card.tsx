"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils";
import type { ConnectorDefinition, ConnectorStatus } from "../../_types/connectors.types";
import { ConnectorLogo } from "./connector-logo";

export function ConnectorCard({
  connector,
  status
}: {
  connector: ConnectorDefinition;
  status: ConnectorStatus;
}) {
  const disabled = !connector.implemented;
  const { colorMode, variant } = useTheme();
  const transparentInDark = colorMode === "navy-slate" && variant === "dark";
  const card = (
    <Card
      className={cn(
        "relative flex min-h-[94px] justify-center rounded-xl border-border/55 bg-card px-4 py-4 pr-24 shadow-[0_1px_7px_rgba(15,23,42,0.04)] transition-colors",
        transparentInDark && "!bg-transparent",
        disabled
          ? "cursor-not-allowed select-none"
          : "cursor-pointer hover:border-border hover:shadow-[0_2px_10px_rgba(15,23,42,0.06)]"
      )}
      aria-disabled={disabled}
    >
      <div className="absolute right-3 top-3">
        <ConnectorStatusBadge status={status} />
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <ConnectorLogo
          connectorId={connector.id}
          className={cn("size-11 shrink-0", disabled && "grayscale opacity-50")}
        />
        <div className="flex min-w-0 items-center gap-1">
          <h3
            className={cn(
              "truncate text-sm font-semibold",
              disabled ? "text-muted-foreground" : "text-foreground/85"
            )}
          >
            {connector.name}
          </h3>
        </div>
      </div>
    </Card>
  );

  if (disabled) {
    return (
      <div className="min-w-0 cursor-not-allowed" aria-label={`${connector.name} proximamente`}>
        {card}
      </div>
    );
  }

  return (
    <Link href={`/admin/account?view=${connector.view}`} className="min-w-0">
      {card}
    </Link>
  );
}

export function ConnectorStatusBadge({ status }: { status: ConnectorStatus }) {
  if (status === "connected") {
    return (
      <Badge className="h-5 px-1.5 text-[10px] font-medium bg-emerald-500/12 text-emerald-600 hover:bg-emerald-500/12">
        Conectado
      </Badge>
    );
  }

  if (status === "available") {
    return (
      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
        Disponible
      </Badge>
    );
  }

  return (
    <Badge className="h-5 bg-muted px-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted">
      Proximamente
    </Badge>
  );
}
