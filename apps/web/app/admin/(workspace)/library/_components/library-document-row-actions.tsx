"use client";

import { Download, Eye, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { useLibraryDocumentRowActions } from "../_hooks/use-library-document-row-actions";
import type { LibraryDocumentDto } from "../_types/library.types";

export function LibraryDocumentRowActions({
  busy,
  canWrite,
  document,
  onDelete,
  onRename,
  onReplace
}: {
  busy: boolean;
  canWrite: boolean;
  document: LibraryDocumentDto;
  onDelete: (documentId: string) => void;
  onRename: (document: LibraryDocumentDto, title: string) => void;
  onReplace: (documentId: string, file: File) => void;
}) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const actions = useLibraryDocumentRowActions({ document, onDelete, onRename });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-xs" variant="ghost" aria-label={`Acciones de ${document.title}`}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={actions.preview}>
            <Eye className="h-4 w-4" />
            Ver
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={actions.download}>
            <Download className="h-4 w-4" />
            Descargar
          </DropdownMenuItem>
          {canWrite ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={busy}
                onSelect={actions.openRename}
              >
                <Pencil className="h-4 w-4" />
                Renombrar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={busy} onSelect={() => replaceInputRef.current?.click()}>
                <RefreshCw className="h-4 w-4" />
                Reemplazar archivo
              </DropdownMenuItem>
              <DropdownMenuItem disabled={busy} onSelect={() => actions.setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={replaceInputRef}
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onReplace(document.id, file);
          event.currentTarget.value = "";
        }}
      />

      <Sheet open={actions.renameOpen} onOpenChange={actions.setRenameOpen}>
        <SheetContent className="w-[420px] max-w-[94vw] border-border bg-card sm:max-w-[420px]">
          <SheetHeader className="border-b border-border/60 px-5 py-5">
            <SheetTitle>Renombrar archivo</SheetTitle>
            <SheetDescription>Actualiza el nombre visible del documento en la biblioteca.</SheetDescription>
          </SheetHeader>
          <form
            className="grid gap-4 px-5 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              actions.submitRename();
            }}
          >
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Nombre</span>
              <Input autoFocus value={actions.title} onChange={(event) => actions.setTitle(event.target.value)} />
            </label>
            <SheetFooter className="px-0 py-0">
              <Button type="button" variant="outline" onClick={() => actions.setRenameOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || !actions.title.trim()}>
                Guardar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={actions.deleteOpen} onOpenChange={actions.setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar archivo</DialogTitle>
            <DialogDescription>
              Esta accion no se puede revertir. El archivo se eliminara definitivamente de la biblioteca.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
            {document.title}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => actions.setDeleteOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button size="sm" onClick={actions.confirmDelete} disabled={busy}>
              Eliminar definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
