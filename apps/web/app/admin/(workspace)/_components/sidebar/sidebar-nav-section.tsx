"use client";

import type { AdminNavItem } from "../../_types/admin";
import { cn } from "@/lib/utils";
import { SidebarGroup, SidebarMenu } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarNavItem } from "./sidebar-nav-item";

type SidebarNavSectionProps = {
  collapsed: boolean;
  isActive: (pathname: string, href: string) => boolean;
  items: AdminNavItem[];
  pathname: string;
  title?: string;
};

export function SidebarNavSection({
  collapsed,
  isActive,
  items,
  pathname
}: SidebarNavSectionProps) {
  return (
    <SidebarGroup className={cn(collapsed ? "mb-1" : "mb-2")}>
      <TooltipProvider delayDuration={400}>
        <SidebarMenu className={cn(collapsed ? "gap-1" : "gap-0.5")}>
          {items.map((item) => (
            <SidebarNavItem
              key={item.href ?? item.label}
              active={isNavItemActive(item, pathname, isActive)}
              collapsed={collapsed}
              item={item}
              pathname={pathname}
              isActive={isActive}
            />
          ))}
        </SidebarMenu>
      </TooltipProvider>
    </SidebarGroup>
  );
}

function isNavItemActive(
  item: AdminNavItem,
  pathname: string,
  isActive: (pathname: string, href: string) => boolean
): boolean {
  return Boolean(
    (item.href && isActive(pathname, item.href)) ||
      item.children?.some((child) => isNavItemActive(child, pathname, isActive))
  );
}
