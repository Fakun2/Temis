"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AdminNavItem } from "../../_types/admin";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sidebarIconStrokeWidth } from "./sidebar-icon-constants";

type SidebarNavItemProps = {
  active: boolean;
  collapsed: boolean;
  isActive: (pathname: string, href: string) => boolean;
  item: AdminNavItem;
  pathname: string;
};

export function SidebarNavItem({
  active,
  collapsed,
  isActive,
  item,
  pathname
}: SidebarNavItemProps) {
  const Icon = item.icon;
  const isSoon = item.status === "soon";
  const href = item.href;
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(active);
  const childItems = useMemo(
    () =>
      children.map((child) => ({
        active: isNavItemActive(child, pathname, isActive),
        item: child
      })),
    [children, isActive, pathname]
  );
  const childActive = childItems.some((child) => child.active);
  const itemActive = href ? isActive(pathname, href) && !childActive : active && !childActive;

  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  const buttonClassName = cn(
    collapsed ? "min-h-11 justify-center px-2" : "min-h-9 px-3 text-sm",
    "data-[active=false]:text-[var(--admin-sidebar-item-foreground)] data-[active=false]:hover:text-foreground",
    item.iconAnimation && `justinia-${item.iconAnimation}-trigger`,
    isSoon &&
      "cursor-not-allowed text-muted-foreground/55 hover:bg-transparent hover:text-muted-foreground/55"
  );
  const iconClassName = cn(
    "admin-sidebar-nav-icon shrink-0 text-[var(--admin-sidebar-icon-foreground)]",
    collapsed ? "size-4" : "size-3.5",
    item.iconAnimation && (collapsed ? "size-4" : "size-[18px]"),
    itemActive && "text-[var(--admin-sidebar-active-foreground)] opacity-100",
    isSoon && "text-muted-foreground/45"
  );

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        <div className="relative">
          <SidebarItemTooltip item={item}>
            {href && !isSoon ? (
              <SidebarMenuButton
                asChild
                isActive={itemActive}
                className={cn(buttonClassName, !collapsed && "pr-8")}
              >
                <Link href={href} aria-current={itemActive ? "page" : undefined}>
                  <Icon
                    className={iconClassName}
                    strokeWidth={sidebarIconStrokeWidth}
                    aria-hidden="true"
                  />
                  {!collapsed ? (
                    <span className="ml-2 min-w-0 flex-1 truncate">{item.label}</span>
                  ) : null}
                </Link>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                isActive={false}
                className={cn(buttonClassName, !collapsed && "pr-8")}
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
              >
                <Icon
                  className={iconClassName}
                  strokeWidth={sidebarIconStrokeWidth}
                  aria-hidden="true"
                />
                {!collapsed ? (
                  <span className="ml-2 min-w-0 flex-1 truncate">{item.label}</span>
                ) : null}
              </SidebarMenuButton>
            )}
          </SidebarItemTooltip>

          {!collapsed ? (
            <button
              type="button"
              className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--admin-sidebar-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              aria-label={open ? `Contraer ${item.label}` : `Expandir ${item.label}`}
            >
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 transition-transform duration-150",
                  open && "rotate-180"
                )}
                strokeWidth={sidebarIconStrokeWidth}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>

        {!collapsed ? (
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
            aria-hidden={!open}
          >
            <div className="overflow-hidden">
              <ul className="ml-[21px] grid border-l border-border/45 py-1 pl-4">
                {childItems.map((child) => (
                  <SidebarChildNavItem
                    key={child.item.href ?? child.item.label}
                    active={child.active}
                    item={child.item}
                  />
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      {isSoon ? (
        <SidebarItemTooltip item={item}>
          <SidebarMenuButton disabled isActive={false} className={buttonClassName}>
            <Icon
              className={iconClassName}
              strokeWidth={sidebarIconStrokeWidth}
              aria-hidden="true"
            />
            {!collapsed ? (
              <>
                <span className="ml-2 truncate">{item.label}</span>
                <Badge
                  variant="secondary"
                  className="ml-auto rounded-md bg-muted px-1.5 py-0 text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Soon
                </Badge>
              </>
            ) : null}
          </SidebarMenuButton>
        </SidebarItemTooltip>
      ) : (
        <SidebarItemTooltip item={item}>
          <SidebarMenuButton asChild isActive={itemActive} className={buttonClassName}>
            <Link href={href ?? "#"} aria-current={itemActive ? "page" : undefined}>
              <Icon
                className={iconClassName}
                strokeWidth={sidebarIconStrokeWidth}
                aria-hidden="true"
              />
              {!collapsed ? <span className="ml-2 truncate">{item.label}</span> : null}
            </Link>
          </SidebarMenuButton>
        </SidebarItemTooltip>
      )}
    </SidebarMenuItem>
  );
}

function SidebarChildNavItem({ active, item }: { active: boolean; item: AdminNavItem }) {
  const isSoon = item.status === "soon";
  const className = cn(
    "relative -ml-px flex min-h-8 items-center rounded-md px-2 text-xs font-normal text-[var(--admin-sidebar-item-foreground)] transition-colors hover:bg-[var(--admin-sidebar-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active &&
      "bg-[var(--admin-sidebar-active)] text-[var(--admin-sidebar-active-foreground)] shadow-sm hover:bg-[var(--admin-sidebar-active)] hover:text-[var(--admin-sidebar-active-foreground)]",
    isSoon && "cursor-not-allowed text-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground/50"
  );

  return (
    <li className="list-none">
      {item.href && !isSoon ? (
        <SidebarItemTooltip item={item}>
          <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
            <span className="min-w-0 truncate">{item.label}</span>
          </Link>
        </SidebarItemTooltip>
      ) : (
        <SidebarItemTooltip item={item}>
          <span className={className}>
            <span className="min-w-0 truncate">{item.label}</span>
            <Badge
              variant="secondary"
              className="ml-auto rounded-md bg-muted px-1.5 py-0 text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground"
            >
              Soon
            </Badge>
          </span>
        </SidebarItemTooltip>
      )}
    </li>
  );
}

function SidebarItemTooltip({ children, item }: { children: ReactNode; item: AdminNavItem }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full">{children}</div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" className="min-w-40 rounded-xl px-2.5 py-2">
        <div className="flex items-center justify-between gap-4">
          <span className="truncate text-xs font-medium">{item.label}</span>
          <span className="flex shrink-0 items-center" aria-label={item.shortcut?.label}>
            {formatShortcutKeys(item.shortcut).map((key, index, keys) => (
              <span className="flex items-center" key={`${key}-${index}`}>
                <kbd className="min-w-5 rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 text-center font-sans text-[10px] font-semibold tracking-normal text-white/78">
                  {key}
                </kbd>
                {index < keys.length - 1 ? (
                  <span className="px-1 text-[10px] font-semibold text-white/55">+</span>
                ) : null}
              </span>
            ))}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function formatShortcutKeys(shortcut: AdminNavItem["shortcut"]) {
  return shortcut?.keys?.length ? shortcut.keys.map((key) => key.toUpperCase()) : ["-"];
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
