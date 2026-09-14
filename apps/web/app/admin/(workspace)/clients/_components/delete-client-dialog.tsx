"use client";

import { Loader2, Trash2, TriangleAlert, X } from "lucide-react";
import type { ClientSummaryDto } from "@temis/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export function DeleteClientDialog({
  client,
  error,
  loading,
  open,
  onConfirm,
  onOpenChange
}: {
  client: ClientSummaryDto;
  error?: string;
  loading: boolean;
  open: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <DialogHeader>
            <DialogTitle>Eliminar cliente definitivamente</DialogTitle>
            <DialogDescription>
              {client.displayName} se eliminara de forma permanente. Esta accion esta reservada
              para admin u owner.
            </DialogDescription>
          </DialogHeader>
        </div>
        {error ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
