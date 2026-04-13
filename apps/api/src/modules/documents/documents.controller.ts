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
  Res,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /* ---------------- TREE ---------------- */

  @Get("tree")
  getTree() {
    return this.documentsService.getTree();
  }

  /* ---------------- CATEGORY ---------------- */

  @Post("categories")
createCategory(@Body("name") name: string) {
  return this.documentsService.createCategory(String(name || "").trim());
}

@Patch("categories/:id")
renameCategory(@Param("id") id: string, @Body("name") name: string) {
  return this.documentsService.renameCategory(id, String(name || "").trim());
}

@Delete("categories/:id")
deleteCategory(@Param("id") id: string) {
  return this.documentsService.deleteCategory(id);
}

  /* ---------------- FOLDER ---------------- */

 @Post("folders")
createFolder(
  @Body("name") name: string,
  @Body("categoryId") categoryId?: string,
  @Body("parentFolderId") parentFolderId?: string,
) {
  return this.documentsService.createFolder(
    String(name || "").trim(),
    categoryId ? String(categoryId).trim() : undefined,
    parentFolderId ? String(parentFolderId).trim() : undefined,
  );
}

@Patch("folders/:id")
renameFolder(@Param("id") id: string, @Body("name") name: string) {
  return this.documentsService.renameFolder(id, String(name || "").trim());
}

@Delete("folders/:id")
deleteFolder(@Param("id") id: string) {
  return this.documentsService.deleteFolder(id);
}
  /* ---------------- FILE UPLOAD ---------------- */

  @Post("files")
  @UseInterceptors(
    FilesInterceptor("files", 50, {
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024,
        files: 50,
      },
    }),
  )
  uploadFiles(
    @Body("categoryId") categoryId: string | undefined,
    @Body("folderId") folderId: string | undefined,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) {
      throw new BadRequestException("At least one file is required.");
    }

    return this.documentsService.uploadFiles(
      files,
      categoryId ? String(categoryId).trim() : undefined,
      folderId ? String(folderId).trim() : undefined,
    );
  }

  /* ---------------- FILE DELETE ---------------- */

  @Delete("files/:id")
  deleteFile(@Param("id") id: string) {
    return this.documentsService.deleteFile(id);
  }

  /* ---------------- FILE DOWNLOAD ---------------- */

  @Get("files/:id/download")
  async downloadFile(@Param("id") id: string, @Res() res: Response) {
    const file = await this.documentsService.download(id);

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.fileName}"`,
    );

    return res.send(file.buffer);
  }
}