import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { adminSurfacePrimaryClassName } from "../_constants/dashboard";

export function AdminTableHeader({
  actions,
  className = "",
  description,
  descriptionClassName,
  icon: Icon,
  title
}: {
  actions?: ReactNode;
  className?: string;
  description?: string;
  descriptionClassName?: string;
  icon?: LucideIcon;
  title: string;
}) {
  const hasDescription = Boolean(description);

  return (
    <CardHeader
      data-admin-table-header
      className={`flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border/30 px-3 py-3 md:px-4 md:py-3.5 xl:px-5 xl:py-4 ${className}`}
    >
      <div className={cn("flex min-w-0 gap-3", hasDescription ? "items-start" : "items-center")}>
        {Icon ? (
          <Icon
            className={cn("h-5 w-5 shrink-0 text-muted-foreground", hasDescription && "mt-0.5")}
            aria-hidden="true"
          />
        ) : null}
        <div className="min-w-0">
          <CardTitle className={`truncate text-lg font-semibold ${adminSurfacePrimaryClassName}`}>
            {title}
          </CardTitle>
          {description ? (
            <p
              className={cn(
                "mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm",
                descriptionClassName
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2 sm:gap-3">{actions}</div> : null}
    </CardHeader>
  );
}
