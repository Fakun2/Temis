"use client";

import { useState } from "react";
import { Folder, Presentation, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { getDocumentPreviewUrl } from "../_api/library.api";
import { formatBytes, formatLibraryDate } from "../_utils/library-formatters";
import { LibraryDocumentRowActions } from "./library-document-row-actions";
import type { DocumentFolderDto, LibraryDocumentDto } from "../_types/library.types";

export function LibraryTable({
  busy,
  canWrite,
  documents,
  folders,
  selectedSet,
  onDeleteDocument,
  onDeleteFolder,
  onOpenFolder,
  onRenameDocument,
  onReplaceDocument,
  onToggleDocument
}: {
  busy: boolean;
  canWrite: boolean;
  documents: LibraryDocumentDto[];
  folders: DocumentFolderDto[];
  selectedSet: Set<string>;
  onDeleteDocument: (documentId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onOpenFolder: (folderId: string) => void;
  onRenameDocument: (document: LibraryDocumentDto, title: string) => void;
  onReplaceDocument: (documentId: string, file: File) => void;
  onToggleDocument: (documentId: string, selected: boolean) => void;
}) {
  const [folderToDelete, setFolderToDelete] = useState<DocumentFolderDto | null>(null);

  function confirmDeleteFolder() {
    if (!folderToDelete) {
      return;
    }
    onDeleteFolder(folderToDelete.id);
    setFolderToDelete(null);
  }

  return (
    <>
      <table className="w-full min-w-[860px] text-sm">
        <thead className="sticky top-0 bg-card text-left text-xs uppercase text-muted-foreground">
          <tr className="border-b border-border/70">
            <th className="w-10 p-3"></th>
            <th className="p-3">Nombre</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Tamano</th>
            <th className="p-3">Fecha</th>
            <th className="w-48 p-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {folders.map((folder) => (
            <tr key={folder.id} className="border-b border-border/50">
              <td className="p-3"></td>
              <td className="p-3">
                <button
                  className="inline-flex items-center gap-2 font-medium text-foreground"
                  onClick={() => onOpenFolder(folder.id)}
                >
                  <Folder className="h-4 w-4 text-primary" />
                  {folder.name}
                </button>
              </td>
              <td className="p-3">Carpeta</td>
              <td className="p-3 text-muted-foreground">-</td>
              <td className="p-3">{formatLibraryDate(folder.updatedAt)}</td>
              <td className="p-3 text-right">
                {canWrite ? (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => setFolderToDelete(folder)}
                    disabled={busy}
                    aria-label={`Eliminar carpeta ${folder.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
          {documents.map((document) => (
            <tr key={document.id} className="border-b border-border/50">
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={selectedSet.has(document.id)}
                  onChange={(event) => onToggleDocument(document.id, event.target.checked)}
                />
              </td>
              <td className="p-3">
                <div className="flex min-w-0 items-center gap-2">
                  {isPowerPointDocument(document) ? (
                    <Presentation className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : null}
                  <a
                    className="min-w-0 truncate font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                    href={getDocumentPreviewUrl(document.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {document.title}
                  </a>
                </div>
                <div className="text-xs text-muted-foreground">{document.originalName}</div>
              </td>
              <td className="p-3">{document.extension?.toUpperCase() ?? document.mimeType}</td>
              <td className="p-3">{formatBytes(document.sizeBytes)}</td>
              <td className="p-3">{formatLibraryDate(document.updatedAt)}</td>
              <td className="p-3 text-right">
                <LibraryDocumentRowActions
                  busy={busy}
                  canWrite={canWrite}
                  document={document}
                  onDelete={onDeleteDocument}
                  onRename={onRenameDocument}
                  onReplace={onReplaceDocument}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={Boolean(folderToDelete)} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar carpeta</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara definitivamente la carpeta
              {folderToDelete ? ` "${folderToDelete.name}"` : ""} junto con todos los archivos y
              subcarpetas que contenga.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setFolderToDelete(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteFolder} disabled={busy}>
              Eliminar definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function isPowerPointDocument(document: LibraryDocumentDto) {
  const extension = document.extension?.toLowerCase();

  return (
    extension === "ppt" ||
    extension === "pptx" ||
    extension === "pps" ||
    extension === "ppsx" ||
    extension === "ppx" ||
    document.mimeType.includes("presentation")
  );
}
