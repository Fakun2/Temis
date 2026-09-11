"use client";

import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { sidebarIconStrokeWidth } from "./sidebar-icon-constants";

type SidebarWorkspaceSwitcherProps = {
  compact: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
};

export function SidebarWorkspaceSwitcher({
  compact,
  onClose,
  showCloseButton = false
}: SidebarWorkspaceSwitcherProps) {
  return (
    <>
      <div className={cn("flex items-center", compact ? "justify-center" : "justify-between")}>
        <Link
          href="/admin"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact && "justify-center"
          )}
          aria-label="TEMIS admin"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-btn-primary text-[11px] font-medium text-btn-primary-foreground">
            J
          </span>
          {!compact ? (
            <span className="truncate text-sm font-medium tracking-[-0.01em] text-foreground">
              Temis
            </span>
          ) : null}
        </Link>
        {showCloseButton && !compact ? (
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground  transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClose}
            aria-label="Cerrar navegacion"
          >
            <PanelLeft
              className="h-3.5 w-3.5"
              strokeWidth={sidebarIconStrokeWidth}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    </>
  );
}
