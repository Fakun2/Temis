"use client";

import type { ReactNode } from "react";
import { Moon, PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { hasSuperAdminPermission } from "@/lib/auth/superadmin-permissions";
import type { SuperAdminSession } from "@/lib/auth/superadmin-session";
import { useTheme } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils";
import {
  isSuperAdminRouteActive,
  superAdminNavigation,
  type SuperAdminNavItem
} from "../_constants/navigation";

type SuperAdminSidebarProps = {
  onClose?: () => void;
  session: SuperAdminSession;
  variant?: "desktop" | "mobile";
};

const iconStrokeWidth = 1.75;

export function SuperAdminSidebar({
  onClose,
  session,
  variant = "desktop"
}: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const sidebar = useSidebar();
  const compact = variant === "desktop" && sidebar.state === "collapsed";
  const navigation = superAdminNavigation.filter((item) =>
    hasSuperAdminPermission(session, item.permission)
  );

  return (
    <Sidebar
      className={cn(
        "h-full flex-col border-r-0 bg-[var(--admin-sidebar-bg)] text-foreground shadow-none",
        variant === "mobile" && "static flex w-full"
      )}
    >
      <SidebarHeader className={cn(compact ? "px-3 py-4" : "px-5 pb-5 pt-5")}>
        <SuperAdminBrand
          compact={compact}
          onClose={onClose}
          showCloseButton={variant === "mobile"}
        />
      </SidebarHeader>

      <SidebarContent
        className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          compact ? "px-2 py-2" : "px-4 py-1"
        )}
        aria-label="Navegacion de plataforma"
      >
        <TooltipProvider delayDuration={400}>
          <SidebarMenu className={cn(compact ? "gap-1" : "gap-0.5")}>
            {navigation.map((item) => (
              <SuperAdminNavItem
                key={item.href}
                active={isSuperAdminRouteActive(pathname, item.href)}
                collapsed={compact}
                item={item}
                onNavigate={onClose}
              />
            ))}
          </SidebarMenu>
        </TooltipProvider>
      </SidebarContent>

      {!compact ? <SuperAdminSidebarFooter /> : null}
    </Sidebar>
  );
}

function SuperAdminBrand({
  compact,
  onClose,
  showCloseButton
}: {
  compact: boolean;
  onClose?: () => void;
  showCloseButton: boolean;
}) {
  return (
    <div className={cn("flex items-center", compact ? "justify-center" : "justify-between")}>
      <Link
        href="/superadmin"
        onClick={onClose}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact && "justify-center"
        )}
        aria-label="Temis Super Admin"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-btn-primary text-[11px] font-medium text-btn-primary-foreground">
          T
        </span>
        {!compact ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium tracking-[-0.01em] text-foreground">
              Temis
            </span>
            <span className="block truncate text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Plataforma
            </span>
          </span>
        ) : null}
      </Link>
      {showCloseButton && !compact ? (
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onClose}
          aria-label="Cerrar navegacion"
        >
          <PanelLeft className="size-3.5" strokeWidth={iconStrokeWidth} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function SuperAdminNavItem({
  active,
  collapsed,
  item,
  onNavigate
}: {
  active: boolean;
  collapsed: boolean;
  item: SuperAdminNavItem;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <SidebarMenuButton
      asChild
      isActive={active}
      className={cn(
        collapsed ? "min-h-11 justify-center px-2" : "min-h-9 px-3 text-sm",
        "data-[active=false]:text-[var(--admin-sidebar-item-foreground)] data-[active=false]:hover:text-foreground"
      )}
    >
      <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}>
        <Icon
          className={cn(
            "admin-sidebar-nav-icon shrink-0 text-[var(--admin-sidebar-icon-foreground)]",
            collapsed ? "size-4" : "size-3.5",
            active && "text-[var(--admin-sidebar-active-foreground)] opacity-100"
          )}
          strokeWidth={iconStrokeWidth}
          aria-hidden="true"
        />
        {!collapsed ? <span className="ml-2 truncate">{item.label}</span> : null}
      </Link>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem>
      <SidebarTooltip label={item.label}>{link}</SidebarTooltip>
    </SidebarMenuItem>
  );
}

function SidebarTooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full">{children}</div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" className="rounded-xl px-2.5 py-2">
        <span className="text-xs font-medium">{label}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function SuperAdminSidebarFooter() {
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
          <Moon className="size-3.5" strokeWidth={iconStrokeWidth} />
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
