"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminHeaderProps } from "../../_types/admin";
import { AdminUserMenu } from "../user/admin-user-menu";
import { AdminHeaderBreadcrumbs } from "./admin-header-breadcrumbs";
import { HeaderActionButton } from "./header-action-button";
import { HeaderSearchButton } from "./header-search-button";
import { NotificationsBell } from "./notifications-bell";

export function AdminHeader({
  onOpenCommand,
  onOpenMobileSidebar,
  onToggleSidebar,
  scrolled,
  session,
  sidebarOpen
}: AdminHeaderProps) {
  const SidebarToggleIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header
      className={cn(
        "flex h-[54px] shrink-0 items-center justify-between border-b border-transparent px-4 transition-colors md:px-7",
        scrolled && "border-border/45"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <HeaderActionButton
          label="Abrir navegacion"
          onClick={onOpenMobileSidebar}
          className="shrink-0 lg:hidden"
        >
          <Menu className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </HeaderActionButton>
        <HeaderActionButton
          label={sidebarOpen ? "Contraer sidebar" : "Desplegar sidebar"}
          onClick={onToggleSidebar}
          className="hidden bg-none shrink-0 lg:inline-flex"
        >
          <SidebarToggleIcon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        </HeaderActionButton>
        <AdminHeaderBreadcrumbs />
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <HeaderSearchButton onOpenCommand={onOpenCommand} />

        <NotificationsBell />

        <div className="flex items-center shrink-0">
          <AdminUserMenu collapsed session={session} triggerVariant="pill" />
        </div>
      </div>
    </header>
  );
}
