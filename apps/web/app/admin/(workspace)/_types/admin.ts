import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { PermissionMode } from "@/lib/auth/permissions";
import type { BogaapSession } from "@/lib/auth/session";

export type AdminSidebarVariant = "desktop" | "mobile";

export type AdminNavItem = {
  children?: AdminNavItem[];
  href?: string;
  icon: LucideIcon;
  iconAnimation?:
    | "account-ai"
    | "account-archive"
    | "account-back"
    | "account-organization"
    | "account-plan"
    | "account-preferences"
    | "account-profile"
    | "account-security"
    | "ai-stars"
    | "calendar"
    | "cashbox"
    | "cases"
    | "library"
    | "settings"
    | "staff";
  label: string;
  permissionMode?: PermissionMode;
  requiredPermissions?: string[];
  shortcut?: {
    keys: string[];
    label: string;
  };
  status?: "ready" | "soon";
};

export type AdminNavSection = {
  items: AdminNavItem[];
  title: string;
};

export type AdminPageTitle = {
  href: string;
  title: string;
};

export type AdminHeaderProps = {
  onOpenCommand: () => void;
  onOpenMobileSidebar: () => void;
  onToggleSidebar: () => void;
  scrolled: boolean;
  session: BogaapSession | null;
  sidebarOpen: boolean;
};

export type AdminMetric = {
  badge?: string;
  detail?: string;
  icon: LucideIcon;
  label: string;
  loading?: boolean;
  tooltipItems?: Array<{
    label: string;
    value: number | string;
  }>;
  value?: number | string;
};

export type AdminQuickLink = {
  description: string;
  href: string;
  label: string;
  status?: "ready" | "soon";
};

export type AdminCommandItem = {
  href: string;
  icon?: LucideIcon;
  label: string;
  permissionMode?: PermissionMode;
  requiredPermissions?: string[];
  shortcut?: string;
  status?: "ready" | "soon";
};

export type AdminCommandSection = {
  items: AdminCommandItem[];
  title: string;
};

export type AdminShellProps = {
  children: ReactNode;
};
