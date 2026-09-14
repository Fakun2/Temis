import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);
const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().optional()
);
const optionalNullableUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().nullable().optional()
);

export const documentMimeGroupSchema = z.enum(["pdf", "image", "word", "excel", "powerpoint"]);
const optionalDocumentMimeGroups = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === "string" ? item.split(",") : item));
  }
  if (typeof value === "string") {
    return value.split(",");
  }
  return value;
}, z.array(documentMimeGroupSchema).max(5).optional());

export const listDocumentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: optionalTrimmedString,
  folderId: optionalNullableUuid,
  search: optionalTrimmedString,
  categoryId: optionalUuid,
  mimeGroup: documentMimeGroupSchema.optional(),
  mimeGroups: optionalDocumentMimeGroups
});

export const createDocumentFolderSchema = z.object({
  parentId: optionalNullableUuid,
  name: z.string().trim().min(1).max(120),
  notes: optionalTrimmedString.pipe(z.string().max(500).optional())
});

export const updateDocumentFolderSchema = z.object({
  parentId: optionalNullableUuid,
  name: z.string().trim().min(1).max(120).optional(),
  notes: optionalTrimmedString.pipe(z.string().max(500).optional())
});

export const createDocumentBodySchema = z.object({
  folderId: optionalNullableUuid,
  categoryId: optionalUuid,
  notes: optionalTrimmedString.pipe(z.string().max(500).optional())
});

export const updateDocumentSchema = z.object({
  folderId: optionalNullableUuid,
  categoryId: optionalNullableUuid,
  title: z.string().trim().min(1).max(180).optional(),
  notes: optionalTrimmedString.pipe(z.string().max(500).optional())
});

export const replaceDocumentBodySchema = z.object({
  title: z.string().trim().min(1).max(180).optional()
});

export const bulkDeleteDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()).max(100).default([]),
  folderIds: z.array(z.string().uuid()).max(50).default([])
});

export const bulkMoveDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(100),
  folderId: optionalNullableUuid
});

export const createDocumentImportJobSchema = z.object({
  folderId: optionalNullableUuid,
  totalBytes: z.coerce.number().int().min(0).default(0),
  totalFiles: z.coerce.number().int().min(0).max(5000).default(0)
});

const multipartBoolean = z.preprocess(
  (value) => (typeof value === "string" ? value === "true" : value),
  z.boolean().default(false)
);

export const uploadDocumentImportItemsSchema = z.object({
  isFinalBatch: multipartBoolean,
  relativePaths: z.union([z.string(), z.array(z.string())])
});

export class ListDocumentsQueryDto extends createZodDto(listDocumentsQuerySchema) {}
export class CreateDocumentFolderDto extends createZodDto(createDocumentFolderSchema) {}
export class UpdateDocumentFolderDto extends createZodDto(updateDocumentFolderSchema) {}
export class CreateDocumentBodyDto extends createZodDto(createDocumentBodySchema) {
  @ApiProperty({ type: "string", format: "binary" })
  file!: unknown;
}
export class UpdateDocumentDto extends createZodDto(updateDocumentSchema) {}
export class ReplaceDocumentBodyDto extends createZodDto(replaceDocumentBodySchema) {
  @ApiProperty({ type: "string", format: "binary" })
  file!: unknown;
}
export class BulkDeleteDocumentsDto extends createZodDto(bulkDeleteDocumentsSchema) {}
export class BulkMoveDocumentsDto extends createZodDto(bulkMoveDocumentsSchema) {}
export class CreateDocumentImportJobDto extends createZodDto(createDocumentImportJobSchema) {}
export class UploadDocumentImportItemsDto extends createZodDto(uploadDocumentImportItemsSchema) {
  @ApiProperty({ isArray: true, type: "string", format: "binary" })
  files!: unknown[];
}

export class DocumentCaseSummaryDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  caseNumber!: string;
  @ApiProperty()
  caption!: string;
}

export class DocumentCategorySummaryDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ nullable: true, type: String })
  description!: string | null;
}

export class DocumentFolderDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  parentId!: string | null;
  @ApiProperty()
  name!: string;
  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class DocumentDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  caseId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  folderId!: string | null;
  @ApiProperty({ nullable: true, type: DocumentCaseSummaryDto })
  case!: DocumentCaseSummaryDto | null;
  @ApiProperty({ nullable: true, type: DocumentCategorySummaryDto })
  category!: DocumentCategorySummaryDto | null;
  @ApiProperty()
  title!: string;
  @ApiProperty()
  originalName!: string;
  @ApiProperty({ nullable: true, type: String })
  extension!: string | null;
  @ApiProperty()
  mimeType!: string;
  @ApiProperty()
  sizeBytes!: number;
  @ApiProperty({ nullable: true, type: String })
  notes!: string | null;
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class DocumentsPageInfoDto {
  @ApiProperty()
  limit!: number;
  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;
  @ApiProperty()
  hasNextPage!: boolean;
  @ApiProperty()
  total!: number;
}

export class DocumentLibraryMetricsDto {
  @ApiProperty()
  folders!: number;
  @ApiProperty()
  documents!: number;
  @ApiProperty()
  storageBytes!: number;
}

export class DocumentsListResponseDto {
  @ApiProperty({ type: [DocumentFolderDto] })
  folders!: DocumentFolderDto[];
  @ApiProperty({ type: [DocumentDto] })
  documents!: DocumentDto[];
  @ApiProperty({ type: [DocumentFolderDto] })
  breadcrumbs!: DocumentFolderDto[];
  @ApiProperty({ type: DocumentsPageInfoDto })
  pageInfo!: DocumentsPageInfoDto;
  @ApiProperty({ type: DocumentLibraryMetricsDto })
  metrics!: DocumentLibraryMetricsDto;
}

export class DocumentImportItemDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  relativePath!: string;
  @ApiProperty()
  originalName!: string;
  @ApiProperty()
  mimeType!: string;
  @ApiProperty()
  sizeBytes!: number;
  @ApiProperty()
  status!: string;
  @ApiProperty({ nullable: true, type: String })
  error!: string | null;
  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  documentId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  folderId!: string | null;
  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class DocumentImportJobDto {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ nullable: true, type: String, format: "uuid" })
  folderId!: string | null;
  @ApiProperty()
  status!: string;
  @ApiProperty()
  totalFiles!: number;
  @ApiProperty()
  totalBytes!: number;
  @ApiProperty()
  processedFiles!: number;
  @ApiProperty()
  completedFiles!: number;
  @ApiProperty()
  skippedFiles!: number;
  @ApiProperty()
  rejectedFiles!: number;
  @ApiProperty()
  failedFiles!: number;
  @ApiProperty({ nullable: true, type: String })
  lastError!: string | null;
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  completedAt!: string | null;
  @ApiProperty({ type: [DocumentImportItemDto] })
  recentItems!: DocumentImportItemDto[];
}

export class DeleteResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
export type CreateDocumentFolderInput = z.infer<typeof createDocumentFolderSchema>;
export type UpdateDocumentFolderInput = z.infer<typeof updateDocumentFolderSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentBodySchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ReplaceDocumentInput = z.infer<typeof replaceDocumentBodySchema>;
export type BulkDeleteDocumentsInput = z.infer<typeof bulkDeleteDocumentsSchema>;
export type BulkMoveDocumentsInput = z.infer<typeof bulkMoveDocumentsSchema>;
export type CreateDocumentImportJobInput = z.infer<typeof createDocumentImportJobSchema>;
export type UploadDocumentImportItemsInput = z.infer<typeof uploadDocumentImportItemsSchema>;
export type DocumentMimeGroup = z.infer<typeof documentMimeGroupSchema>;
