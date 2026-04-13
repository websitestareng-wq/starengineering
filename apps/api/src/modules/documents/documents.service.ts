import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { R2Service } from "../../common/services/r2.service";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
  ) {}

  /* ---------------- CATEGORY ---------------- */

  async createCategory(name: string) {
    const value = String(name || "").trim();

    if (!value) {
      throw new BadRequestException("Category name required");
    }

    return this.prisma.documentCategory.create({
      data: { name: value },
    });
  }
async renameCategory(id: string, name: string) {
  const value = String(name || "").trim();

  if (!value) {
    throw new BadRequestException("Category name required");
  }

  const category = await this.prisma.documentCategory.findUnique({
    where: { id },
  });

  if (!category) {
    throw new NotFoundException("Category not found");
  }

  return this.prisma.documentCategory.update({
    where: { id },
    data: { name: value },
  });
}
  async deleteCategory(id: string) {
    const category = await this.prisma.documentCategory.findUnique({
      where: { id },
      include: {
        files: true,
        folders: {
          include: {
            files: true,
            childFolders: {
              include: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    const fileUrls = new Set<string>();

    for (const file of category.files || []) {
      if (file.fileUrl) fileUrls.add(file.fileUrl);
    }

    const collectFolderFiles = (folder: any) => {
      for (const file of folder.files || []) {
        if (file.fileUrl) fileUrls.add(file.fileUrl);
      }

      for (const child of folder.childFolders || []) {
        collectFolderFiles(child);
      }
    };

    for (const folder of category.folders || []) {
      collectFolderFiles(folder);
    }

    await this.prisma.documentCategory.delete({
      where: { id },
    });

    await Promise.allSettled(
      Array.from(fileUrls).map((url) => this.r2Service.deleteFileByUrl(url)),
    );

    return { success: true };
  }

  /* ---------------- FOLDER ---------------- */

  async createFolder(
    name: string,
    categoryId?: string,
    parentFolderId?: string,
  ) {
    const value = String(name || "").trim();

    if (!value) {
      throw new BadRequestException("Folder name required");
    }

    if (parentFolderId) {
      const parent = await this.prisma.documentFolder.findUnique({
        where: { id: parentFolderId },
      });

      if (!parent) {
        throw new BadRequestException("Parent folder not found");
      }

      return this.prisma.documentFolder.create({
        data: {
          name: value,
          categoryId: parent.categoryId || null,
          parentFolderId: parent.id,
        },
      });
    }

    if (categoryId) {
      const category = await this.prisma.documentCategory.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new BadRequestException("Category not found");
      }
    }

    return this.prisma.documentFolder.create({
      data: {
        name: value,
        categoryId: categoryId || null,
        parentFolderId: null,
      },
    });
  }
async renameFolder(id: string, name: string) {
  const value = String(name || "").trim();

  if (!value) {
    throw new BadRequestException("Folder name required");
  }

  const folder = await this.prisma.documentFolder.findUnique({
    where: { id },
  });

  if (!folder) {
    throw new NotFoundException("Folder not found");
  }

  return this.prisma.documentFolder.update({
    where: { id },
    data: { name: value },
  });
}
  async deleteFolder(id: string) {
    const folder = await this.prisma.documentFolder.findUnique({
      where: { id },
      include: {
        files: true,
        childFolders: {
          include: {
            files: true,
            childFolders: {
              include: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException("Folder not found");
    }

    const fileUrls = new Set<string>();

    const collectFolderFiles = (current: any) => {
      for (const file of current.files || []) {
        if (file.fileUrl) fileUrls.add(file.fileUrl);
      }

      for (const child of current.childFolders || []) {
        collectFolderFiles(child);
      }
    };

    collectFolderFiles(folder);

    await this.prisma.documentFolder.delete({
      where: { id },
    });

    await Promise.allSettled(
      Array.from(fileUrls).map((url) => this.r2Service.deleteFileByUrl(url)),
    );

    return { success: true };
  }

  /* ---------------- FILES ---------------- */

  async uploadFiles(
    files: Express.Multer.File[],
    categoryId?: string,
    folderId?: string,
  ) {
    if (!files?.length) {
      throw new BadRequestException("No files");
    }

    let resolvedCategoryId: string | null = categoryId || null;
    let resolvedFolderId: string | null = folderId || null;

    if (resolvedFolderId) {
      const folder = await this.prisma.documentFolder.findUnique({
        where: { id: resolvedFolderId },
      });

      if (!folder) {
        throw new BadRequestException("Folder not found");
      }

      resolvedCategoryId = folder.categoryId || null;
    } else if (resolvedCategoryId) {
      const category = await this.prisma.documentCategory.findUnique({
        where: { id: resolvedCategoryId },
      });

      if (!category) {
        throw new BadRequestException("Category not found");
      }
    }

    const created: any[] = [];

    for (const file of files) {
      const optimized = await this.optimizeFile(file);

      const upload = await this.r2Service.uploadBuffer({
        buffer: optimized.buffer,
        fileName: optimized.fileName,
        contentType: optimized.mimeType,
      });

      const row = await this.prisma.documentFile.create({
        data: {
          name: this.getFileBaseName(file.originalname),
          originalName: file.originalname,
          fileName: optimized.fileName,
          fileUrl: upload.url,
          r2Key: upload.key,
          mimeType: optimized.mimeType,
          sizeInBytes: optimized.buffer.length,
          categoryId: resolvedCategoryId,
          folderId: resolvedFolderId,
        },
      });

      created.push(row);
    }

    return created;
  }

  async deleteFile(id: string) {
    const file = await this.prisma.documentFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    if (file.fileUrl) {
      await this.r2Service
        .deleteFileByUrl(file.fileUrl)
        .catch(() => undefined);
    }

    await this.prisma.documentFile.delete({
      where: { id },
    });

    return { success: true };
  }

  async download(id: string) {
    const file = await this.prisma.documentFile.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    const buffer = await this.r2Service.downloadFileByUrl(file.fileUrl);

    return {
      fileName: file.originalName || file.fileName || "document",
      mimeType: file.mimeType || "application/octet-stream",
      buffer,
    };
  }

  /* ---------------- TREE ---------------- */

  async getTree() {
    const categories = await this.prisma.documentCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        files: {
          orderBy: { createdAt: "desc" },
        },
        folders: {
          where: {
            parentFolderId: null,
          },
          orderBy: { name: "asc" },
          include: {
            files: {
              orderBy: { createdAt: "desc" },
            },
            childFolders: {
              orderBy: { name: "asc" },
              include: {
                files: {
                  orderBy: { createdAt: "desc" },
                },
                childFolders: {
                  orderBy: { name: "asc" },
                  include: {
                    files: {
                      orderBy: { createdAt: "desc" },
                    },
                    childFolders: {
                      orderBy: { name: "asc" },
                      include: {
                        files: {
                          orderBy: { createdAt: "desc" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const rootFiles = await this.prisma.documentFile.findMany({
      where: {
        categoryId: null,
        folderId: null,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      rootFiles,
      categories,
    };
  }

  /* ---------------- UTIL ---------------- */

  private getFileBaseName(name: string) {
    return String(name || "file")
      .replace(/\.[^.]+$/, "")
      .trim();
  }

  private async optimizeFile(file: Express.Multer.File) {
    const originalName = file.originalname;

    if (this.isPdf(file)) {
      const compressed = await this.compressPdfBufferStrong(file.buffer);

      return {
        buffer: compressed,
        fileName: this.ensureExtension(originalName, ".pdf"),
        mimeType: "application/pdf",
      };
    }

    return {
      buffer: file.buffer,
      fileName: originalName,
      mimeType: file.mimetype || "application/octet-stream",
    };
  }

  private isPdf(file: Express.Multer.File) {
    return (
      String(file.mimetype || "").includes("pdf") ||
      String(file.originalname || "").toLowerCase().endsWith(".pdf")
    );
  }

  private ensureExtension(fileName: string, ext: string) {
    if (fileName.toLowerCase().endsWith(ext)) return fileName;
    return `${fileName}${ext}`;
  }

  private async compressPdfBufferStrong(buffer: Buffer): Promise<Buffer> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-pdf-"));
    const inputPath = path.join(tempDir, "input.pdf");
    const outputPath = path.join(tempDir, "output.pdf");

    try {
      await fs.writeFile(inputPath, buffer);

      const gsBinary =
        process.platform === "win32"
          ? "C:\\Program Files\\gs\\gs10.07.0\\bin\\gswin64c.exe"
          : "gs";

      await execFileAsync(gsBinary, [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dPDFSETTINGS=/screen",
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
        "-dSubsetFonts=true",
        "-dDownsampleColorImages=true",
        "-dColorImageDownsampleType=/Bicubic",
        "-dColorImageResolution=110",
        "-dDownsampleGrayImages=true",
        "-dGrayImageDownsampleType=/Bicubic",
        "-dGrayImageResolution=110",
        "-dDownsampleMonoImages=true",
        "-dMonoImageDownsampleType=/Subsample",
        "-dMonoImageResolution=110",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${outputPath}`,
        inputPath,
      ]);

      const compressed = await fs.readFile(outputPath);

      if (!compressed.length) return buffer;

      return compressed.length < buffer.length ? compressed : buffer;
    } catch {
      return buffer;
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}