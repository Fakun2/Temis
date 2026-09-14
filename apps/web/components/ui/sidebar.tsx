"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  state: "expanded" | "collapsed";
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  children,
  className,
  open,
  onOpenChange,
  collapsedWidth = "64px",
  style,
  ...props
}: React.ComponentProps<"div"> & {
  collapsedWidth?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [_open, _setOpen] = React.useState(false);
  const controlled = typeof open === "boolean";
  const currentOpen = controlled ? open : _open;
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!controlled) {
        _setOpen(value);
      }

      onOpenChange?.(value);
    },
    [controlled, onOpenChange]
  );

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      open: currentOpen,
      setOpen,
      state: currentOpen ? "expanded" : "collapsed"
    }),
    [currentOpen, setOpen]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        data-state={value.state}
        className={cn("group/sidebar-wrapper min-h-[100svh]", className)}
        style={
          {
            "--sidebar-width": currentOpen ? "256px" : collapsedWidth,
            ...style
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "min-h-[100svh] w-full pt-[52px] transition-[margin-left,width] duration-300 ease-in-out lg:ml-[var(--sidebar-width)] lg:w-[calc(100%_-_var(--sidebar-width))]",
        className
      )}
      {...props}
    />
  );
}

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="sidebar"
      data-state={useSidebar().state}
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] overflow-hidden flex-col text-sidebar-foreground transition-[width] duration-300 ease-in-out lg:flex",
        className
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("shrink-0", className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="sidebar-content"
      className={cn("flex-1 overflow-y-auto", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("shrink-0", className)} {...props} />;
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("grid", className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "px-2 pb-2 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("grid gap-0.5", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("list-none", className)} {...props} />;
}

function SidebarMenuButton({
  asChild = false,
  className,
  isActive,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
}) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      data-active={isActive}
      data-slot="sidebar-menu-button"
      className={cn(
        "group/sidebar-menu-button relative flex w-full min-h-11 items-center rounded-md text-sm transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "data-[active=true]:bg-[var(--admin-sidebar-active)] data-[active=true]:font-medium data-[active=true]:text-[var(--admin-sidebar-active-foreground)] data-[active=true]:shadow-sm",
        "data-[active=false]:font-normal data-[active=false]:text-[var(--admin-sidebar-item-foreground)] data-[active=false]:hover:bg-[var(--admin-sidebar-hover)] data-[active=false]:hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar
};
