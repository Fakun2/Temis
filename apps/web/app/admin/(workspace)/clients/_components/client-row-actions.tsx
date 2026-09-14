"use client";

import { useState } from "react";
import { Archive, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import type { ClientSummaryDto } from "@temis/api-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { hasPermission } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/use-session";
import { useArchiveClientMutation, useDeleteClientMutation } from "../_hooks/use-clients-query";
import { ArchiveClientDialog } from "./archive-client-dialog";
import { ClientSheet } from "./client-sheet";
import { DeleteClientDialog } from "./delete-client-dialog";

export function ClientRowActions({
  client,
  onArchived
}: {
  client: ClientSummaryDto;
  onArchived: () => void;
}) {
  const session = useSession();
  const canUpdate = hasPermission(session, "clients:update");
  const canArchive = canUpdate && client.status !== "archived";
  const canDelete = hasPermission(session, "clients:delete");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const archiveMutation = useArchiveClientMutation();
  const deleteMutation = useDeleteClientMutation();
  const busy = archiveMutation.isPending || deleteMutation.isPending;

  async function handleArchive() {
    try {
      await archiveMutation.mutateAsync(client.id);
      setArchiveDialogOpen(false);
      onArchived();
    } catch {
      // The mutation exposes its error in the confirmation dialog.
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(client.id);
      setDeleteDialogOpen(false);
      onArchived();
    } catch {
      // The mutation exposes its error in the confirmation dialog.
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-7 w-7 border-border/50 p-0"
            disabled={busy}
            aria-label={`Acciones para ${client.displayName}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canUpdate ? (
            <DropdownMenuItem
              onSelect={() => {
                setEditSheetOpen(true);
              }}
            >
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              Editar
            </DropdownMenuItem>
          ) : null}
          {canArchive ? (
            <DropdownMenuItem
              onSelect={() => {
                setArchiveDialogOpen(true);
              }}
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              Archivar
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar definitivo
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ClientSheet
        clientId={client.id}
        open={editSheetOpen}
        trigger={null}
        onOpenChange={setEditSheetOpen}
        onSaved={onArchived}
      />
      <ArchiveClientDialog
        client={client}
        error={archiveMutation.error?.message}
        loading={archiveMutation.isPending}
        open={archiveDialogOpen}
        onConfirm={() => void handleArchive()}
        onOpenChange={setArchiveDialogOpen}
      />
      <DeleteClientDialog
        client={client}
        error={deleteMutation.error?.message}
        loading={deleteMutation.isPending}
        open={deleteDialogOpen}
        onConfirm={() => void handleDelete()}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
