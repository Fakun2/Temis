"use client";

import { useState } from "react";
import { Archive, Eye, MoreHorizontal, PencilLine } from "lucide-react";
import type { ClientSummaryDto } from "@bogaap/api-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { hasPermission } from "@/lib/auth/permissions";
import { useSession } from "@/lib/auth/use-session";
import { useArchiveClientMutation } from "../_hooks/use-clients-query";
import { ArchiveClientDialog } from "./archive-client-dialog";

export function ClientRowActions({
  client,
  onArchived
}: {
  client: ClientSummaryDto;
  onArchived: () => void;
}) {
  const session = useSession();
  const canUpdate = hasPermission(session, "clients:update");
  const canArchive = hasPermission(session, "clients:delete") && client.status !== "archived";
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const archiveMutation = useArchiveClientMutation();

  async function handleArchive() {
    try {
      await archiveMutation.mutateAsync(client.id);
      setArchiveDialogOpen(false);
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
            disabled={archiveMutation.isPending}
            aria-label={`Acciones para ${client.displayName}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem disabled>
            <Eye className="h-4 w-4" aria-hidden="true" />
            Ver detalle
          </DropdownMenuItem>
          {canUpdate ? (
            <DropdownMenuItem disabled>
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              Editar
            </DropdownMenuItem>
          ) : null}
          {canArchive ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                setArchiveDialogOpen(true);
              }}
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              Archivar
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ArchiveClientDialog
        client={client}
        error={archiveMutation.error?.message}
        loading={archiveMutation.isPending}
        open={archiveDialogOpen}
        onConfirm={() => void handleArchive()}
        onOpenChange={setArchiveDialogOpen}
      />
    </>
  );
}
