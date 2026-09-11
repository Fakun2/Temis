"use client";

import { Plus } from "lucide-react";
import type { TemisSession } from "@/lib/auth/session";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { getInitials, getSessionDisplayUser } from "../../_utils/user";
import { HeaderActionButton } from "./header-action-button";

type HeaderAvatarGroupProps = {
  session: TemisSession | null;
};

export function HeaderAvatarGroup({ session }: HeaderAvatarGroupProps) {
  const { displayName } = getSessionDisplayUser(session);
  const collaborators = [{ name: displayName }, { name: "Staff TEMIS" }];

  return (
    <div className="hidden items-center gap-2 md:flex">
      <AvatarGroup className="*:ring-[var(--admin-page-bg)]">
        {collaborators.map((collaborator) => (
          <Avatar
            data-admin-surface
            key={collaborator.name}
            className="size-9 shadow-[var(--admin-header-control-shadow)]"
          >
            <AvatarFallback className="bg-secondary text-[11px] font-medium text-secondary-foreground">
              {getInitials(collaborator.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        <AvatarGroupCount
          data-admin-surface
          className="size-9 bg-card text-[11px] font-medium text-btn-primary ring-[var(--admin-page-bg)] shadow-[var(--admin-header-control-shadow)]"
        >
          +2
        </AvatarGroupCount>
      </AvatarGroup>

      <HeaderActionButton label="Invitar usuario" className="rounded-full text-foreground">
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </HeaderActionButton>
    </div>
  );
}
