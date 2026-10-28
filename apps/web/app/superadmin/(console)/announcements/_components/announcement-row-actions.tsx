"use client";

import { CalendarClock, Eye, FilePenLine, MoreHorizontal, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { PlatformAnnouncement } from "../_api/announcements.api";

export function AnnouncementRowActions({
  busy,
  item,
  onAction,
  onEdit,
  onView
}: {
  busy: boolean;
  item: PlatformAnnouncement;
  onAction: (action: "publish" | "schedule" | "cancel") => void;
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          disabled={busy}
          aria-label={`Acciones para ${item.title}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem onSelect={onView}>
          <Eye /> Ver detalle
        </DropdownMenuItem>
        {item.status === "draft" ? (
          <>
            <DropdownMenuItem onSelect={onEdit}>
              <FilePenLine /> Editar borrador
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAction("publish")}>
              <Send /> Publicar ahora
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction("schedule")}>
              <CalendarClock /> Programar
            </DropdownMenuItem>
          </>
        ) : null}
        {item.status !== "cancelled" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onAction("cancel")}
            >
              <XCircle /> Cancelar
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
