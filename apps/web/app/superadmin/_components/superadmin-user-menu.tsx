"use client";

import { LogOut, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { hasSuperAdminPermission } from "@/lib/auth/superadmin-permissions";
import type { SuperAdminSession } from "@/lib/auth/superadmin-session";
import { useTheme } from "@/lib/theme/theme-provider";

export function SuperAdminUserMenu({
  onLogout,
  session
}: {
  onLogout: () => Promise<void>;
  session: SuperAdminSession;
}) {
  const router = useRouter();
  const theme = useTheme();
  const initials = getInitials(session.user.fullName);
  const canManageAccount = hasSuperAdminPermission(session, "platform:account:self_manage");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-admin-surface
          type="button"
          className="grid size-8 place-items-center rounded-full border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] text-foreground shadow-none backdrop-blur-xl transition-colors hover:bg-[var(--dropdown-item-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir menu de usuario"
        >
          <Avatar size="default" className="size-8">
            {session.user.avatarUrl ? (
              <AvatarImage src={session.user.avatarUrl} alt={session.user.fullName} />
            ) : null}
            <AvatarFallback className="grid place-items-center border-0 bg-secondary/80 text-xs font-semibold leading-none text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1.5">
        <DropdownMenuLabel className="px-3 py-2.5">
          <span className="block truncate text-sm font-medium leading-5">
            {session.user.fullName}
          </span>
          <span className="block truncate text-xs font-normal leading-5 text-muted-foreground">
            {session.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canManageAccount ? (
          <>
            <DropdownMenuItem
              className="px-3 py-2 text-[13px] text-muted-foreground"
              onSelect={() => router.push("/superadmin/account")}
            >
              <UserRound className="size-4 opacity-70" />
              Cuenta
            </DropdownMenuItem>
            <DropdownMenuItem
              className="px-3 py-2 text-[13px] text-muted-foreground"
              onSelect={() => router.push("/superadmin/security")}
            >
              <ShieldCheck className="size-4 opacity-70" />
              Seguridad
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuItem
          className="px-3 py-2 text-[13px] text-muted-foreground"
          onSelect={(event) => {
            event.preventDefault();
            theme.toggleVariant();
          }}
        >
          {theme.isDark ? (
            <Sun className="size-4 opacity-70" />
          ) : (
            <Moon className="size-4 opacity-70" />
          )}
          {theme.isDark ? "Modo claro" : "Modo oscuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="px-3 py-2.5 text-[13px]"
          onSelect={() => void onLogout()}
        >
          <LogOut className="size-4 opacity-70" />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "SA";
}
