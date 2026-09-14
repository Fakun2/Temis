import { dashboardHttpClient } from "@/lib/http";
import type {
  DocumentFolderDto,
  DocumentImportJobDto,
  LibraryDocumentDto,
  LibraryListResponse,
  LibraryQueryParams
} from "../_types/library.types";

export const libraryKeys = {
  all: ["library"] as const,
  folders: () => [...libraryKeys.all, "folders"] as const,
  list: (params: LibraryQueryParams) => [...libraryKeys.all, "list", params] as const
};

export async function listLibrary(params: LibraryQueryParams): Promise<LibraryListResponse> {
  return dashboardHttpClient.request<LibraryListResponse>({
    params,
    path: "/documents"
  });
}

export async function listLibraryFolders(): Promise<DocumentFolderDto[]> {
  return dashboardHttpClient.request<DocumentFolderDto[]>({
    path: "/documents/folders"
  });
}

export async function createFolder(input: {
  name: string;
  notes?: string;
  parentId?: string | null;
}): Promise<DocumentFolderDto> {
  return dashboardHttpClient.request<DocumentFolderDto>({
    body: input,
    method: "POST",
    path: "/documents/folders"
  });
}

export async function updateFolder({
  folderId,
  input
}: {
  folderId: string;
  input: { name?: string; notes?: string | null; parentId?: string | null };
}): Promise<DocumentFolderDto> {
  return dashboardHttpClient.request<DocumentFolderDto>({
    body: input,
    method: "PATCH",
    path: `/documents/folders/${folderId}`
  });
}

export async function deleteFolder(folderId: string): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "DELETE",
    path: `/documents/folders/${folderId}`
  });
}

export async function updateDocument({
  documentId,
  input
}: {
  documentId: string;
  input: {
    categoryId?: string | null;
    folderId?: string | null;
    notes?: string;
    title?: string;
  };
}): Promise<LibraryDocumentDto> {
  return dashboardHttpClient.request<LibraryDocumentDto>({
    body: input,
    method: "PATCH",
    path: `/documents/${documentId}`
  });
}

export async function deleteDocument(documentId: string): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "DELETE",
    path: `/documents/${documentId}`
  });
}

export async function bulkDelete(input: {
  documentIds: string[];
  folderIds: string[];
}): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    body: input,
    method: "POST",
    path: "/documents/bulk-delete"
  });
}

export async function bulkMove(input: {
  documentIds: string[];
  folderId?: string | null;
}): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    body: input,
    method: "POST",
    path: "/documents/bulk-move"
  });
}

export async function uploadDocument({
  categoryId,
  file,
  folderId,
  notes
}: {
  categoryId?: string;
  file: File;
  folderId?: string | null;
  notes?: string;
}): Promise<LibraryDocumentDto> {
  const body = new FormData();
  body.set("file", file);
  if (folderId) {
    body.set("folderId", folderId);
  }
  if (categoryId) {
    body.set("categoryId", categoryId);
  }
  if (notes?.trim()) {
    body.set("notes", notes.trim());
  }

  const response = await fetch("/api/documents", { body, method: "POST" });
  if (!response.ok) {
    throw new Error(await getUploadErrorMessage(response));
  }

  return response.json() as Promise<LibraryDocumentDto>;
}

export async function replaceDocument({ documentId, file, title }: { documentId: string; file: File; title?: string }) {
  const body = new FormData();
  body.set("file", file);
  if (title?.trim()) body.set("title", title.trim());
  const response = await fetch(`/api/documents/${documentId}/replace`, { body, method: "POST" });
  if (!response.ok) throw new Error(await getUploadErrorMessage(response));
  return response.json() as Promise<LibraryDocumentDto>;
}

export async function createImportJob(input: {
  folderId?: string | null;
  totalBytes: number;
  totalFiles: number;
}): Promise<DocumentImportJobDto> {
  return dashboardHttpClient.request<DocumentImportJobDto>({
    body: input,
    method: "POST",
    path: "/documents/imports"
  });
}

export async function uploadImportItems({
  files,
  importJobId,
  isFinalBatch,
  relativePaths
}: {
  files: File[];
  importJobId: string;
  isFinalBatch: boolean;
  relativePaths: string[];
}): Promise<DocumentImportJobDto> {
  const body = new FormData();
  for (const file of files) {
    body.append("files", file);
  }
  for (const relativePath of relativePaths) {
    body.append("relativePaths", relativePath);
  }
  body.set("isFinalBatch", String(isFinalBatch));

  const response = await fetch(`/api/documents/imports/${importJobId}/items`, {
    body,
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(await getUploadErrorMessage(response));
  }
  return response.json() as Promise<DocumentImportJobDto>;
}

export async function getImportJob(importJobId: string): Promise<DocumentImportJobDto> {
  return dashboardHttpClient.request<DocumentImportJobDto>({
    path: `/documents/imports/${importJobId}`
  });
}

export async function cancelImportJob(importJobId: string): Promise<DocumentImportJobDto> {
  return dashboardHttpClient.request<DocumentImportJobDto>({
    method: "POST",
    path: `/documents/imports/${importJobId}/cancel`
  });
}

export function getDocumentPreviewUrl(documentId: string) {
  return `/api/documents/${documentId}/preview`;
}

export function getDocumentDownloadUrl(documentId: string) {
  return `/api/documents/${documentId}/download`;
}

async function getUploadErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  if (typeof body?.message === "string") {
    return body.message;
  }
  if (Array.isArray(body?.message)) {
    return body.message.join(" ");
  }
  return `No se pudo subir el archivo (${response.status}).`;
}
