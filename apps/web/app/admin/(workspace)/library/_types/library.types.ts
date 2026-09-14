export type DocumentMimeGroup = "pdf" | "image" | "word" | "excel" | "powerpoint";

export type DocumentFolderDto = {
  id: string;
  parentId: string | null;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LibraryDocumentDto = {
  id: string;
  folderId: string | null;
  category: { id: string; name: string; description: string | null } | null;
  title: string;
  originalName: string;
  extension: string | null;
  mimeType: string;
  sizeBytes: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LibraryListResponse = {
  folders: DocumentFolderDto[];
  documents: LibraryDocumentDto[];
  breadcrumbs: DocumentFolderDto[];
  metrics: {
    folders: number;
    documents: number;
    storageBytes: number;
  };
  pageInfo: {
    hasNextPage: boolean;
    limit: number;
    nextCursor: string | null;
    total: number;
  };
};

export type DocumentImportJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "partial_failed"
  | "canceled"
  | "failed";

export type DocumentImportItemStatus =
  | "processing"
  | "completed"
  | "skipped_duplicate"
  | "rejected"
  | "failed"
  | "canceled";

export type DocumentImportItemDto = {
  id: string;
  relativePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentImportItemStatus;
  error: string | null;
  documentId: string | null;
  folderId: string | null;
  updatedAt: string;
};

export type DocumentImportJobDto = {
  id: string;
  folderId: string | null;
  status: DocumentImportJobStatus;
  totalFiles: number;
  totalBytes: number;
  processedFiles: number;
  completedFiles: number;
  skippedFiles: number;
  rejectedFiles: number;
  failedFiles: number;
  lastError: string | null;
  createdAt: string;
  completedAt: string | null;
  recentItems: DocumentImportItemDto[];
};

export type LibraryQueryParams = {
  folderId?: string | null;
  categoryId?: string;
  cursor?: string;
  limit?: number;
  mimeGroup?: DocumentMimeGroup;
  mimeGroups?: DocumentMimeGroup[];
};
