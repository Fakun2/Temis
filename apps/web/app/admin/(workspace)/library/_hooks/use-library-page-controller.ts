"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getLibraryUploadError } from "../_utils/library-upload-validation";
import { useLibraryPagination } from "./use-library-pagination";
import { useLibraryMutations, useLibraryQuery } from "./use-library-query";
import { useLibrarySelection } from "./use-library-selection";
import type { LibraryFilters } from "../_types/library-filters.types";
import type { LibraryDocumentDto } from "../_types/library.types";

export function useLibraryPageController() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamFolderId = searchParams.get("folderId");
  const [folderId, setFolderId] = useState<string | null>(searchParamFolderId);
  const [filters, setFilters] = useState<LibraryFilters>({
    categoryId: "",
    mimeGroups: []
  });
  const [folderName, setFolderName] = useState("");
  const [folderNotes, setFolderNotes] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const selection = useLibrarySelection();
  const pagination = useLibraryPagination();

  const query = useLibraryQuery({
    categoryId: filters.categoryId || undefined,
    cursor: pagination.cursor,
    folderId,
    limit: 20,
    mimeGroups: filters.mimeGroups.length ? filters.mimeGroups : undefined
  });
  const mutations = useLibraryMutations();
  const busy = Object.values(mutations).some((mutation) => mutation.isPending);
  const canWrite = mutations.createFolder.hasPermission;
  const hasActiveFilters = Boolean(filters.mimeGroups.length || filters.categoryId);

  useEffect(() => {
    setFolderId(searchParamFolderId);
    pagination.resetPagination();
    selection.clearSelection();
  }, [pagination.resetPagination, searchParamFolderId, selection.clearSelection]);

  function resetPage(nextFolderId = folderId) {
    setFolderId(nextFolderId);
    pagination.resetPagination();
    selection.clearSelection();
    syncFolderUrl(nextFolderId);
  }

  function updateFilters(nextFilters: LibraryFilters) {
    setFilters(nextFilters);
    resetPage(folderId);
  }

  function clearFilters() {
    updateFilters({ categoryId: "", mimeGroups: [] });
  }

  async function createFolder() {
    if (!folderName.trim()) {
      return;
    }
    await mutations.createFolder.mutateAsync({
      name: folderName.trim(),
      notes: folderNotes.trim() || undefined,
      parentId: folderId
    });
    setFolderName("");
    setFolderNotes("");
    setCreateDialogOpen(false);
  }

  async function uploadFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }
    const error = getLibraryUploadError(file);
    if (error) {
      window.alert(error);
      return;
    }
    await mutations.uploadDocument.mutateAsync({
      categoryId: filters.categoryId || undefined,
      file,
      folderId
    });
  }

  async function renameDocument(document: LibraryDocumentDto, title: string) {
    if (!title.trim()) {
      return;
    }
    await mutations.updateDocument.mutateAsync({
      documentId: document.id,
      input: { title: title.trim() }
    });
  }

  async function replaceDocument(documentId: string, file: File) {
    await mutations.replaceDocument.mutateAsync({ documentId, file });
  }

  async function bulkMove() {
    const targetFolderId = window.prompt("ID de carpeta destino; vacio para raiz", folderId ?? "");
    if (targetFolderId === null) {
      return;
    }
    await mutations.bulkMove.mutateAsync({
      documentIds: selection.selectedDocuments,
      folderId: targetFolderId.trim() || null
    });
    selection.clearSelection();
  }

  async function bulkDelete() {
    if (
      !selection.selectedDocuments.length ||
      !window.confirm("Eliminar definitivamente los documentos seleccionados?")
    ) {
      return;
    }
    await mutations.bulkDelete.mutateAsync({ documentIds: selection.selectedDocuments, folderIds: [] });
    selection.clearSelection();
  }

  function syncFolderUrl(nextFolderId: string | null) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextFolderId) {
      nextParams.set("folderId", nextFolderId);
    } else {
      nextParams.delete("folderId");
    }
    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    router.push(nextUrl, { scroll: false });
  }

  return {
    bulkDelete,
    bulkMove,
    busy,
    canWrite,
    clearFilters,
    createDialogOpen,
    createFolder,
    data: query.data,
    deleteDocument: mutations.deleteDocument.mutateAsync,
    deleteFolder: mutations.deleteFolder.mutateAsync,
    filters,
    folderId,
    folderName,
    folderNotes,
    goToNextPage: () => pagination.goToNextPage(query.data?.pageInfo.nextCursor),
    goToPreviousPage: pagination.goToPreviousPage,
    hasActiveFilters,
    pagination: {
      canGoBack: pagination.canGoBack,
      canGoForward: Boolean(query.data?.pageInfo.hasNextPage)
    },
    query,
    renameDocument,
    replaceDocument,
    refresh: query.refetch,
    resetPage,
    selectedDocuments: selection.selectedDocuments,
    selectedSet: selection.selectedSet,
    setCreateDialogOpen,
    setFolderName,
    setFolderNotes,
    toggleDocumentSelection: selection.toggleDocumentSelection,
    updateFilters,
    uploadFiles
  };
}
