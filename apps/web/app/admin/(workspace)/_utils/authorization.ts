import { hasPermissions } from "@/lib/auth/permissions";
import type { TemisSession } from "@/lib/auth/session";
import type { AdminCommandSection, AdminNavItem, AdminNavSection } from "../_types/admin";

export function getAuthorizedNavSections(
  session: TemisSession | null,
  sections: AdminNavSection[]
): AdminNavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => getAuthorizedNavItem(session, item))
        .filter((item): item is AdminNavItem => Boolean(item))
    }))
    .filter((section) => section.items.length > 0);
}

export function getAuthorizedCommandSections(
  session: TemisSession | null,
  sections: AdminCommandSection[]
): AdminCommandSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isAuthorizedItem(session, item))
    }))
    .filter((section) => section.items.length > 0);
}

function isAuthorizedItem(
  session: TemisSession | null,
  item: {
    permissionMode?: "all" | "any";
    requiredPermissions?: string[];
    status?: "ready" | "soon";
  }
) {
  if (item.status === "soon") {
    return false;
  }

  return hasPermissions(session, item.requiredPermissions, item.permissionMode);
}

function getAuthorizedNavItem(session: TemisSession | null, item: AdminNavItem): AdminNavItem | null {
  if (item.status === "soon") {
    return null;
  }

  if (item.children?.length) {
    const children = item.children
      .map((child) => getAuthorizedNavItem(session, child))
      .filter((child): child is AdminNavItem => Boolean(child));

    if (!children.length || !hasPermissions(session, item.requiredPermissions, item.permissionMode)) {
      return null;
    }

    return { ...item, children };
  }

  return hasPermissions(session, item.requiredPermissions, item.permissionMode) ? item : null;
}
