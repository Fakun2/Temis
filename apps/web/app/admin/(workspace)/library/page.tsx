"use client";

import { UnauthorizedState } from "@/components/ui/not-found";
import { RequirePermission } from "../_components/auth";
import { LibraryHeaderBreadcrumbPublisher } from "./_components/library-header-breadcrumb-publisher";
import { LibraryPagination } from "./_components/library-pagination";
import { LibraryStateBox } from "./_components/library-state-box";
import { LibraryTable } from "./_components/library-table";
import { LibraryToolbar } from "./_components/library-toolbar";
import { useLibraryPageController } from "./_hooks/use-library-page-controller";

export default function LibraryPage() {
  const library = useLibraryPageController();
  const data = library.data;

  return (
    <RequirePermission permissions={["documents:read"]} fallback={<RestrictedLibrary />}>
      <LibraryHeaderBreadcrumbPublisher breadcrumbs={data?.breadcrumbs ?? []} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-none">
        <div data-admin-surface className="flex min-h-0 flex-1 flex-col rounded-md bg-card shadow-[var(--admin-card-shadow)]">
          <LibraryToolbar
            busy={library.busy}
            canWrite={library.canWrite}
            createDialogOpen={library.createDialogOpen}
            filters={library.filters}
            folderId={library.folderId}
            folderName={library.folderName}
            folderNotes={library.folderNotes}
            hasActiveFilters={library.hasActiveFilters}
            selectedCount={library.selectedDocuments.length}
            onBulkDelete={() => void library.bulkDelete()}
            onBulkMove={() => void library.bulkMove()}
            onClearFilters={library.clearFilters}
            onCreateDialogOpenChange={library.setCreateDialogOpen}
            onCreateFolder={() => void library.createFolder()}
            onFiltersChange={library.updateFilters}
            onFolderNameChange={library.setFolderName}
            onFolderNotesChange={library.setFolderNotes}
            onImportCompleted={() => void library.refresh()}
            onUploadFiles={(files) => void library.uploadFiles(files)}
          />

          <div className="min-h-0 flex-1 overflow-auto scrollbar-none">
            {library.query.isLoading ? (
              <LibraryStateBox label="Cargando biblioteca" />
            ) : library.query.error ? (
              <LibraryStateBox label={library.query.error.message} />
            ) : !data?.folders.length && !data?.documents.length ? (
              <LibraryStateBox label="No hay archivos en esta vista." />
            ) : (
              <LibraryTable
                busy={library.busy}
                canWrite={library.canWrite}
                documents={data.documents}
                folders={data.folders}
                selectedSet={library.selectedSet}
                onDeleteDocument={(documentId) => void library.deleteDocument(documentId)}
                onDeleteFolder={(folderId) => void library.deleteFolder(folderId)}
                onOpenFolder={library.resetPage}
                onRenameDocument={(document, title) => void library.renameDocument(document, title)}
                onReplaceDocument={(documentId, file) => void library.replaceDocument(documentId, file)}
                onToggleDocument={library.toggleDocumentSelection}
              />
            )}
          </div>

          <LibraryPagination
            canGoBack={library.pagination.canGoBack}
            canGoForward={library.pagination.canGoForward}
            total={data?.pageInfo.total ?? 0}
            onNext={library.goToNextPage}
            onPrevious={library.goToPreviousPage}
          />
        </div>
      </div>
    </RequirePermission>
  );
}

function RestrictedLibrary() {
  return (
    <UnauthorizedState
      title="Biblioteca restringida"
      description="Necesitas permisos de documentos para acceder a la biblioteca del estudio."
    />
  );
}
