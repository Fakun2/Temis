"use client";

import { Moon } from "lucide-react";
import { SidebarFooter } from "@/components/ui/sidebar";
import { useTheme } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils";
import { sidebarIconStrokeWidth } from "./sidebar-icon-constants";

export function SidebarFooterActions() {
  const theme = useTheme();

  return (
    <SidebarFooter className="px-5 pb-5 pt-3">
      <button
        type="button"
        className="flex h-8 w-full items-center justify-between rounded-md px-2 text-[13px] font-normal text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={theme.toggleVariant}
        aria-label="Cambiar entre light y dark mode"
      >
        <span className="flex items-center gap-2">
          <Moon className="h-3.5 w-3.5" strokeWidth={sidebarIconStrokeWidth} />
          {theme.isDark ? "Light Mode" : "Dark Mode"}
        </span>
        <span
          className={cn(
            "flex h-4 w-8 items-center rounded-full bg-background p-0.5 transition-colors",
            theme.isDark && "bg-btn-primary"
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              "size-3 rounded-full bg-muted-foreground/40 transition-transform",
              theme.isDark && "translate-x-4 bg-btn-primary-foreground"
            )}
          />
        </span>
      </button>
    </SidebarFooter>
  );
}
