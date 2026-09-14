"use client";

import { useRef } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTableHeaderActionButton } from "../../_components/admin-table-header-action-button";
import { acceptedLibraryMimeTypes } from "../_constants/library.constants";
import { LibraryCreateFolderDialog } from "./library-create-folder-dialog";
import { LibraryFiltersPopover } from "./library-filters-popover";
import { LibraryImportDialog } from "./library-import-dialog";
import type { LibraryFilters } from "../_types/library-filters.types";

export function LibraryToolbar({
  busy,
  canWrite,
  createDialogOpen,
  filters,
  folderName,
  folderNotes,
  folderId,
  hasActiveFilters,
  selectedCount,
  onBulkDelete,
  onBulkMove,
  onClearFilters,
  onCreateFolder,
  onCreateDialogOpenChange,
  onFiltersChange,
  onFolderNameChange,
  onFolderNotesChange,
  onImportCompleted,
  onUploadFiles
}: {
  busy: boolean;
  canWrite: boolean;
  createDialogOpen: boolean;
  filters: LibraryFilters;
  folderId: string | null;
  folderName: string;
  folderNotes: string;
  hasActiveFilters: boolean;
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkMove: () => void;
  onClearFilters: () => void;
  onCreateFolder: () => void;
  onCreateDialogOpenChange: (open: boolean) => void;
  onFiltersChange: (filters: LibraryFilters) => void;
  onFolderNameChange: (value: string) => void;
  onFolderNotesChange: (value: string) => void;
  onImportCompleted: () => void;
  onUploadFiles: (files: FileList | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header
      data-admin-table-header
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/30 px-3 py-3 md:px-4 md:py-3.5 xl:px-5 xl:py-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 className="truncate text-lg font-semibold text-[var(--admin-text-primary)]">
          Documentos
        </h2>
      </div>
      <div className="flex shrink-0 flex-wrap items-end gap-2 sm:gap-3">
        <LibraryFiltersPopover
          disabled={busy}
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onChange={onFiltersChange}
          onClear={onClearFilters}
        />
        {canWrite ? (
          <>
            <LibraryCreateFolderDialog
              busy={busy}
              folderName={folderName}
              folderNotes={folderNotes}
              open={createDialogOpen}
              onFolderNameChange={onFolderNameChange}
              onFolderNotesChange={onFolderNotesChange}
              onOpenChange={onCreateDialogOpenChange}
              onSubmit={onCreateFolder}
            />
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept={acceptedLibraryMimeTypes.join(",")}
              onChange={(event) => {
                onUploadFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <AdminTableHeaderActionButton
              icon={Upload}
              label="Subir"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            />
            <LibraryImportDialog
              busy={busy}
              folderId={folderId}
              onCompleted={onImportCompleted}
            />
            {selectedCount ? (
              <>
                <Button size="sm" variant="outline" onClick={onBulkMove} disabled={busy}>
                  Mover
                </Button>
                <Button size="sm" variant="outline" onClick={onBulkDelete} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </header>
  );
}
