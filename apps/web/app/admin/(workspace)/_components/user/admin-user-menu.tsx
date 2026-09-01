"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Beaker,
  Check,
  ChevronLeft,
  ChevronDown,
  FileText,
  LogOut,
  Moon,
  Palette,
  Sun,
  User
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { redirectToLoginForLogout } from "@/lib/auth/logout";
import type { BogaapSession } from "@/lib/auth/session";
import { useTheme, type ColorMode, type ThemeVariant } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils";
import { getInitials, getSessionDisplayUser } from "../../_utils/user";

const appearanceColorOptions: Array<{
  colorMode: ColorMode;
  label: string;
  swatches: string[];
}> = [
  {
    colorMode: "navy-slate",
    label: "Navy slate",
    swatches: ["#101418", "#334155", "#e2e8f0"]
  },
  {
    colorMode: "light-dark",
    label: "Light dark",
    swatches: ["#ffffff", "#e5e7eb", "#111827"]
  }
];

const appearanceVariants: Array<{
  icon: typeof Sun;
  label: string;
  value: ThemeVariant;
}> = [
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" }
];

type AdminUserMenuProps = {
  collapsed?: boolean;
  session: BogaapSession | null;
  triggerVariant?: "avatar" | "pill";
};

export function AdminUserMenu({
  collapsed = false,
  session,
  triggerVariant = "avatar"
}: AdminUserMenuProps) {
  const router = useRouter();
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [activeColorMode, setActiveColorMode] = useState<ColorMode | null>(null);
  const closeVariantMenuTimeoutRef = useRef<number | null>(null);
  const { avatarUrl, displayName, email } = getSessionDisplayUser(session);
  const initials = getInitials(displayName);

  useEffect(() => () => clearVariantMenuCloseDelay(), []);

  function logout() {
    redirectToLoginForLogout(router);
  }

  function selectAppearance(colorMode: ColorMode, variant?: ThemeVariant) {
    theme.setColorMode(colorMode);
    if (variant) {
      theme.setVariant(variant);
    }
  }

  function handleMenuOpenChange(open: boolean) {
    setMenuOpen(open);

    if (!open) {
      clearVariantMenuCloseDelay();
      setThemePickerOpen(false);
      setActiveColorMode(null);
    }
  }

  function clearVariantMenuCloseDelay() {
    if (closeVariantMenuTimeoutRef.current) {
      window.clearTimeout(closeVariantMenuTimeoutRef.current);
      closeVariantMenuTimeoutRef.current = null;
    }
  }

  function scheduleVariantMenuClose() {
    clearVariantMenuCloseDelay();
    closeVariantMenuTimeoutRef.current = window.setTimeout(() => {
      setActiveColorMode(null);
      closeVariantMenuTimeoutRef.current = null;
    }, 250);
  }

  return (
    <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          data-admin-surface={triggerVariant === "pill" ? true : undefined}
          type="button"
          className={cn(
            "flex min-h-8 w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "min-h-8 justify-center rounded-full p-0",
            triggerVariant === "pill" &&
              "grid size-8 min-h-8 w-8 place-items-center gap-0 rounded-full border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] p-0 shadow-none backdrop-blur-xl hover:bg-[var(--dropdown-item-hover)]"
          )}
          aria-label="Abrir menu de usuario"
        >
          <Avatar
            size={collapsed ? "default" : "lg"}
            className={cn(collapsed ? "size-6" : "size-8", triggerVariant === "pill" && "size-8")}
          >
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="grid place-items-center border-0 bg-secondary/80 text-xs font-semibold leading-none text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{displayName}</span>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </span>
          ) : null}
          {triggerVariant === "pill" && !collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 overflow-visible p-1.5">
        <DropdownMenuLabel className="px-3 py-2.5">
          <span className="block truncate text-sm font-medium leading-5">{displayName}</span>
          <span className="block truncate text-xs font-normal leading-5 text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="px-3 py-2 text-[13px] text-muted-foreground"
          onSelect={() => router.push("/admin/account")}
        >
          <User className="h-4 w-4 opacity-70" />
          Cuenta
        </DropdownMenuItem>
        <DropdownMenuItem className="px-3 py-2 text-[13px] text-muted-foreground">
          <Beaker className="h-4 w-4 opacity-70" />
          Funciones beta
        </DropdownMenuItem>
        <DropdownMenuItem className="px-3 py-2 text-[13px] text-muted-foreground">
          <FileText className="h-4 w-4 opacity-70" />
          Novedades
        </DropdownMenuItem>

        <DropdownMenuSeparator className="mt-1" />
        <div className="relative px-1 py-1">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={themePickerOpen}
            onClick={(event) => {
              event.preventDefault();
              const nextOpen = !themePickerOpen;
              setThemePickerOpen(nextOpen);
              setActiveColorMode(null);
            }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Palette className="h-4 w-4 opacity-70" strokeWidth={1.75} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate">Tema y color</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {getAppearanceLabel(theme.colorMode, theme.variant)}
                </span>
              </span>
            </span>
            <ChevronLeft
              className={cn(
                "h-4 w-4 shrink-0 opacity-70 transition-transform duration-150 ease-out",
                themePickerOpen && "-translate-x-0.5 -rotate-90"
              )}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>

          <div
            className={cn(
              "absolute right-[calc(100%+0.5rem)] top-0 z-50 w-64 origin-right rounded-2xl border border-border/70 bg-popover p-1.5 text-popover-foreground opacity-0 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.55)] transition-[opacity,transform] duration-200 ease-in-out pointer-events-none -translate-x-1 scale-[0.98]",
              themePickerOpen && "pointer-events-auto translate-x-0 scale-100 opacity-100"
            )}
          >
            <div className="grid gap-0.5">
              {appearanceColorOptions.map((option) => {
                const selected = theme.colorMode === option.colorMode;
                const active = activeColorMode === option.colorMode;

                return (
                  <div
                    key={option.colorMode}
                    className="relative"
                    onMouseEnter={clearVariantMenuCloseDelay}
                    onMouseLeave={scheduleVariantMenuClose}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active && "bg-secondary/80 text-foreground"
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        setActiveColorMode((current) =>
                          current === option.colorMode ? null : option.colorMode
                        );
                      }}
                      onMouseEnter={() => {
                        clearVariantMenuCloseDelay();
                        setActiveColorMode(option.colorMode);
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {selected ? (
                          <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
                        ) : (
                          <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate">{option.label}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {option.swatches.map((swatch) => (
                          <span
                            key={swatch}
                            className="size-4 rounded-full border border-border"
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                        <ChevronLeft
                          className={cn(
                            "h-4 w-4 opacity-70 transition-transform duration-150 ease-in-out",
                            active && "-rotate-90"
                          )}
                          strokeWidth={1.75}
                        />
                      </span>
                    </button>

                    <div
                      className={cn(
                        "absolute right-[calc(100%+0.5rem)] top-0 z-50 w-40 origin-right rounded-2xl border border-border/70 bg-popover p-1.5 text-popover-foreground opacity-0 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.55)] transition-[opacity,transform] duration-200 ease-in-out pointer-events-none -translate-x-1 scale-[0.98]",
                        active && "pointer-events-auto translate-x-0 scale-100 opacity-100"
                      )}
                      onMouseEnter={clearVariantMenuCloseDelay}
                      onMouseLeave={scheduleVariantMenuClose}
                    >
                      {appearanceVariants.map((variant) => {
                        const VariantIcon = variant.icon;
                        const variantActive =
                          theme.colorMode === option.colorMode && theme.variant === variant.value;

                        return (
                          <button
                            key={variant.value}
                            type="button"
                            className={cn(
                              "flex h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              variantActive && "bg-secondary/80 text-foreground"
                            )}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              selectAppearance(option.colorMode, variant.value);
                            }}
                          >
                            <span className="flex items-center gap-2">
                              <VariantIcon className="h-4 w-4" strokeWidth={1.75} />
                              {variant.label}
                            </span>
                            {variantActive ? <Check className="h-4 w-4" strokeWidth={2} /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="mt-1" />
        <DropdownMenuItem
          onClick={logout}
          variant="destructive"
          className="px-3 py-2.5 text-[13px]"
        >
          <LogOut className="h-4 w-4 opacity-70" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getAppearanceLabel(colorMode: ColorMode, variant: ThemeVariant) {
  const colorLabel =
    appearanceColorOptions.find((option) => option.colorMode === colorMode)?.label ?? colorMode;
  const variantLabel =
    appearanceVariants.find((option) => option.value === variant)?.label ?? variant;

  return `${colorLabel} · ${variantLabel}`;
}
