"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Folder } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { adminNavSections } from "../../_constants/navigation";
import type { AdminNavSection, AdminSidebarVariant } from "../../_types/admin";
import { getAuthorizedNavSections } from "../../_utils/authorization";
import { isAdminRouteActive } from "../../_utils/navigation";
import type { BogaapSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { libraryKeys, listLibraryFolders } from "../../library/_api/library.api";
import { connectorViews } from "../../account/_constants/connectors";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import { SidebarFooterActions } from "./sidebar-footer-actions";
import { SidebarNavSection } from "./sidebar-nav-section";
import { SidebarWorkspaceSwitcher } from "./sidebar-workspace-switcher";
import { AnimatedAccountBackIcon } from "./animated-library-icon";
import { accountSidebarItems } from "./_constants/account-sidebar-items";
import { sidebarIconStrokeWidth } from "./sidebar-icon-constants";

type AdminSidebarProps = {
  onClose?: () => void;
  session: BogaapSession | null;
  variant?: AdminSidebarVariant;
};

export function AdminSidebar({ onClose, session, variant = "desktop" }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidebar = useSidebar();
  const compact = variant === "desktop" && sidebar.state === "collapsed";
  const currentPath = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;
  const accountMode = pathname.startsWith("/admin/account");
  const libraryFoldersQuery = useDashboardQuery({
    permission: "documents:read",
    queryFn: () => listLibraryFolders(),
    queryKey: libraryKeys.folders(),
    staleTime: 30_000
  });
  const navSections = useMemo(
    () =>
      getAuthorizedNavSections(
        session,
        withLibraryFolderShortcuts(adminNavSections, libraryFoldersQuery.data ?? [])
      ),
    [libraryFoldersQuery.data, session]
  );

  return (
    <Sidebar
      className={cn(
        "h-full flex-col border-r-0 bg-[var(--admin-sidebar-bg)] text-foreground shadow-none",
        variant === "mobile" && "static flex w-full"
      )}
    >
      <SidebarHeader className={cn(compact ? "px-3 py-4" : "px-5 pb-5 pt-5")}>
        <SidebarWorkspaceSwitcher
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
        aria-label={accountMode ? "Navegacion de cuenta" : "Navegacion principal"}
      >
        {accountMode ? (
          <AccountSidebarNav collapsed={compact} onClose={onClose} />
        ) : (
          navSections.map((section) => (
            <SidebarNavSection
              key={section.title}
              collapsed={compact}
              items={section.items}
              pathname={currentPath}
              title={section.title}
              isActive={isAdminRouteActive}
            />
          ))
        )}
      </SidebarContent>

      {!compact ? <SidebarFooterActions /> : null}
    </Sidebar>
  );
}

function AccountSidebarNav({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const searchParams = useSearchParams();
  const [activeHash, setActiveHash] = useState("#profile");
  const accountView = searchParams.get("view");
  const hasNotionOAuthCallback =
    Boolean(searchParams.get("code") && searchParams.get("state")) ||
    Boolean(searchParams.get("error"));
  const backIconClassName = cn(
    "admin-sidebar-nav-icon shrink-0 text-[var(--admin-sidebar-icon-foreground)]",
    collapsed ? "size-4" : "size-[18px]"
  );

  useEffect(() => {
    function updateActiveHash() {
      setActiveHash(window.location.hash || "#profile");
    }

    updateActiveHash();
    window.addEventListener("hashchange", updateActiveHash);
    return () => window.removeEventListener("hashchange", updateActiveHash);
  }, []);

  return (
    <TooltipProvider delayDuration={400}>
      <SidebarMenu className={cn(collapsed ? "gap-1" : "gap-0.5")}>
        <SidebarMenuItem>
          <AccountSidebarTooltip label="Volver">
            <SidebarMenuButton
              asChild
              isActive={false}
              className={cn(
                collapsed ? "min-h-11 justify-center px-2" : "mb-2 min-h-10 px-3 text-sm",
                "justinia-account-back-trigger"
              )}
            >
              <Link href="/admin" onClick={onClose}>
                <AnimatedAccountBackIcon
                  className={backIconClassName}
                  strokeWidth={sidebarIconStrokeWidth}
                  aria-hidden="true"
                />
                {!collapsed ? <span className="ml-2 truncate">Volver</span> : null}
              </Link>
            </SidebarMenuButton>
          </AccountSidebarTooltip>
        </SidebarMenuItem>
        {accountSidebarItems.map((item) => {
          const itemView = getAccountSidebarItemView(item.href);
          const active = itemView
            ? isAccountSidebarViewActive(itemView, accountView, hasNotionOAuthCallback)
            : !accountView && item.href.endsWith(activeHash);

          return (
            <SidebarMenuItem key={item.href}>
              <AccountSidebarTooltip label={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={cn(
                    collapsed ? "min-h-11 justify-center px-2" : "min-h-9 px-3 text-sm",
                    item.iconAnimation && `justinia-${item.iconAnimation}-trigger`
                  )}
                >
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (item.href.includes("#")) {
                        setActiveHash(item.href.slice(item.href.indexOf("#")));
                      }
                      onClose?.();
                    }}
                  >
                    <item.icon
                      className={cn(
                        "shrink-0",
                        "admin-sidebar-nav-icon",
                        item.iconAnimation === "account-connectors"
                          ? collapsed
                            ? "size-[18px]"
                            : "size-5"
                          : collapsed
                            ? "size-4"
                            : "size-[18px]",
                        active
                          ? "text-[var(--admin-sidebar-active-foreground)]"
                          : "text-[var(--admin-sidebar-icon-foreground)]"
                      )}
                      strokeWidth={sidebarIconStrokeWidth}
                      aria-hidden="true"
                    />
                    {!collapsed ? <span className="ml-2 truncate">{item.label}</span> : null}
                  </Link>
                </SidebarMenuButton>
              </AccountSidebarTooltip>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </TooltipProvider>
  );
}

function getAccountSidebarItemView(href?: string) {
  if (!href?.includes("?")) {
    return null;
  }

  return new URLSearchParams(href.slice(href.indexOf("?") + 1)).get("view");
}

function isAccountSidebarViewActive(
  itemView: string,
  accountView: string | null,
  hasNotionOAuthCallback: boolean
) {
  if (itemView === "ia") {
    return accountView === "ia" || accountView === "ai";
  }

  if (itemView === "connectors") {
    return (
      hasNotionOAuthCallback ||
      accountView === "connectors" ||
      Boolean(accountView && connectorViews.has(accountView))
    );
  }

  return accountView === itemView;
}

function AccountSidebarTooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full">{children}</div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" className="min-w-36 rounded-xl px-2.5 py-2">
        <div className="flex items-center justify-between gap-4">
          <span className="truncate text-xs font-medium">{label}</span>
          <kbd className="shrink-0 rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold tracking-normal text-white/78">
            Sin atajo
          </kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function withLibraryFolderShortcuts(
  sections: AdminNavSection[],
  folders: Array<{ id: string; name: string }>
) {
  if (!folders.length) {
    return sections;
  }

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.href !== "/admin/library") {
        return item;
      }

      return {
        ...item,
        children: folders.map((folder) => ({
          href: `/admin/library?folderId=${folder.id}`,
          icon: Folder,
          label: folder.name,
          requiredPermissions: ["documents:read"]
        }))
      };
    })
  }));
}
