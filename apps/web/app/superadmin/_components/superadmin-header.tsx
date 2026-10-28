"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import type { SuperAdminSession } from "@/lib/auth/superadmin-session";
import { cn } from "@/lib/utils";
import { getSuperAdminPageTitle } from "../_constants/navigation";
import { SuperAdminUserMenu } from "./superadmin-user-menu";

type SuperAdminHeaderProps = {
  onLogout: () => Promise<void>;
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
  scrolled: boolean;
  session: SuperAdminSession;
  sidebarOpen: boolean;
};

export function SuperAdminHeader({
  onLogout,
  onOpenMobileSidebar,
  onToggleSidebar,
  scrolled,
  session,
  sidebarOpen
}: SuperAdminHeaderProps) {
  const pathname = usePathname();
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
          <Menu className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </HeaderActionButton>
        <HeaderActionButton
          label={sidebarOpen ? "Contraer sidebar" : "Desplegar sidebar"}
          onClick={onToggleSidebar}
          className="hidden shrink-0 bg-none lg:inline-flex"
        >
          <SidebarToggleIcon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        </HeaderActionButton>
        <SuperAdminBreadcrumbs pathname={pathname} />
      </div>

      <div className="flex shrink-0 items-center">
        <SuperAdminUserMenu onLogout={onLogout} session={session} />
      </div>
    </header>
  );
}

function HeaderActionButton({
  children,
  className,
  label,
  onClick
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      data-admin-surface
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "size-7 rounded-md border-0 px-0 text-muted-foreground hover:text-foreground",
        className
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

function SuperAdminBreadcrumbs({ pathname }: { pathname: string }) {
  const title = getSuperAdminPageTitle(pathname);
  const atRoot = pathname === "/superadmin";

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap text-sm">
        {!atRoot ? (
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbLink href="/superadmin" className="max-w-[14rem]">
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
        ) : null}
        {!atRoot ? <BreadcrumbSeparator /> : null}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="max-w-[18rem] text-lg">{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
