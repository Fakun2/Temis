"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export type DashboardShellProps = {
  authorized: boolean;
  banner?: ReactNode;
  children: ReactNode;
  commandPalette?: ReactNode;
  header: ReactNode;
  mobileOpen: boolean;
  mobileSidebar: ReactNode;
  onMobileOpenChange: (open: boolean) => void;
  onScroll: (scrolled: boolean) => void;
  onSidebarOpenChange: (open: boolean) => void;
  restricted: ReactNode;
  sidebar: ReactNode;
  sidebarOpen: boolean;
  collapseSidebarFully?: boolean;
};

export function DashboardShell(props: DashboardShellProps) {
  return (
    <SidebarProvider open={props.sidebarOpen} onOpenChange={props.onSidebarOpenChange}
      collapsedWidth={props.collapseSidebarFully ? "0px" : undefined}
      className="min-h-[100svh] bg-[var(--admin-sidebar-bg)] text-foreground">
      {props.sidebar}
      <Sheet open={props.mobileOpen} onOpenChange={props.onMobileOpenChange}>
        <SheetContent side="left" showCloseButton={false}
          className="w-[280px] max-w-[85vw] gap-0 border-border bg-card p-0">
          <SheetTitle className="sr-only">Navegacion</SheetTitle>
          <SheetDescription className="sr-only">Menu principal del panel.</SheetDescription>
          {props.mobileSidebar}
        </SheetContent>
      </Sheet>
      <SidebarInset className="h-[100svh] overflow-hidden p-2 pt-2 md:p-3 md:pt-3">
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[var(--admin-card-radius)] bg-[var(--admin-page-bg)] shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_1px_4px_rgba(15,23,42,0.08)]">
          {props.banner}
          {props.header}
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-2 scrollbar-none md:px-4 md:py-3 xl:px-5 2xl:px-6"
            onScroll={(event) => props.onScroll(event.currentTarget.scrollTop > 4)}>
            {props.authorized ? props.children : props.restricted}
          </div>
        </div>
      </SidebarInset>
      {props.commandPalette}
    </SidebarProvider>
  );
}
