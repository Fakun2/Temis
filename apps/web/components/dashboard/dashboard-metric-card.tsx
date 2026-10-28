import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  dashboardSurfaceClassName as adminSurfaceClassName,
  dashboardSurfacePrimaryClassName as adminSurfacePrimaryClassName
} from "./styles";

export function DashboardMetricCard({
  badge,
  detail,
  icon: Icon,
  label,
  loading = false,
  tooltipItems,
  value
}: {
  badge?: string;
  detail?: string;
  icon: LucideIcon;
  label: string;
  loading?: boolean;
  tooltipItems?: Array<{
    label: string;
    value: number | string;
  }>;
  value?: number | string;
}) {
  const content = (
    <>
      <span
        data-admin-metric-icon
        className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-btn-primary/10 text-btn-primary shadow-[0_10px_28px_-18px_currentColor] sm:size-8 sm:rounded-2xl"
      >
        <Icon className="h-4 w-4 sm:h-[16px] sm:w-[16px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[11px] font-medium leading-4 text-foreground/65 sm:text-xs">
            {label}
          </p>
          {badge ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase">
              {badge}
            </Badge>
          ) : null}
        </div>
        <p
          className={`mt-1 truncate text-xl font-semibold leading-none sm:text-2xl ${adminSurfacePrimaryClassName}`}
        >
          {value}
        </p>
        {detail ? (
          <p className="mt-1 truncate text-[10px] leading-4 text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </>
  );

  return (
    <Card
      aria-busy={loading}
      data-admin-surface
      className={`${adminSurfaceClassName} min-w-0 border-0 py-0 shadow-[var(--admin-card-shadow)]`}
    >
      <CardContent className="p-0">
        {tooltipItems?.length ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-[108px] w-full items-center gap-2 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[132px] sm:gap-4 sm:p-4"
                  aria-label={`${label}: ${value}. ${tooltipItems
                    .map((item) => `${item.label}: ${item.value}`)
                    .join(", ")}`}
                >
                  {content}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="min-w-36">
                <div className="grid gap-1.5">
                  {tooltipItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-6">
                      <span className="text-white/75">{item.label}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex min-h-[108px] items-center gap-2 p-3 sm:min-h-[132px] sm:gap-4 sm:p-4">
            {content}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
