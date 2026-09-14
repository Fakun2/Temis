import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags
} from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { ActiveTenant } from "../tenancy/active-tenant.decorator";
import { TenantGuard } from "../tenancy/tenant.guard";
import { CaseDocumentUploadRateLimitGuard } from "../cases/guards/case-document-upload-rate-limit.guard";
import {
  BulkDeleteDocumentsDto,
  BulkMoveDocumentsDto,
  CreateDocumentBodyDto,
  CreateDocumentImportJobDto,
  CreateDocumentFolderDto,
  DeleteResponseDto,
  DocumentDto,
  DocumentFolderDto,
  DocumentImportJobDto,
  DocumentsListResponseDto,
  ListDocumentsQueryDto,
  UpdateDocumentDto,
  ReplaceDocumentBodyDto,
  UploadDocumentImportItemsDto,
  UpdateDocumentFolderDto
} from "./documents.schemas";
import {
  DocumentsService,
  isPreviewableDocumentMimeType,
  maxDocumentSizeBytes
} from "./documents.service";

@ApiTags("documents")
@ApiBearerAuth()
@ApiSecurity("tenant")
@Controller("documents")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @Permissions("documents:read")
  @ApiOkResponse({ type: DocumentsListResponseDto })
  list(@ActiveTenant() tenantId: string, @Query() query: ListDocumentsQueryDto) {
    return this.documentsService.list(tenantId, query);
  }

  @Get("folders")
  @Permissions("documents:read")
  @ApiOkResponse({ type: [DocumentFolderDto] })
  listFolders(@ActiveTenant() tenantId: string) {
    return this.documentsService.listFolders(tenantId);
  }

  @Post("folders")
  @Permissions("documents:write")
  @ApiCreatedResponse({ type: DocumentFolderDto })
  createFolder(@ActiveTenant() tenantId: string, @Body() input: CreateDocumentFolderDto) {
    return this.documentsService.createFolder(tenantId, input);
  }

  @Patch("folders/:folderId")
  @Permissions("documents:write")
  @ApiOkResponse({ type: DocumentFolderDto })
  updateFolder(
    @ActiveTenant() tenantId: string,
    @Param("folderId") folderId: string,
    @Body() input: UpdateDocumentFolderDto
  ) {
    return this.documentsService.updateFolder(tenantId, folderId, input);
  }

  @Delete("folders/:folderId")
  @Permissions("documents:write")
  @ApiOkResponse({ type: DeleteResponseDto })
  deleteFolder(@ActiveTenant() tenantId: string, @Param("folderId") folderId: string) {
    return this.documentsService.deleteFolder(tenantId, folderId);
  }

  @Post("imports")
  @Permissions("documents:write")
  @ApiCreatedResponse({ type: DocumentImportJobDto })
  createImportJob(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateDocumentImportJobDto
  ) {
    return this.documentsService.createImportJob(
      tenantId,
      request.user?.sub ?? missingAuthenticatedUser(),
      input
    );
  }

  @Post("imports/:importJobId/items")
  @Permissions("documents:write")
  @UseGuards(CaseDocumentUploadRateLimitGuard)
  @UseInterceptors(
    FilesInterceptor("files", 50, {
      limits: { fileSize: maxDocumentSizeBytes, files: 50 }
    })
  )
  @ApiConsumes("multipart/form-data")
  @ApiOkResponse({ type: DocumentImportJobDto })
  uploadImportItems(
    @ActiveTenant() tenantId: string,
    @Param("importJobId") importJobId: string,
    @Body() body: UploadDocumentImportItemsDto,
    @UploadedFiles() files: Array<{ buffer: Buffer; mimetype: string; originalname: string; size: number }>
  ) {
    return this.documentsService.uploadImportItems(tenantId, importJobId, body, files);
  }

  @Get("imports/:importJobId")
  @Permissions("documents:read")
  @ApiOkResponse({ type: DocumentImportJobDto })
  getImportJob(@ActiveTenant() tenantId: string, @Param("importJobId") importJobId: string) {
    return this.documentsService.getImportJob(tenantId, importJobId);
  }

  @Post("imports/:importJobId/cancel")
  @Permissions("documents:write")
  @ApiOkResponse({ type: DocumentImportJobDto })
  cancelImportJob(@ActiveTenant() tenantId: string, @Param("importJobId") importJobId: string) {
    return this.documentsService.cancelImportJob(tenantId, importJobId);
  }

  @Post()
  @Permissions("documents:write")
  @UseGuards(CaseDocumentUploadRateLimitGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxDocumentSizeBytes } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateDocumentBodyDto })
  @ApiCreatedResponse({ type: DocumentDto })
  create(
    @ActiveTenant() tenantId: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateDocumentBodyDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number }
  ) {
    return this.documentsService.create(
      tenantId,
      request.user?.sub ?? missingAuthenticatedUser(),
      body,
      file
    );
  }

  @Patch(":documentId")
  @Permissions("documents:write")
  @ApiOkResponse({ type: DocumentDto })
  update(
    @ActiveTenant() tenantId: string,
    @Param("documentId") documentId: string,
    @Body() input: UpdateDocumentDto
  ) {
    return this.documentsService.update(tenantId, documentId, input);
  }

  @Post(":documentId/replace")
  @Permissions("documents:write")
  @UseGuards(CaseDocumentUploadRateLimitGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: maxDocumentSizeBytes } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: ReplaceDocumentBodyDto })
  @ApiOkResponse({ type: DocumentDto })
  replace(
    @ActiveTenant() tenantId: string,
    @Param("documentId") documentId: string,
    @Body() body: ReplaceDocumentBodyDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number }
  ) {
    return this.documentsService.replace(tenantId, documentId, body, file);
  }

  @Get(":documentId/preview")
  @Permissions("documents:read")
  async preview(
    @ActiveTenant() tenantId: string,
    @Param("documentId") documentId: string,
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string | number) => void }
  ) {
    const { document, object } = await this.documentsService.readObject(tenantId, documentId);

    response.setHeader("Content-Type", object.contentType ?? document.mimeType);
    if (object.contentLength !== undefined) {
      response.setHeader("Content-Length", object.contentLength);
    }
    response.setHeader(
      "Content-Disposition",
      `${isPreviewableDocumentMimeType(document.mimeType) ? "inline" : "attachment"}; filename="${toDownloadFilename(document.originalName)}"`
    );

    return new StreamableFile(object.body);
  }

  @Get(":documentId/download")
  @Permissions("documents:read")
  async download(
    @ActiveTenant() tenantId: string,
    @Param("documentId") documentId: string,
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string | number) => void }
  ) {
    const { document, object } = await this.documentsService.readObject(tenantId, documentId);

    response.setHeader("Content-Type", object.contentType ?? document.mimeType);
    if (object.contentLength !== undefined) {
      response.setHeader("Content-Length", object.contentLength);
    }
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${toDownloadFilename(document.originalName)}"`
    );

    return new StreamableFile(object.body);
  }

  @Delete(":documentId")
  @Permissions("documents:write")
  @ApiOkResponse({ type: DeleteResponseDto })
  delete(@ActiveTenant() tenantId: string, @Param("documentId") documentId: string) {
    return this.documentsService.delete(tenantId, documentId);
  }

  @Post("bulk-delete")
  @Permissions("documents:write")
  @ApiOkResponse({ type: DeleteResponseDto })
  bulkDelete(@ActiveTenant() tenantId: string, @Body() input: BulkDeleteDocumentsDto) {
    return this.documentsService.bulkDelete(tenantId, input);
  }

  @Post("bulk-move")
  @Permissions("documents:write")
  @ApiOkResponse({ type: DeleteResponseDto })
  bulkMove(@ActiveTenant() tenantId: string, @Body() input: BulkMoveDocumentsDto) {
    return this.documentsService.bulkMove(tenantId, input);
  }
}

function toDownloadFilename(filename: string) {
  return filename.replace(/["\\\r\n]/g, "_");
}

function missingAuthenticatedUser(): never {
  throw new BadRequestException("No se pudo identificar al usuario autenticado.");
}
