"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import {
  bulkDelete,
  bulkMove,
  createFolder,
  deleteDocument,
  deleteFolder,
  libraryKeys,
  listLibrary,
  updateDocument,
  replaceDocument,
  updateFolder,
  uploadDocument
} from "../_api/library.api";
import type { LibraryQueryParams } from "../_types/library.types";

export function useLibraryQuery(params: LibraryQueryParams) {
  return useDashboardQuery({
    permission: "documents:read",
    queryFn: () => listLibrary(params),
    queryKey: libraryKeys.list(params)
  });
}

export function useLibraryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.includes(libraryKeys.all[0])
    });

  return {
    bulkDelete: useDashboardMutation({
      mutationFn: (input: { documentIds: string[]; folderIds: string[] }) => bulkDelete(input),
      onSuccess: invalidate,
      permission: "documents:write"
    }),
    bulkMove: useDashboardMutation({
      mutationFn: (input: { documentIds: string[]; folderId?: string | null }) => bulkMove(input),
      onSuccess: invalidate,
      permission: "documents:write"
    }),
    createFolder: useDashboardMutation({
      mutationFn: (input: Parameters<typeof createFolder>[0]) => createFolder(input),
      onSuccess: invalidate,
      permission: "documents:write"
    }),
    deleteDocument: useDashboardMutation({
      mutationFn: (documentId: string) => deleteDocument(documentId),
      onSuccess: invalidate,
      permission: "documents:write"
    }),
    deleteFolder: useDashboardMutation({
      mutationFn: (folderId: string) => deleteFolder(folderId),
      onSuccess: invalidate,
      permission: "documents:write"
    }),
    updateDocument: useDashboardMutation({
      mutationFn: (variables: Parameters<typeof updateDocument>[0]) => updateDocument(variables),
      onSuccess: invalidate,
      permission: "documents:write"
    }),
    replaceDocument: useDashboardMutation({
      mutationFn: (variables: Parameters<typeof replaceDocument>[0]) => replaceDocument(variables),
      onSuccess: invalidate,
      permission: "documents:write"
    }),
    updateFolder: useDashboardMutation({
      mutationFn: (variables: Parameters<typeof updateFolder>[0]) => updateFolder(variables),
      onSuccess: invalidate,
      permission: "documents:write"
    }),
    uploadDocument: useDashboardMutation({
      mutationFn: (variables: Parameters<typeof uploadDocument>[0]) => uploadDocument(variables),
      onSuccess: invalidate,
      permission: "documents:write"
    })
  };
}
