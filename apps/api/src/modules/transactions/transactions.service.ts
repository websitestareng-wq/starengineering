import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BillAllocationType,
  EntrySide,
  Prisma,
  TransactionType,
} from "@prisma/client";
const { PDFParse } = require("pdf-parse");
import { PrismaService } from "../../prisma/prisma.service";
import { R2Service } from "../../common/services/r2.service";
import { TransactionsEmailService } from "./transactions-email.service";
import {
  CreateTransactionDto,
  TransactionTypeDto,
} from "./dto/create-transaction.dto";
import {
  EntrySideDto,
  TransactionBillRowDto,
} from "./dto/transaction-bill-row.dto";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import PDFDocumentKit = require("pdfkit");

const pdfParseModule = require("pdf-parse");
import { PDFDocument } from "pdf-lib";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const pdfParse: ((buffer: Buffer) => Promise<{ text?: string }>) | undefined =
  typeof pdfParseModule === "function"
    ? pdfParseModule
    : typeof pdfParseModule?.default === "function"
      ? pdfParseModule.default
      : undefined;

type OpenRefRow = {
  id: string;
  transactionId: string;
  voucherNo: string;
  voucherDate: Date;
  transactionType: TransactionType;
  allocationType: BillAllocationType;
  side: EntrySide;
  refNo: string | null;
  originalAmount: number;
  settledAmount: number;
  pendingAmount: number;
};

type TransactionUploadInput = {
  mainDocument?: Express.Multer.File | null;
  attachments?: Express.Multer.File[];
  removeAttachmentIds?: string[];
};

type ParsedTransactionDocument = {
  fileName: string;
  detectedType: TransactionTypeDto | null;
  detectedSide: "DR" | "CR" | null;
  voucherNo: string;
  voucherDate: string;
  amount: number | null;
  partyName: string;
  partyGstin: string;
  matchedParty: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    gstin: string | null;
  } | null;
  particulars: string;
  textPreview: string;
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly transactionsEmailService: TransactionsEmailService,
  ) {}

  async parseMainDocument(file: Express.Multer.File | null) {
    this.assertPdfFile(file);

    const parsed = await this.extractDocumentData(file as Express.Multer.File);

    return {
      success: true,
      data: parsed,
    };
  }

  async findAll(query: QueryTransactionsDto) {
    const where: Prisma.TransactionWhereInput = {
      ...(query.partyId ? { partyId: query.partyId } : {}),
      ...(query.type ? { type: query.type as TransactionType } : {}),
      ...(query.from || query.to
        ? {
            voucherDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: this.endOfDay(query.to) } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { voucherNo: { contains: query.q, mode: "insensitive" } } as any,
              {
                particulars: { contains: query.q, mode: "insensitive" },
              } as any,
              {
                party: { name: { contains: query.q, mode: "insensitive" } },
              } as any,
              {
                billRows: {
                  some: {
                    refNo: { contains: query.q, mode: "insensitive" },
                  },
                },
              } as any,
            ],
          }
        : {}),
    };

    return this.prisma.transaction.findMany({
      where,
      orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
      include: {
        party: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        billRows: {
          include: {
            againstBillRow: {
              select: {
                id: true,
                refNo: true,
                side: true,
                allocationType: true,
                transaction: {
                  select: {
                    id: true,
                    voucherNo: true,
                    voucherDate: true,
                    type: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        party: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            gstin: true,
            pan: true,
            address: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        billRows: {
          include: {
            againstBillRow: {
              select: {
                id: true,
                refNo: true,
                side: true,
                allocationType: true,
                transaction: {
                  select: {
                    id: true,
                    voucherNo: true,
                    voucherDate: true,
                    type: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found.");
    }

    return transaction;
  }

  async create(dto: CreateTransactionDto, uploads?: TransactionUploadInput) {
    const normalizedDto = this.cloneCreateDto(dto);

    if (uploads?.mainDocument) {
      const parsed = await this.extractDocumentData(uploads.mainDocument);
      this.applyParsedDataToCreateDto(normalizedDto, parsed);
    }

    await this.ensurePartyExists(normalizedDto.partyId);
    this.assertTransactionSide(normalizedDto.type, normalizedDto.side);
    this.normalizeBillRowSides(normalizedDto.billRows, normalizedDto.side);
    this.validateBillRowsPresent(normalizedDto.billRows);
    this.validateVoucherAgainstBillRows(
      normalizedDto.side,
      normalizedDto.amount,
      normalizedDto.billRows,
    );

    const againstTargets =
      await this.loadAgainstTargetsForCreate(normalizedDto);
    this.validateAgainstRefRows(normalizedDto.billRows, againstTargets);

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          voucherNo: normalizedDto.voucherNo.trim(),
          voucherDate: new Date(normalizedDto.voucherDate),
          type: normalizedDto.type as TransactionType,
          side: normalizedDto.side as EntrySide,
          amount: this.toDecimal(normalizedDto.amount),
          particulars: normalizedDto.particulars.trim(),
          sendEmail: normalizedDto.sendEmail ?? false,
          partyId: normalizedDto.partyId,
          createdById: normalizedDto.createdById ?? null,
          billRows: {
            create: normalizedDto.billRows.map((row) => ({
              allocationType: row.allocationType as BillAllocationType,
              side: this.getNormalizedRowSide(
                row.allocationType as BillAllocationType,
                normalizedDto.side as EntrySide,
                againstTargets.get(String(row.againstBillRowId || "").trim()),
              ),
              refNo: this.normalizeRefNo(row),
              amount: this.toDecimal(row.amount),
              againstBillRowId:
                row.allocationType === "AGAINST_REF"
                  ? String(row.againstBillRowId || "").trim()
                  : null,
            })),
          },
        },
      });

      return tx.transaction.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          party: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          billRows: {
            include: {
              againstBillRow: {
                select: {
                  id: true,
                  refNo: true,
                  side: true,
                  allocationType: true,
                  transaction: {
                    select: {
                      id: true,
                      voucherNo: true,
                      voucherDate: true,
                      type: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          attachments: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    await this.rebuildMergedAttachment(result.id, uploads);
    await this.transactionsEmailService.sendIfEnabled(result.id);

    return this.findOne(result.id);
  }

  async update(
    id: string,
    dto: UpdateTransactionDto,
    uploads?: TransactionUploadInput,
  ) {
    const existing = await this.prisma.transaction.findUnique({
  where: { id },
  include: {
    billRows: true,
    attachments: true,
  },
});

    if (!existing) {
      throw new NotFoundException("Transaction not found.");
    }
   const hasAttachmentChanges =
  !!uploads?.mainDocument ||
  !!uploads?.attachments?.length ||
  !!uploads?.removeAttachmentIds?.length;

const existingVoucherDate = existing.voucherDate.toISOString().slice(0, 10);

const existingBillRowsComparable = JSON.stringify(
  (existing.billRows || []).map((row) => ({
    allocationType: row.allocationType,
    side: row.side,
    refNo: row.refNo ?? "",
    againstBillRowId: row.againstBillRowId ?? "",
    amount: this.parsePositiveAmount(row.amount),
  })),
);

const incomingBillRowsComparable =
  dto.billRows === undefined
    ? existingBillRowsComparable
    : JSON.stringify(
        (dto.billRows || []).map((row) => ({
          allocationType: row.allocationType,
          side: row.side,
          refNo: row.refNo ?? "",
          againstBillRowId: row.againstBillRowId ?? "",
          amount: this.parsePositiveAmount(row.amount),
        })),
      );

const hasCoreFieldChanges =
  (dto.voucherNo !== undefined &&
    String(dto.voucherNo).trim() !== String(existing.voucherNo).trim()) ||
  (dto.voucherDate !== undefined &&
    String(dto.voucherDate).trim() !== existingVoucherDate) ||
  (dto.type !== undefined &&
    String(dto.type) !== String(existing.type)) ||
  (dto.side !== undefined &&
    String(dto.side) !== String(existing.side)) ||
  (dto.amount !== undefined &&
    this.parsePositiveAmount(dto.amount) !== this.parsePositiveAmount(existing.amount)) ||
  (dto.particulars !== undefined &&
    String(dto.particulars).trim() !== String(existing.particulars || "").trim()) ||
  (dto.partyId !== undefined &&
    String(dto.partyId).trim() !== String(existing.partyId).trim()) ||
  incomingBillRowsComparable !== existingBillRowsComparable;

const hasMetaOnlyChanges =
  (dto.sendEmail !== undefined && dto.sendEmail !== existing.sendEmail) ||
  (dto.createdById !== undefined &&
    String(dto.createdById || "").trim() !==
      String(existing.createdById || "").trim());

const hasOnlySafeChanges =
  !hasCoreFieldChanges &&
  (hasAttachmentChanges || hasMetaOnlyChanges);

const hasDownstreamAdjustments = await this.hasDownstreamAdjustments(id);

if (hasDownstreamAdjustments && !hasOnlySafeChanges) {
  throw new BadRequestException(
    "This transaction has already been adjusted in later entries. Edit is blocked to protect settlement integrity.",
  );
}
    const parsed = uploads?.mainDocument
      ? await this.extractDocumentData(uploads.mainDocument)
      : null;

    const nextPartyId =
      dto.partyId ?? parsed?.matchedParty?.id ?? existing.partyId;

    const nextType = (
      dto.type ??
      parsed?.detectedType ??
      existing.type
    ) as TransactionTypeDto;

    const nextSide = (
      dto.side ??
      parsed?.detectedSide ??
      existing.side
    ) as EntrySideDto;

    const nextAmount = dto.amount ?? parsed?.amount ?? Number(existing.amount);

    const nextVoucherDate =
      dto.voucherDate ??
      parsed?.voucherDate ??
      existing.voucherDate.toISOString().slice(0, 10);

    const nextVoucherNo =
      dto.voucherNo ??
      parsed?.voucherNo ??
      existing.voucherNo;

    const nextParticulars =
      dto.particulars ??
      (parsed?.particulars ? parsed.particulars : undefined) ??
      existing.particulars;

    const nextSendEmail = dto.sendEmail ?? existing.sendEmail;
    const nextCreatedById =
      dto.createdById ?? existing.createdById ?? undefined;

    const nextBillRows: TransactionBillRowDto[] =
  dto.billRows ??
  existing.billRows.map((row) => ({
    allocationType: row.allocationType as any,
    side: row.side as any,
    refNo: row.refNo ?? undefined,
    againstBillRowId: row.againstBillRowId ?? undefined,
    amount: this.parsePositiveAmount(row.amount),
  }));

    await this.ensurePartyExists(nextPartyId);
    this.assertTransactionSide(nextType, nextSide);
    this.normalizeBillRowSides(nextBillRows, nextSide);
    this.validateBillRowsPresent(nextBillRows);
    this.validateVoucherAgainstBillRows(nextSide, nextAmount, nextBillRows);

    const againstTargets = await this.loadAgainstTargetsForUpdate(
      id,
      nextPartyId,
      nextVoucherDate,
      nextBillRows,
    );

    this.validateAgainstRefRows(nextBillRows, againstTargets);

    await this.prisma.$transaction(async (tx) => {
      await tx.transactionBillRow.deleteMany({
        where: { transactionId: id },
      });

      await tx.transaction.update({
        where: { id },
        data: {
          voucherNo: String(nextVoucherNo).trim(),
          voucherDate: new Date(nextVoucherDate),
          type: nextType as TransactionType,
          side: nextSide as EntrySide,
          amount: this.toDecimal(nextAmount),
          particulars: String(nextParticulars).trim(),
          sendEmail: nextSendEmail,
          partyId: nextPartyId,
          createdById: nextCreatedById ?? null,
        },
      });

      await Promise.all(
        nextBillRows.map((row) =>
          tx.transactionBillRow.create({
            data: {
              transactionId: id,
              allocationType: row.allocationType as BillAllocationType,
              side: this.getNormalizedRowSide(
                row.allocationType as BillAllocationType,
                nextSide as EntrySide,
                againstTargets.get(String(row.againstBillRowId || "").trim()),
              ),
              refNo: this.normalizeRefNo(row),
              amount: this.toDecimal(row.amount),
              againstBillRowId:
                row.allocationType === "AGAINST_REF"
                  ? String(row.againstBillRowId || "").trim()
                  : null,
            },
          }),
        ),
      );
    });

        await this.removeSelectedAttachments(
      id,
      uploads?.removeAttachmentIds || [],
    );

    await this.rebuildMergedAttachment(id, uploads);
    await this.transactionsEmailService.sendIfEnabled(id);

    return this.findOne(id);
  }

   async remove(id: string) {
    const existing = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        billRows: true,
        attachments: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("Transaction not found.");
    }

    const attachmentUrls = (existing.attachments || [])
      .map((item) => String(item.fileUrl || "").trim())
      .filter(Boolean);

    await this.prisma.transaction.delete({
      where: { id },
    });

    await Promise.allSettled(
      attachmentUrls.map((fileUrl) => this.r2Service.deleteFileByUrl(fileUrl)),
    );

    return { success: true };
  }

  async getOpenRefs(partyId: string, asOf?: string) {
    await this.ensurePartyExists(partyId);

    const openRows = await this.prisma.transactionBillRow.findMany({
      where: {
        transaction: {
          partyId,
          ...(asOf
            ? {
                voucherDate: {
                  lte: this.endOfDay(asOf),
                },
              }
            : {}),
        },
        allocationType: {
          in: [BillAllocationType.NEW_REF, BillAllocationType.ADVANCE],
        },
      },
      include: {
        transaction: {
          select: {
            id: true,
            voucherNo: true,
            voucherDate: true,
            type: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    if (openRows.length === 0) {
      return [];
    }

    const openRowIds = openRows.map((row) => row.id);

    const againstRows = await this.prisma.transactionBillRow.findMany({
      where: {
        againstBillRowId: {
          in: openRowIds,
        },
        transaction: {
          partyId,
          ...(asOf
            ? {
                voucherDate: {
                  lte: this.endOfDay(asOf),
                },
              }
            : {}),
        },
        allocationType: BillAllocationType.AGAINST_REF,
      },
      select: {
        id: true,
        againstBillRowId: true,
        amount: true,
        transactionId: true,
      },
    });

    const settledMap = new Map<string, number>();

    for (const row of againstRows) {
      const key = String(row.againstBillRowId || "");
      const nextValue = (settledMap.get(key) ?? 0) + Number(row.amount || 0);
      settledMap.set(key, this.round2(nextValue));
    }

    const mapped: OpenRefRow[] = openRows
      .map((row) => {
        const originalAmount = Number(row.amount || 0);
        const settledAmount = this.round2(settledMap.get(row.id) ?? 0);
        const pendingAmount = this.round2(originalAmount - settledAmount);

        return {
          id: row.id,
          transactionId: row.transactionId,
          voucherNo: row.transaction.voucherNo,
          voucherDate: row.transaction.voucherDate,
          transactionType: row.transaction.type,
          allocationType: row.allocationType,
          side: row.side,
          refNo: row.refNo,
          originalAmount,
          settledAmount,
          pendingAmount,
        };
      })
      .filter((row) => row.pendingAmount > 0);

    return mapped;
  }
private async rebuildMergedAttachment(
  transactionId: string,
  uploads?: TransactionUploadInput,
) {
  const existing = await this.prisma.transactionAttachment.findMany({
    where: { transactionId },
  });

  // delete old files
  await Promise.all(
    existing.map((a) => this.r2Service.deleteFileByUrl(a.fileUrl)),
  );

  await this.prisma.transactionAttachment.deleteMany({
    where: { transactionId },
  });

  const files: Express.Multer.File[] = [];

  if (uploads?.mainDocument) files.push(uploads.mainDocument);
  if (uploads?.attachments?.length) files.push(...uploads.attachments);

  if (!files.length) return;

  // merge
  const merged = await PDFDocument.create();

  for (const file of files) {
    const pdf = await PDFDocument.load(file.buffer);
    const pages = await merged.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  const mergedBytes = await merged.save({
    useObjectStreams: true,
  });
const compressedBuffer = await this.compressPdfBuffer(
  Buffer.from(mergedBytes),
);
  const mergedFileName = uploads?.mainDocument?.originalname?.trim()
  ? uploads.mainDocument.originalname.trim()
  : "Voucher.pdf";

const upload = await this.r2Service.uploadBuffer({
  buffer: compressedBuffer,
  fileName: mergedFileName,
  contentType: "application/pdf",
});

await this.prisma.transactionAttachment.create({
  data: {
    transactionId,
    fileName: mergedFileName,
    fileUrl: upload.url,
    mimeType: "application/pdf",
    sizeInBytes: compressedBuffer.length,
  },
});
}
    private async removeSelectedAttachments(
    transactionId: string,
    removeAttachmentIds: string[],
  ) {
    const ids = Array.from(
      new Set(
        (removeAttachmentIds || [])
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    );

    if (ids.length === 0) {
      return;
    }

    const attachments = await this.prisma.transactionAttachment.findMany({
      where: {
        transactionId,
        id: { in: ids },
      },
    });

    if (!attachments.length) {
      return;
    }

    await this.prisma.transactionAttachment.deleteMany({
      where: {
        transactionId,
        id: { in: attachments.map((item) => item.id) },
      },
    });

    await Promise.allSettled(
      attachments
        .map((item) => String(item.fileUrl || "").trim())
        .filter(Boolean)
        .map((fileUrl) => this.r2Service.deleteFileByUrl(fileUrl)),
    );
  }

  private cloneCreateDto(dto: CreateTransactionDto): CreateTransactionDto {
  return {
    ...dto,
    voucherNo: String(dto.voucherNo || ""),
    voucherDate: String(dto.voucherDate || ""),
    type: dto.type,
    side: dto.side,
    amount: this.parsePositiveAmount(dto.amount),
    particulars: String(dto.particulars || ""),
    sendEmail: dto.sendEmail ?? false,
    partyId: String(dto.partyId || ""),
    createdById: dto.createdById ? String(dto.createdById) : undefined,
    billRows: Array.isArray(dto.billRows)
      ? dto.billRows.map((row) => ({
          allocationType: row.allocationType,
          side: row.side,
          refNo: row.refNo,
          againstBillRowId: row.againstBillRowId,
          amount: this.parsePositiveAmount(row.amount),
        }))
      : [],
  };
}

  private applyParsedDataToCreateDto(
    dto: CreateTransactionDto,
    parsed: ParsedTransactionDocument,
  ) {
    if (!dto.type && parsed.detectedType) {
      dto.type = parsed.detectedType;
    }

    if (!dto.side && parsed.detectedSide) {
      dto.side = parsed.detectedSide as EntrySideDto;
    }

    if (!String(dto.voucherNo || "").trim() && parsed.voucherNo) {
      dto.voucherNo = parsed.voucherNo;
    }

    if (!String(dto.voucherDate || "").trim() && parsed.voucherDate) {
      dto.voucherDate = parsed.voucherDate;
    }

    if ((!dto.amount || Number(dto.amount) <= 0) && parsed.amount) {
      dto.amount = parsed.amount;
    }

    if (!String(dto.partyId || "").trim() && parsed.matchedParty?.id) {
      dto.partyId = parsed.matchedParty.id;
    }

    if (!String(dto.particulars || "").trim() && parsed.particulars) {
      dto.particulars = parsed.particulars;
    }
  }

private async extractDocumentData(
  file: Express.Multer.File,
): Promise<ParsedTransactionDocument> {
  this.assertPdfFile(file);

  if (!PDFParse) {
    throw new BadRequestException(
      "PDF parser is not available. Please reinstall pdf-parse.",
    );
  }

  const parser = new PDFParse({
    data: file.buffer,
  });

  let parsedText = "";

  try {
    const result = await parser.getText();
    parsedText =
      typeof result === "string"
        ? result
        : typeof result?.text === "string"
          ? result.text
          : "";
  } finally {
    if (typeof parser.destroy === "function") {
      await parser.destroy().catch(() => undefined);
    }
  }

  const text = this.cleanPdfText(parsedText || "");
  const fileName = file.originalname || "document.pdf";

  const detectedType = this.detectTransactionType(text, fileName);
  const detectedSide = detectedType
    ? this.getExpectedSide(detectedType)
    : null;

  const voucherNo = this.extractVoucherNo(text, fileName, detectedType);
  const voucherDate = this.extractVoucherDate(text);
  const amount = this.extractAmount(text, detectedType);
  const partyName = this.extractPartyName(text, detectedType);
  const partyGstin = this.extractPartyGstin(text, detectedType);

  const matchedParty =
    (partyGstin
      ? await this.matchPartyByGstinOrName(partyGstin, partyName)
      : null) || (partyName ? await this.matchPartyByGstinOrName("", partyName) : null);

  const particulars = this.buildParticulars({
    detectedType,
    voucherNo,
    partyName: matchedParty?.name || partyName,
  });

  return {
    fileName,
    detectedType,
    detectedSide,
    voucherNo,
    voucherDate,
    amount,
    partyName,
    partyGstin,
    matchedParty,
    particulars,
    textPreview: text.slice(0, 1200),
  };
}

  private assertPdfFile(file: Express.Multer.File | null | undefined) {
    if (!file) {
      throw new BadRequestException("Main PDF document is required.");
    }

    const name = file.originalname || "";
    const mime = file.mimetype || "";

    const isPdf =
      mime.toLowerCase().includes("pdf") || name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      throw new BadRequestException("Only PDF is allowed for main document.");
    }
  }

  private cleanPdfText(text: string) {
    return text
      .replace(/\r/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[^\S\n]{2,}/g, " ")
      .trim();
  }

  private detectTransactionType(
    text: string,
    fileName: string,
  ): TransactionTypeDto | null {
    const source = `${fileName}\n${text}`.toUpperCase();

    if (source.includes("CREDIT NOTE") || source.includes("SALES RETURN")) {
      return TransactionTypeDto.CREDIT_NOTE;
    }

    if (source.includes("DEBIT NOTE") || source.includes("PURCHASE RETURN")) {
      return TransactionTypeDto.DEBIT_NOTE;
    }

    if (source.includes("PAYMENT VOUCHER") || source.includes("PAYMENT ADVICE")) {
      return TransactionTypeDto.PAYMENT;
    }

    if (source.includes("RECEIPT VOUCHER")) {
      return TransactionTypeDto.RECEIPT;
    }

    if (source.includes("SUPPLIER INVOICE RECORD COPY")) {
      return TransactionTypeDto.PURCHASE;
    }

    if (source.includes("TAX INVOICE")) {
      return TransactionTypeDto.SALES;
    }

    const upperName = fileName.toUpperCase();

    if (upperName.includes("CREDIT")) return TransactionTypeDto.CREDIT_NOTE;
    if (upperName.includes("DEBIT")) return TransactionTypeDto.DEBIT_NOTE;
    if (upperName.includes("PAYMENT")) return TransactionTypeDto.PAYMENT;
    if (upperName.includes("RECEIPT")) return TransactionTypeDto.RECEIPT;
    if (upperName.includes("PURCHASE")) return TransactionTypeDto.PURCHASE;
    if (upperName.includes("SALES")) return TransactionTypeDto.SALES;

    return null;
  }

  private extractVoucherNo(
    text: string,
    fileName: string,
    detectedType: TransactionTypeDto | null,
  ) {
    const patterns: RegExp[] = [];

    switch (detectedType) {
      case TransactionTypeDto.CREDIT_NOTE:
        patterns.push(/Credit Note No\.\s*([\s\S]{0,20}?)([A-Z0-9/-]+)/i);
        break;
      case TransactionTypeDto.DEBIT_NOTE:
        patterns.push(/Debit Note No\.\s*([\s\S]{0,20}?)([A-Z0-9/-]+)/i);
        break;
      case TransactionTypeDto.RECEIPT:
        patterns.push(/Receipt Voucher\s*No\.\s*:\s*([A-Z0-9/-]+)/i);
        break;
      case TransactionTypeDto.PAYMENT:
        patterns.push(/Payment Voucher\s*No\.\s*:\s*([A-Z0-9/-]+)/i);
        break;
      case TransactionTypeDto.PURCHASE:
      case TransactionTypeDto.SALES:
      default:
        patterns.push(
          /Invoice No\.\s*(?:e-Way Bill No\.)?\s*([\s\S]{0,30}?)([A-Z0-9/-]+)/i,
        );
        break;
    }

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const value = match?.[2] || match?.[1] || "";
      const cleaned = String(value).trim().replace(/\s+/g, "");
      if (cleaned) {
        return cleaned;
      }
    }

    const fallbackFromFile = this.extractVoucherNoFromFileName(fileName);
    if (fallbackFromFile) {
      return fallbackFromFile;
    }

    return "";
  }

  private extractVoucherNoFromFileName(fileName: string) {
    const base = fileName.replace(/\.[^.]+$/, "").trim();
    if (!base) return "";

    const parts = base.split("_").filter(Boolean);
    const candidate = parts.length > 1 ? parts[parts.length - 1] : base;

    return candidate.trim();
  }

  private extractVoucherDate(text: string) {
    const patterns = [
      /Ack Date\s*:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4})/i,
      /Dated\s*[:.]?\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4})/i,
      /Date\s*:\s*([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2,4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const value = match?.[1];
      if (!value) continue;

      const iso = this.parseLooseDateToIso(value);
      if (iso) return iso;
    }

    return "";
  }

  private parseLooseDateToIso(value: string) {
    const match = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
    if (!match) return "";

    const day = Number(match[1]);
    const monthShort = match[2].toLowerCase();
    const yearRaw = match[3];

    const monthMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const month = monthMap[monthShort];
    if (month === undefined) return "";

    const year =
      yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);

    const date = new Date(Date.UTC(year, month, day));
    if (Number.isNaN(date.getTime())) return "";

    return `${year.toString().padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  private extractAmount(
    text: string,
    detectedType: TransactionTypeDto | null,
  ): number | null {
    const candidates: number[] = [];

    const patterns = [
      /Nett Amount[^\n\r]*?([\d,]+\.\d{2})/gi,
      /Total[^\n\r]*?([\d,]+\.\d{2})/gi,
      /Amount \(in words\)[\s\S]{0,80}?([\d,]+\.\d{2})/gi,
      /[₹ī]\s*([\d,]+\.\d{2})/gi,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const amount = this.parseAmount(match[1]);
        if (amount > 0) {
          candidates.push(amount);
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    if (
      detectedType === TransactionTypeDto.RECEIPT ||
      detectedType === TransactionTypeDto.PAYMENT
    ) {
      return candidates[candidates.length - 1] ?? null;
    }

    return Math.max(...candidates);
  }

  private parseAmount(value: string) {
    const numeric = Number(String(value).replace(/,/g, "").trim());
    if (!Number.isFinite(numeric)) return 0;
    return this.round2(numeric);
  }

  private extractPartyName(
    text: string,
    detectedType: TransactionTypeDto | null,
  ) {
    const patterns: RegExp[] = [];

    if (detectedType === TransactionTypeDto.PURCHASE) {
      patterns.push(
        /Supplier \(Bill from\)\s*([\s\S]{0,140}?)(?:GSTIN|State Name|Contact|E-Mail|Invoice No\.)/i,
      );
    } else if (detectedType === TransactionTypeDto.DEBIT_NOTE) {
      patterns.push(
        /Buyer \(Bill to\)\s*([\s\S]{0,140}?)(?:GSTIN|State Name|Contact|E-Mail|Debit Note No\.)/i,
      );
      patterns.push(
        /Consignee \(Ship to\)\s*([\s\S]{0,140}?)(?:GSTIN|State Name|Contact|E-Mail|Debit Note No\.)/i,
      );
    } else if (detectedType === TransactionTypeDto.CREDIT_NOTE) {
      patterns.push(
        /Buyer \(Bill to\)\s*([\s\S]{0,140}?)(?:GSTIN|Contact|E-Mail|Credit Note No\.)/i,
      );
      patterns.push(
        /Consignee \(Ship to\)\s*([\s\S]{0,140}?)(?:GSTIN|Contact|E-Mail|Credit Note No\.)/i,
      );
    } else if (detectedType === TransactionTypeDto.RECEIPT) {
      patterns.push(
        /Account\s*:\s*([\s\S]{0,80}?)(?:\n|Agst Ref|Bank Transaction Details)/i,
      );
    } else if (detectedType === TransactionTypeDto.PAYMENT) {
      patterns.push(
        /Account\s*:\s*([\s\S]{0,80}?)(?:\n|Agst Ref|Bank Transaction Details)/i,
      );
      patterns.push(
        /Payment Advice\s*[\s\S]{0,20}?M\/s\.\s*([\s\S]{0,100}?)(?:\n|Date\s*:)/i,
      );
    } else {
      patterns.push(
        /Buyer \(Bill to\)\s*([\s\S]{0,140}?)(?:GSTIN|Contact|E-Mail|Invoice No\.)/i,
      );
      patterns.push(
        /Consignee \(Ship to\)\s*([\s\S]{0,140}?)(?:GSTIN|Contact|E-Mail|Invoice No\.)/i,
      );
    }

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const raw = match?.[1];
      const cleaned = this.cleanPartyBlock(raw || "").replace(/\bGSTIN\/UIN\b.*$/i, "").trim();
      if (cleaned) {
        return cleaned;
      }
    }

    return "";
  }

  private cleanPartyBlock(value: string) {
    if (!value) return "";

    const firstLine = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0];

    if (!firstLine) return "";

    return firstLine.replace(/^(M\/s\.\s*)/i, "").trim();
  }
  private extractPartyGstin(
  text: string,
  detectedType: TransactionTypeDto | null,
) {
  const block = this.extractRelevantPartyBlock(text, detectedType);
  if (!block) return "";

  const match = block.match(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/i);
  return match?.[0]?.toUpperCase().trim() || "";
}

private extractRelevantPartyBlock(
  text: string,
  detectedType: TransactionTypeDto | null,
) {
  const patterns: RegExp[] = [];

  if (detectedType === TransactionTypeDto.PURCHASE) {
    patterns.push(
      /Supplier \(Bill from\)\s*([\s\S]{0,240}?)(?:Invoice No\.|Supplier Invoice No\.|Dated|Other References)/i,
    );
  } else if (detectedType === TransactionTypeDto.DEBIT_NOTE) {
    patterns.push(
      /Buyer \(Bill to\)\s*([\s\S]{0,240}?)(?:Debit Note No\.|Original Invoice No\.|Dated|Other References)/i,
    );
    patterns.push(
      /Consignee \(Ship to\)\s*([\s\S]{0,240}?)(?:Debit Note No\.|Original Invoice No\.|Dated|Other References)/i,
    );
  } else if (detectedType === TransactionTypeDto.CREDIT_NOTE) {
    patterns.push(
      /Buyer \(Bill to\)\s*([\s\S]{0,240}?)(?:Credit Note No\.|Buyer’s Order No\.|Dated|Destination)/i,
    );
    patterns.push(
      /Consignee \(Ship to\)\s*([\s\S]{0,240}?)(?:Credit Note No\.|Buyer’s Order No\.|Dated|Destination)/i,
    );
  } else if (detectedType === TransactionTypeDto.RECEIPT) {
    patterns.push(
      /Account\s*:\s*([\s\S]{0,120}?)(?:\n|Agst Ref|Bank Transaction Details)/i,
    );
  } else if (detectedType === TransactionTypeDto.PAYMENT) {
    patterns.push(
      /Account\s*:\s*([\s\S]{0,120}?)(?:\n|Agst Ref|Bank Transaction Details)/i,
    );
    patterns.push(
      /Payment Advice[\s\S]{0,30}?M\/s\.\s*([\s\S]{0,180}?)(?:Date\s*:|Dear Sir\/Madam)/i,
    );
  } else {
    patterns.push(
      /Buyer \(Bill to\)\s*([\s\S]{0,240}?)(?:Invoice No\.|Delivery Note|Dated|Mode\/Terms of Payment)/i,
    );
    patterns.push(
      /Consignee \(Ship to\)\s*([\s\S]{0,240}?)(?:Invoice No\.|Delivery Note|Dated|Mode\/Terms of Payment)/i,
    );
  }

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const raw = String(match?.[1] || "").trim();
    if (raw) return raw;
  }

  return "";
}
  private async matchPartyByGstinOrName(gstin: string, name: string) {
  const targetGstin = String(gstin || "").trim().toUpperCase();
  const targetName = this.normalizePartyName(name);

  const users = await this.prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      gstin: true,
    },
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  if (targetGstin) {
    const exactGstin = users.find(
      (user) => String(user.gstin || "").trim().toUpperCase() === targetGstin,
    );
    if (exactGstin) return exactGstin;
  }

  if (!targetName) return null;

  const exactName = users.find(
    (user) => this.normalizePartyName(user.name) === targetName,
  );
  if (exactName) return exactName;

  const includesName = users.find((user) => {
    const current = this.normalizePartyName(user.name);
    return current.includes(targetName) || targetName.includes(current);
  });
  if (includesName) return includesName;

  const targetTokens = this.tokenizePartyName(targetName);

  const scored = users
    .map((user) => {
      const current = this.normalizePartyName(user.name);
      const currentTokens = this.tokenizePartyName(current);

      const common = targetTokens.filter((token) =>
        currentTokens.includes(token),
      ).length;

      return {
        user,
        score: common,
        currentLength: current.length,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.currentLength - b.currentLength;
    });

  if (scored[0]?.score >= 2) {
    return scored[0].user;
  }

  return null;
}
private normalizePartyName(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(m\/s|mrs|mr|ms|shri|smt)\.?\b/g, " ")
    .replace(/\b(pvt|private|ltd|limited|llp|traders|enterprises|engineering|steel|infra|fabrication)\b/g, (match) => match)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

private tokenizePartyName(value: string) {
  return this.normalizePartyName(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

  private buildParticulars(input: {
    detectedType: TransactionTypeDto | null;
    voucherNo: string;
    partyName: string;
  }) {
    const typeLabel = this.transactionTypeLabel(input.detectedType);
    const parts = [typeLabel, input.voucherNo, input.partyName].filter(Boolean);
    return parts.join(" - ").slice(0, 190);
  }

  private transactionTypeLabel(type: TransactionTypeDto | null) {
    switch (type) {
      case TransactionTypeDto.SALES:
        return "Sales";
      case TransactionTypeDto.PURCHASE:
        return "Purchase";
      case TransactionTypeDto.PAYMENT:
        return "Payment";
      case TransactionTypeDto.RECEIPT:
        return "Receipt";
      case TransactionTypeDto.DEBIT_NOTE:
        return "Debit Note";
      case TransactionTypeDto.CREDIT_NOTE:
        return "Credit Note";
      case TransactionTypeDto.JOURNAL_DR:
        return "Journal Dr";
      case TransactionTypeDto.JOURNAL_CR:
        return "Journal Cr";
      default:
        return "Transaction";
    }
  }

  private async ensurePartyExists(partyId: string) {
    const party = await this.prisma.user.findUnique({
      where: { id: partyId },
      select: { id: true },
    });

    if (!party) {
      throw new BadRequestException("Selected party does not exist.");
    }
  }

  private assertTransactionSide(
    type: TransactionTypeDto | TransactionType,
    side: EntrySideDto | EntrySide,
  ) {
    const expected = this.getExpectedSide(type);

    if (String(side).toUpperCase() !== expected) {
      throw new BadRequestException(
        `Side mismatch for ${type}. Expected ${expected}.`,
      );
    }
  }

  private getExpectedSide(
    type: TransactionTypeDto | TransactionType,
  ): "DR" | "CR" {
    switch (type) {
      case "SALES":
      case "PAYMENT":
      case "DEBIT_NOTE":
      case "JOURNAL_DR":
        return "DR";

      case "PURCHASE":
      case "RECEIPT":
      case "CREDIT_NOTE":
      case "JOURNAL_CR":
        return "CR";

      default:
        throw new BadRequestException("Invalid transaction type.");
    }
  }

  private getOppositeSide(side: EntrySide | EntrySideDto): EntrySide {
    return String(side).toUpperCase() === "DR" ? "CR" : "DR";
  }

  private normalizeBillRowSides(
    billRows: TransactionBillRowDto[],
    voucherSide: EntrySide | EntrySideDto,
  ) {
    for (const row of billRows) {
      if (
        row.allocationType === "NEW_REF" ||
        row.allocationType === "ADVANCE" ||
        row.allocationType === "ON_ACCOUNT"
      ) {
        row.side = voucherSide as any;
      }
    }
  }

  private getNormalizedRowSide(
    allocationType: BillAllocationType,
    voucherSide: EntrySide,
    againstTarget?: OpenRefRow,
  ): EntrySide {
    if (
      allocationType === BillAllocationType.NEW_REF ||
      allocationType === BillAllocationType.ADVANCE ||
      allocationType === BillAllocationType.ON_ACCOUNT
    ) {
      return voucherSide;
    }

    if (allocationType === BillAllocationType.AGAINST_REF) {
      if (!againstTarget) {
        return this.getOppositeSide(voucherSide);
      }
      return this.getOppositeSide(againstTarget.side);
    }

    return voucherSide;
  }

 private validateBillRowsPresent(billRows: TransactionBillRowDto[]) {
  if (!Array.isArray(billRows) || billRows.length === 0) {
    throw new BadRequestException("At least one bill row is required.");
  }

  const normalizedRows = billRows
    .map((row) => ({
      ...row,
      amount: this.parsePositiveAmount(row.amount),
    }))
    .filter((row) => row.amount > 0);

  if (normalizedRows.length === 0) {
    throw new BadRequestException(
      "At least one bill row with amount greater than 0 is required.",
    );
  }

  for (let i = 0; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];

    if (
      (row.allocationType === "NEW_REF" ||
        row.allocationType === "ADVANCE") &&
      !String(row.refNo || "").trim()
    ) {
      throw new BadRequestException(`Bill row ${i + 1} ref no. is required.`);
    }

    if (
      row.allocationType === "AGAINST_REF" &&
      !String(row.againstBillRowId || "").trim()
    ) {
      throw new BadRequestException(
        `Bill row ${i + 1} must select an against reference.`,
      );
    }
  }
}
private parsePositiveAmount(value: unknown) {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .trim();

  const num = Number(cleaned);
  return Number.isFinite(num) ? this.round2(num) : 0;
}
  private validateVoucherAgainstBillRows(
    voucherSide: EntrySideDto | EntrySide,
    voucherAmount: number,
    billRows: TransactionBillRowDto[],
  ) {
    const drTotal = billRows
      .filter((row) => row.side === "DR")
      .reduce((sum, row) => sum + Number(row.amount), 0);

    const crTotal = billRows
      .filter((row) => row.side === "CR")
      .reduce((sum, row) => sum + Number(row.amount), 0);

    const roundedVoucherAmount = this.round2(voucherAmount);
    const roundedDrTotal = this.round2(drTotal);
    const roundedCrTotal = this.round2(crTotal);

    if (voucherSide === "DR") {
      const netDr = this.round2(roundedDrTotal - roundedCrTotal);
      if (netDr !== roundedVoucherAmount) {
        throw new BadRequestException(
          `Bill rows mismatch. Net DR ${netDr.toFixed(2)} must equal voucher amount ${roundedVoucherAmount.toFixed(2)}.`,
        );
      }
      return;
    }

    const netCr = this.round2(roundedCrTotal - roundedDrTotal);
    if (netCr !== roundedVoucherAmount) {
      throw new BadRequestException(
        `Bill rows mismatch. Net CR ${netCr.toFixed(2)} must equal voucher amount ${roundedVoucherAmount.toFixed(2)}.`,
      );
    }
  }

  private async loadAgainstTargetsForCreate(dto: CreateTransactionDto) {
    const targetIds = dto.billRows
      .filter((row) => row.allocationType === "AGAINST_REF")
      .map((row) => row.againstBillRowId)
      .filter(Boolean) as string[];

    if (targetIds.length === 0) {
      return new Map<string, OpenRefRow>();
    }

    const openRefs = await this.getOpenRefs(dto.partyId, dto.voucherDate);
    const filtered = openRefs.filter((row) => targetIds.includes(row.id));

    return new Map(filtered.map((row) => [row.id, row]));
  }

  private async loadAgainstTargetsForUpdate(
    transactionId: string,
    partyId: string,
    voucherDate: string,
    billRows: TransactionBillRowDto[],
  ) {
    const targetIds = billRows
      .filter((row) => row.allocationType === "AGAINST_REF")
      .map((row) => row.againstBillRowId)
      .filter(Boolean) as string[];

    if (targetIds.length === 0) {
      return new Map<string, OpenRefRow>();
    }

    const openRefs = await this.getOpenRefs(partyId, voucherDate);

    const currentAgainstRows = await this.prisma.transactionBillRow.findMany({
      where: {
        transactionId,
        allocationType: BillAllocationType.AGAINST_REF,
        againstBillRowId: {
          in: targetIds,
        },
      },
      select: {
        againstBillRowId: true,
        amount: true,
      },
    });

    const currentAdjustmentMap = new Map<string, number>();

    for (const row of currentAgainstRows) {
      const key = String(row.againstBillRowId || "");
      const nextValue =
        (currentAdjustmentMap.get(key) ?? 0) + Number(row.amount || 0);
      currentAdjustmentMap.set(key, this.round2(nextValue));
    }

    const adjustedOpenRefs = openRefs
      .filter((row) => row.transactionId !== transactionId)
      .map((row) => {
        const restored = this.round2(
          row.pendingAmount + (currentAdjustmentMap.get(row.id) ?? 0),
        );

        return {
          ...row,
          pendingAmount: restored,
          settledAmount: this.round2(row.originalAmount - restored),
        };
      })
      .filter((row) => targetIds.includes(row.id));

    return new Map(adjustedOpenRefs.map((row) => [row.id, row]));
  }

  private validateAgainstRefRows(
    billRows: TransactionBillRowDto[],
    againstTargets: Map<string, OpenRefRow>,
  ) {
    const grouped = new Map<string, number>();

    for (const row of billRows) {
      if (row.allocationType !== "AGAINST_REF") continue;

      const targetId = String(row.againstBillRowId || "").trim();
      const amount = Number(row.amount);
      const target = againstTargets.get(targetId);

      if (!target) {
        throw new BadRequestException(
          "Selected against reference is invalid or unavailable.",
        );
      }

      if (target.pendingAmount <= 0) {
        throw new BadRequestException(
          `Reference ${target.refNo || target.voucherNo} is already fully settled.`,
        );
      }

      if (this.getOppositeSide(target.side) !== (row.side as EntrySide)) {
        throw new BadRequestException(
          `Against Ref row side must be opposite of selected reference ${target.refNo || target.voucherNo}.`,
        );
      }

      const nextUsed = this.round2((grouped.get(targetId) ?? 0) + amount);

      if (nextUsed > this.round2(target.pendingAmount)) {
        throw new BadRequestException(
          `Adjustment amount for reference ${target.refNo || target.voucherNo} cannot exceed pending amount ${target.pendingAmount.toFixed(2)}.`,
        );
      }

      grouped.set(targetId, nextUsed);
    }
  }

  private async hasDownstreamAdjustments(transactionId: string) {
    const ownOpenRefRows = await this.prisma.transactionBillRow.findMany({
      where: {
        transactionId,
        allocationType: {
          in: [BillAllocationType.NEW_REF, BillAllocationType.ADVANCE],
        },
      },
      select: {
        id: true,
      },
    });

    if (ownOpenRefRows.length === 0) {
      return false;
    }

    const ownOpenRefRowIds = ownOpenRefRows.map((row) => row.id);

    const downstreamCount = await this.prisma.transactionBillRow.count({
      where: {
        transactionId: {
          not: transactionId,
        },
        allocationType: BillAllocationType.AGAINST_REF,
        againstBillRowId: {
          in: ownOpenRefRowIds,
        },
      },
    });

    return downstreamCount > 0;
  }

  private normalizeRefNo(row: TransactionBillRowDto) {
    if (
      row.allocationType === "NEW_REF" ||
      row.allocationType === "ADVANCE"
    ) {
      return String(row.refNo || "").trim();
    }

    return null;
  }

  private toDecimal(value: number | string) {
    return new Prisma.Decimal(this.round2(Number(value)).toFixed(2));
  }

  private round2(value: number) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }
    async getMergedAttachmentForDownload(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found.");
    }

    const merged =
      transaction.attachments.find(
        (item) => item.mimeType === "application/pdf",
      ) || transaction.attachments[0];

    if (!merged?.fileUrl) {
      throw new NotFoundException("No attachment found for download.");
    }

    const buffer = await this.r2Service.downloadFileByUrl(merged.fileUrl);

    return {
      fileName: merged.fileName || "Voucher.pdf",
      mimeType: merged.mimeType || "application/pdf",
      buffer,
    };
  }
  private endOfDay(dateString: string) {
    const date = new Date(dateString);
    date.setHours(23, 59, 59, 999);
    return date;
  }
  private async compressPdfBuffer(buffer: Buffer): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "txn-pdf-"));
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
      "-dPDFSETTINGS=/ebook",
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
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
async getLedgerReport(params: {
  partyId: string;
  from: string;
  to: string;
  skipOpeningBalance?: boolean;
}) {
  const { partyId, from, to, skipOpeningBalance = false } = params;

  await this.ensurePartyExists(partyId);

  const fromDate = new Date(from);
  const toDate = this.endOfDay(to);

  const allTransactions = await this.prisma.transaction.findMany({
    where: {
      partyId,
    },
    orderBy: [{ voucherDate: "asc" }, { createdAt: "asc" }],
    include: {
      billRows: true,
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const isOpeningLikeTransaction = (txn: any) => {
    return (
      String(txn.type || "").toUpperCase().includes("OPENING") ||
      String(txn.voucherNo || "").toLowerCase().includes("opening") ||
      String(txn.particulars || "").toLowerCase().includes("opening")
    );
  };

  const getAmounts = (txn: any) => {
    let debit = 0;
    let credit = 0;

    for (const row of txn.billRows || []) {
      const amount = Number(row.amount || 0);
      if (row.side === "DR") debit += amount;
      if (row.side === "CR") credit += amount;
    }

    return {
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
    };
  };

  const particularsOf = (txn: any) => {
    const { debit, credit } = getAmounts(txn);
    const prefix = debit > 0 ? "To" : credit > 0 ? "By" : "To";
    const narration = String(txn.particulars || "").trim();

    if (narration) return `${prefix} ${narration}`;

    return `${prefix} ${String(txn.type || "")
      .toLowerCase()
      .split("_")
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")}`;
  };

  const beforeTransactions = allTransactions.filter(
    (txn) => txn.voucherDate < fromDate,
  );

  const periodTransactions = allTransactions.filter(
    (txn) => txn.voucherDate >= fromDate && txn.voucherDate <= toDate,
  );

  let opening = 0;

  if (!skipOpeningBalance) {
    for (const txn of beforeTransactions) {
      const { debit, credit } = getAmounts(txn);
      opening += debit - credit;
    }
  }

  opening = Number(opening.toFixed(2));

  const rows = periodTransactions.map((txn) => {
    const { debit, credit } = getAmounts(txn);
    const firstAttachment = Array.isArray((txn as any).attachments)
      ? (txn as any).attachments[0]
      : null;

    return {
      id: txn.id,
      date: txn.voucherDate,
      voucherNo: txn.voucherNo || "",
      type: txn.type,
      particulars: particularsOf(txn),
      debit: skipOpeningBalance && isOpeningLikeTransaction(txn) ? 0 : debit,
      credit: skipOpeningBalance && isOpeningLikeTransaction(txn) ? 0 : credit,
      actualDebit: debit,
      actualCredit: credit,
      isOpeningLike: isOpeningLikeTransaction(txn),
      openingSkipped: skipOpeningBalance && isOpeningLikeTransaction(txn),
      attachmentUrl: String(firstAttachment?.fileUrl || "").trim(),
    };
  });

  const periodDebit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const periodCredit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
  const closing = Number((opening + periodDebit - periodCredit).toFixed(2));

  return {
    partyId,
    from,
    to,
    skipOpeningBalance,
    openingBalance: {
      skipped: skipOpeningBalance,
      amount: skipOpeningBalance ? 0 : Math.abs(opening),
      type: skipOpeningBalance ? "" : opening > 0 ? "Dr" : opening < 0 ? "Cr" : "",
      display: skipOpeningBalance ? "SKIPPED" : null,
    },
    closingBalance: {
      amount: Math.abs(closing),
      type: closing > 0 ? "Dr" : closing < 0 ? "Cr" : "",
    },
    totals: {
      debit: Number(periodDebit.toFixed(2)),
      credit: Number(periodCredit.toFixed(2)),
    },
    rows,
  };
}
getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const from = new Date(year, 3, 1);
  const to = new Date(year + 1, 2, 31);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
private formatPdfDate(value: Date | string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
async generateLedgerPdf(params: {
  partyId: string;
  from: string;
  to: string;
  skipOpeningBalance?: boolean;
}) {
  const { partyId, from, to, skipOpeningBalance = false } = params;

  await this.ensurePartyExists(partyId);

  const party = await this.prisma.user.findUnique({
  where: { id: partyId },
  select: {
    id: true,
    name: true,
    address: true,
    email: true,
    phone: true,
    gstin: true,
    pan: true,
  },
});

  if (!party) {
    throw new NotFoundException("Party not found.");
  }

  const fromDate = new Date(from);
  const toDate = this.endOfDay(to);

  const allTransactions = await this.prisma.transaction.findMany({
  where: {
    partyId,
  },
  orderBy: [{ voucherDate: "asc" }, { createdAt: "asc" }],
  include: {
    billRows: true,
    attachments: {
      orderBy: { createdAt: "asc" },
    },
  },
});
const isOpeningLikeTransaction = (txn: any) => {
  return (
    String(txn.type || "").toUpperCase().includes("OPENING") ||
    String(txn.voucherNo || "").toLowerCase().includes("opening") ||
    String(txn.particulars || "").toLowerCase().includes("opening")
  );
};

const beforeTransactions = allTransactions.filter(
  (txn) => txn.voucherDate < fromDate,
);

const periodTransactions = allTransactions.filter(
  (txn) => txn.voucherDate >= fromDate && txn.voucherDate <= toDate,
);
  const getAmounts = (txn: any) => {
    let debit = 0;
    let credit = 0;

    for (const row of txn.billRows || []) {
      const amount = Number(row.amount || 0);
      if (row.side === "DR") debit += amount;
      if (row.side === "CR") credit += amount;
    }

    return {
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
    };
  };

  const particularsOf = (txn: any) => {
    const { debit, credit } = getAmounts(txn);
    const prefix = debit > 0 ? "To" : credit > 0 ? "By" : "To";
    const narration = String(txn.particulars || "").trim();
    if (narration) return `${prefix} ${narration}`;
    return `${prefix} ${String(txn.type || "")
      .toLowerCase()
      .split("_")
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")}`;
  };

let opening = 0;

if (!skipOpeningBalance) {
  for (const txn of beforeTransactions) {
    const { debit, credit } = getAmounts(txn);
    opening += debit - credit;
  }
}

opening = Number(opening.toFixed(2));

const rows = periodTransactions.map((txn) => {
  const { debit, credit } = getAmounts(txn);
  const firstAttachment = Array.isArray((txn as any).attachments)
    ? (txn as any).attachments[0]
    : null;

  const openingLike = isOpeningLikeTransaction(txn);
  const skippedOpeningRow = skipOpeningBalance && openingLike;

  return {
    date: this.formatPdfDate(txn.voucherDate),
    particulars: particularsOf(txn),
    vchType: String(txn.type || "")
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    vchNo: txn.voucherNo || "",
    dr: skippedOpeningRow ? 0 : debit,
    cr: skippedOpeningRow ? 0 : credit,
    showSkipped: skippedOpeningRow,
    attachmentUrl: String(firstAttachment?.fileUrl || "").trim(),
  };
});

  let totalDr = opening > 0 ? opening : 0;
  let totalCr = opening < 0 ? Math.abs(opening) : 0;

  for (const r of rows) {
    totalDr += Number(r.dr || 0);
    totalCr += Number(r.cr || 0);
  }

  totalDr = Number(totalDr.toFixed(2));
  totalCr = Number(totalCr.toFixed(2));

  const diff = Math.abs(totalDr - totalCr);
  const drGreater = totalDr > totalCr;
  const crGreater = totalCr > totalDr;
  const grandTotal = Math.max(totalDr, totalCr);

  const PDFDocumentKit = require("pdfkit");
  const doc = new PDFDocumentKit({ size: "A4", margin: 36 });

  const chunks: Buffer[] = [];

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    const top = doc.page.margins.top;
    const bottom = doc.page.margins.bottom;
    const usableW = pageW - left - right;

  const col = {
  date: 59,
  particulars: 0,
  vchType: 52,
  vchNo: 76,
  debit: 72,
  credit: 72,
};

col.particulars =
  usableW - (col.date + col.vchType + col.vchNo + col.debit + col.credit);

if (col.particulars < 170) {
  col.date = 58;
  col.vchType = 50;
  col.vchNo = 72;
  col.debit = 68;
  col.credit = 68;

  col.particulars =
    usableW - (col.date + col.vchType + col.vchNo + col.debit + col.credit);
}

  const X = {
  date: left,
  particulars: left + col.date,
  vchType: left + col.date + col.particulars,
  vchNo: left + col.date + col.particulars + col.vchType,
  debit: left + col.date + col.particulars + col.vchType + col.vchNo,
  credit:
    left +
    col.date +
    col.particulars +
    col.vchType +
    col.vchNo +
    col.debit,
};

    const money2 = (n: number) => {
      const v = Number(n || 0);
      if (!v) return "";
      return v.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const drawCompressedText = (
      text: string,
      x: number,
      y: number,
      width: number,
      opts: {
        align?: "left" | "right" | "center";
        font?: string;
        fontSize?: number;
        color?: string;
        minScale?: number;
      } = {},
    ) => {
      const {
        align = "left",
        font = "Helvetica",
        fontSize = 9,
        color = "#111827",
        minScale = 55,
      } = opts;

      const value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value) return;

      doc.save();
      doc.font(font).fontSize(fontSize).fillColor(color);

      const naturalWidth = doc.widthOfString(value);
      let scale = 100;

      if (naturalWidth > width && naturalWidth > 0) {
        scale = Math.floor((width / naturalWidth) * 100);
      }

      if (scale < minScale) scale = minScale;

      doc.rect(x, y - 1, width, fontSize + 4).clip();

      let drawX = x;
      const scaledWidth = naturalWidth * (scale / 100);

      if (align === "right") {
        drawX = x + width - scaledWidth;
      } else if (align === "center") {
        drawX = x + (width - scaledWidth) / 2;
      }

      doc.text(value, drawX, y, {
        lineBreak: false,
        horizontalScaling: scale,
      });

      doc.restore();
    };

    const rowHeight = () => 13;
    const drawHeader = () => {
  const titleY = top;

   const partyAddress = String(party.address || "")
  .replace(/\r/g, " ")
  .replace(/\n/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const partyEmail = String(party.email || "").trim();
const partyPhone = String(party.phone || "").trim();
const partyGstin = String(party.gstin || "").trim().toUpperCase();
const partyPan = String(party.pan || "").trim().toUpperCase();

const taxInfoLine = [
  partyGstin ? `GSTIN: ${partyGstin}` : "",
  partyPan ? `PAN: ${partyPan}` : "",
]
  .filter(Boolean)
  .join("  |  ");

const contactInfoLine = [
  partyPhone ? `Phone: ${partyPhone}` : "",
  partyEmail ? `Email: ${partyEmail}` : "",
]
  .filter(Boolean)
  .join("  |  ");
  const splitAddressIntoTwoBalancedLines = (
  text: string,
  maxWidth: number,
) => {
  const value = String(text || "").trim();
  if (!value) return { line1: "", line2: "" };

  const words = value.split(" ").filter(Boolean);
  if (words.length <= 1) {
    return { line1: value, line2: "" };
  }

  doc.font("Helvetica").fontSize(9.5);

  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(" ");
    const line2 = words.slice(i).join(" ");

    const w1 = doc.widthOfString(line1);
    const w2 = doc.widthOfString(line2);

    if (w1 > maxWidth || w2 > maxWidth) continue;

    const score = Math.abs(w1 - w2);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex === -1) {
    let current = "";
    const line1Words: string[] = [];

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (doc.widthOfString(next) <= maxWidth) {
        current = next;
        line1Words.push(word);
      } else {
        break;
      }
    }

    const used = line1Words.length || 1;

    return {
      line1: words.slice(0, used).join(" "),
      line2: words.slice(used).join(" "),
    };
  }

  return {
    line1: words.slice(0, bestIndex).join(" "),
    line2: words.slice(bestIndex).join(" "),
  };
};

const balancedAddress = splitAddressIntoTwoBalancedLines(
  partyAddress,
  usableW - 140,
);

      const gradient = doc.linearGradient(left, titleY, left + usableW, titleY);
      gradient.stop(0, "#7f1d1d");
      gradient.stop(0.28, "#b91c1c");
      gradient.stop(0.62, "#9333ea");
      gradient.stop(1, "#2563eb");

      doc.font("Helvetica-Bold").fontSize(22).fill(gradient);
      doc.text("STAR ENGINEERING", left, titleY, {
        width: usableW,
        align: "center",
      });

      let y = titleY + 28;

      doc.save();
      doc.lineWidth(2);
      const lineGrad = doc.linearGradient(left + 110, y, left + usableW - 110, y);
      lineGrad.stop(0, "#b91c1c");
      lineGrad.stop(0.5, "#a100ff");
      lineGrad.stop(1, "#2563eb");
      doc.strokeColor(lineGrad);
      doc.moveTo(left + 110, y).lineTo(left + usableW - 110, y).stroke();
      doc.restore();

      y += 10;

      doc.fillColor("#111827").font("Helvetica").fontSize(10);
      doc.text("H.N. 303, Sangam C.H.S., Indra Nagar,", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;
      doc.text("Pathan Wadi, R.S. Marg, Malad (E), Mumbai - 400097.", left, y, {
        width: usableW,
        align: "center",
      });
       y += 14;
      doc.text("GSTIN: 27BAJPA0708B1ZG  |  Udyam No.: UDYAM-MH-19-0033964", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;
      doc.text("Contact : +91-9702485922  |  E-Mail : corporate@stareng.co.in", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;

      const webGrad = doc.linearGradient(left, y, left + usableW, y);
      webGrad.stop(0, "#b91c1c");
      webGrad.stop(0.4, "#9333ea");
      webGrad.stop(1, "#2563eb");

      doc.font("Helvetica-Bold").fontSize(10).fill(webGrad);
      doc.text("www.stareng.co.in", left, y, {
        width: usableW,
        align: "center",
      });

      y += 24;

      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(16);
doc.text(String(party.name || "").toUpperCase(), left, y, {
  width: usableW,
  align: "center",
});

y += 18;

if (balancedAddress.line1) {
  doc.font("Helvetica").fontSize(9.5).fillColor("#475569");
  doc.text(balancedAddress.line1, left, y, {
    width: usableW,
    align: "center",
  });
  y += 12;
}

if (balancedAddress.line2) {
  doc.font("Helvetica").fontSize(9.5).fillColor("#475569");
  doc.text(balancedAddress.line2, left, y, {
    width: usableW,
    align: "center",
  });
  y += 12;
}

if (taxInfoLine) {
  doc.font("Helvetica").fontSize(9).fillColor("#64748b");
  doc.text(taxInfoLine, left, y, {
    width: usableW,
    align: "center",
  });
  y += 12;
}

if (contactInfoLine) {
  doc.font("Helvetica").fontSize(9).fillColor("#64748b");
  doc.text(contactInfoLine, left, y, {
    width: usableW,
    align: "center",
  });
  y += 14;
}

doc.font("Helvetica").fontSize(12).fillColor("#374151");
doc.text("Ledger Account", left, y, {
  width: usableW,
  align: "center",
});

y += 16;
doc.font("Helvetica").fontSize(10).fillColor("#6b7280");
doc.text(
  `Period: ${this.formatPdfDate(fromDate)} to ${this.formatPdfDate(toDate)}`,
  left,
  y,
  {
    width: usableW,
    align: "center",
  },
);

y += 18;

      doc.save();
      doc.lineWidth(1);
      doc.strokeColor("#d1d5db");
      doc.moveTo(left, y).lineTo(left + usableW, y).stroke();
      doc.restore();

      doc.y = y + 10;
      doc.fillColor("#111827");
    };

    const drawTableHeader = (y: number) => {
      y -= 7;

      doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
      doc.text("Date", X.date, y, { width: col.date });

      doc.font("Helvetica-Bold");
      doc.text("Particulars", X.particulars, y, { width: col.particulars });

      doc.font("Helvetica");
doc.text("Vch Type", X.vchType, y, { width: col.vchType });
doc.text("Vch No.", X.vchNo, y, { width: col.vchNo, align: "right" });

doc.font("Helvetica-Bold");
doc.text("Debit", X.debit, y, { width: col.debit, align: "right" });
doc.text("Credit", X.credit, y, { width: col.credit, align: "right" });

      y += 10;

      doc.save();
      doc.lineWidth(0.8);
      doc.strokeColor("#94a3b8");
      doc.moveTo(left, y).lineTo(left + usableW, y).stroke();
      doc.restore();

      y += 6;
      doc.font("Helvetica").fontSize(9).fillColor("#111827");
      return y;
    };

    const drawRow = (
  y: number,
 r: {
  date: string;
  particulars: string;
  vchType: string;
  vchNo: string;
  dr: number;
  cr: number;
  showSkipped?: boolean;
  attachmentUrl?: string;
},
      opts: {
        isOpening?: boolean;
        isClosing?: boolean;
        isSubTotal?: boolean;
        isGrandTotal?: boolean;
        totalsLine?: "above" | "below" | "both";
      } = {},
    ) => {
      const h = rowHeight();
      const isOpening = !!opts.isOpening;
      const isGrandTotal = !!opts.isGrandTotal;
      const totalsLine = opts.totalsLine;

      const normalFont = "Helvetica";
      const boldFont = "Helvetica-Bold";

      drawCompressedText(r.date || "", X.date, y, col.date - 4, {
        font: normalFont,
        fontSize: 9,
        minScale: 78,
      });

      const particularsText = String(r.particulars || "").trim();
      const prefixMatch = particularsText.match(/^(To|By)\s+(.*)$/i);

      if (prefixMatch) {
        const prefix = prefixMatch[1];
        const rest = prefixMatch[2];

        doc.font(normalFont).fontSize(9);
        const prefixWidth = doc.widthOfString(prefix + " ");

        drawCompressedText(prefix + " ", X.particulars, y, prefixWidth + 2, {
          font: normalFont,
          fontSize: 9,
          minScale: 100,
        });

        drawCompressedText(
          rest,
          X.particulars + prefixWidth,
          y,
          col.particulars - prefixWidth - 8,
          {
            font: boldFont,
            fontSize: 9,
            minScale: 42,
          },
        );
      } else {
        drawCompressedText(particularsText, X.particulars, y, col.particulars - 8, {
          font: boldFont,
          fontSize: 9,
          minScale: 42,
        });
      }

      drawCompressedText(r.vchType || "", X.vchType, y, col.vchType - 4, {
        font: boldFont,
        fontSize: 8.5,
        minScale: 58,
      });

     const voucherNoText = String(r.vchNo || "").trim();
const voucherNoX = X.vchNo + 5;
const voucherNoY = y;
const voucherNoW = col.vchNo - 6;
const attachmentUrl =
  typeof r.attachmentUrl === "string" ? r.attachmentUrl.trim() : "";

drawCompressedText(voucherNoText, voucherNoX, voucherNoY, voucherNoW, {
  font: attachmentUrl ? boldFont : normalFont,
  fontSize: 9,
  minScale: 58,
  align: "right",
  color: attachmentUrl ? "#2563eb" : "#111827",
});

if (
  attachmentUrl &&
  voucherNoText &&
  Number.isFinite(voucherNoX) &&
  Number.isFinite(voucherNoY) &&
  Number.isFinite(voucherNoW) &&
  voucherNoW > 0
) {
  doc.link(voucherNoX, voucherNoY, voucherNoW, h, attachmentUrl);
}

      const debitFont = isOpening || isGrandTotal ? boldFont : normalFont;
      const creditFont = isOpening || isGrandTotal ? boldFont : normalFont;

      drawCompressedText(
  r.showSkipped ? "SKIPPED" : money2(r.dr),
  X.debit,
  y,
  col.debit - 2,
  {
    font: debitFont,
    fontSize: 9,
    minScale: 85,
    align: "right",
  },
);

drawCompressedText(
  r.showSkipped ? "SKIPPED" : money2(r.cr),
  X.credit,
  y,
  col.credit - 2,
  {
    font: creditFont,
    fontSize: 9,
    minScale: 85,
    align: "right",
  },
);
      if (totalsLine) {
        doc.save();
        doc.lineWidth(0.6);
        doc.strokeColor("#6b7280");

        const drawTotalLine = (lineY: number) => {
          doc.moveTo(X.debit + 6, lineY).lineTo(X.debit + col.debit - 2, lineY).stroke();
          doc.moveTo(X.credit + 6, lineY).lineTo(X.credit + col.credit - 2, lineY).stroke();
        };

        if (totalsLine === "above") {
          drawTotalLine(y - 2);
        } else if (totalsLine === "below") {
          drawTotalLine(y + h - 1);
        } else if (totalsLine === "both") {
          drawTotalLine(y - 2);
          drawTotalLine(y + h - 3);
        }

        doc.restore();
      }

      return y + h;
    };

    const drawFooter = (pageNo: number) => {
      const footerText =
        "This is a system generated ledger statement. No physical signature is required on digitally issued documents.";

      doc.save();
      doc.font("Helvetica").fontSize(7).fillColor("#64748b");

      const footerH = doc.heightOfString(footerText, {
        width: usableW - 70,
        align: "center",
      });

      const footerY = doc.page.height - doc.page.margins.bottom - footerH - 8;

      doc.text(footerText, left, footerY, {
        width: usableW - 70,
        align: "center",
      });

      doc.fillColor("#94a3b8");
      doc.text(`Page ${pageNo}`, left, footerY, {
        width: usableW,
        align: "right",
      });

      doc.restore();
      doc.fillColor("#111827");
    };

    const bottomLimit = () => doc.page.height - bottom - 32;
let pageNo = 1;
drawHeader();
let y = drawTableHeader(doc.y);

const openingRow = {
  date: this.formatPdfDate(fromDate),
  particulars: opening >= 0 ? "To Opening Balance b/d" : "By Opening Balance b/d",
  vchType: "",
  vchNo: "",
  dr: opening > 0 ? opening : 0,
  cr: opening < 0 ? Math.abs(opening) : 0,
  showSkipped: false,
  attachmentUrl: "",
};

if (!skipOpeningBalance && Math.abs(Number(opening || 0)) > 0.0001) {
  if (y + rowHeight() > bottomLimit()) {
    drawFooter(pageNo);
    doc.addPage();
    pageNo++;
    y = top + 18;
    y = drawTableHeader(y);
  }

  y = drawRow(y, openingRow, { isOpening: true });
}

    for (const r of rows) {
      if (y + rowHeight() > bottomLimit()) {
drawFooter(pageNo);
doc.addPage();
pageNo++;
y = top + 18;
y = drawTableHeader(y);
      }
      y = drawRow(y, r);
    }

    const subTotalRow = {
  date: "",
  particulars: "",
  vchType: "",
  vchNo: "",
  dr: totalDr,
  cr: totalCr,
  attachmentUrl: "",
};

    if (diff === 0) {
      if (y + rowHeight() > bottomLimit()) {
drawFooter(pageNo);
doc.addPage();
pageNo++;
y = top + 18;
y = drawTableHeader(y);
      }

      y = drawRow(y, subTotalRow, {
        isGrandTotal: true,
        totalsLine: "both",
      });
    } else {
      if (y + rowHeight() > bottomLimit()) {
drawFooter(pageNo);
doc.addPage();
pageNo++;
y = top + 18;
y = drawTableHeader(y);
      }

      y = drawRow(y, subTotalRow, {
        totalsLine: "above",
      });

      y -= 1;

      const closingRow = {
  date: "",
  particulars: drGreater ? "By Closing Balance c/d" : "To Closing Balance c/d",
  vchType: "",
  vchNo: "",
  dr: crGreater ? diff : 0,
  cr: drGreater ? diff : 0,
  attachmentUrl: "",
};

      if (y + rowHeight() > bottomLimit()) {
  drawFooter(pageNo);
  doc.addPage();
  pageNo++;
  y = top + 18;
  y = drawTableHeader(y);
}

      y = drawRow(y, closingRow, {});

      const grandRow = {
  date: "",
  particulars: "",
  vchType: "",
  vchNo: "",
  dr: grandTotal,
  cr: grandTotal,
  attachmentUrl: "",
};

      if (y + rowHeight() > bottomLimit()) {
  drawFooter(pageNo);
  doc.addPage();
  pageNo++;
  y = top + 18;
  y = drawTableHeader(y);
}

      y = drawRow(y, grandRow, {
        isGrandTotal: true,
        totalsLine: "both",
      });
    }

    drawFooter(pageNo);
    doc.end();
  });

  return {
    fileName: `Ledger_${String(party.name || "Party").replace(/[^\w]+/g, "_")}_${from}_to_${to}.pdf`,
    buffer,
  };
}
async generateBillWisePdf(params: {
  partyId: string;
  from: string;
  to: string;
  mode?: string;
  status?: string;
}) {
  const {
    partyId,
    from,
    to,
    mode = "RECEIVABLE_FROM_YOU",
    status = "ALL",
  } = params;

  await this.ensurePartyExists(partyId);

  const party = await this.prisma.user.findUnique({
    where: { id: partyId },
    select: {
      id: true,
      name: true,
      gstin: true,
      pan: true,
      phone: true,
      email: true,
      address: true,
    },
  });

  if (!party) {
    throw new NotFoundException("Party not found.");
  }

  const fromDate = new Date(from);
  const toDate = this.endOfDay(to);

  const transactions = await this.prisma.transaction.findMany({
    where: {
      partyId,
      voucherDate: { lte: toDate },
    },
    orderBy: [{ voucherDate: "asc" }, { createdAt: "asc" }],
    include: {
      billRows: {
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const normalizeMode = String(mode || "")
    .trim()
    .toUpperCase();

  const normalizeStatus = String(status || "ALL")
    .trim()
    .toUpperCase();

  const baseRefRows = transactions.flatMap((txn) =>
    (txn.billRows || [])
      .filter(
        (row) =>
          row.allocationType === BillAllocationType.NEW_REF ||
          row.allocationType === BillAllocationType.ADVANCE,
      )
      .map((row) => {
        const allAgainstRows = transactions.flatMap((againstTxn) =>
          (againstTxn.billRows || []).filter(
            (againstRow) =>
              againstRow.allocationType === BillAllocationType.AGAINST_REF &&
              againstRow.againstBillRowId === row.id,
          ),
        );

        const settledAmount = allAgainstRows.reduce(
          (sum, againstRow) => sum + Number(againstRow.amount || 0),
          0,
        );

        const originalAmount = Number(row.amount || 0);
        const pendingAmount = this.round2(originalAmount - settledAmount);
        const firstAttachment = Array.isArray((txn as any).attachments)
          ? (txn as any).attachments[0]
          : null;

        return {
          transactionId: txn.id,
          date: txn.voucherDate,
          refNo: String(row.refNo || txn.voucherNo || "").trim(),
          billAmount: this.round2(originalAmount),
          pendingAmount: this.round2(pendingAmount),
          allocationType: row.allocationType,
          side: row.side,
          attachmentUrl: String(firstAttachment?.fileUrl || "").trim(),
        };
      }),
  );

  let filteredRows = baseRefRows.filter((row) => {
    if (normalizeMode === "RECEIVABLE_FROM_YOU") {
      return (
        row.allocationType === BillAllocationType.NEW_REF &&
        row.side === EntrySide.DR
      );
    }

    if (normalizeMode === "PAYABLE_TO_YOU") {
      return (
        row.allocationType === BillAllocationType.NEW_REF &&
        row.side === EntrySide.CR
      );
    }

    if (normalizeMode === "ADVANCE_ISSUED") {
      return (
        row.allocationType === BillAllocationType.ADVANCE &&
        row.side === EntrySide.DR
      );
    }

    if (normalizeMode === "ADVANCE_RECEIVED") {
      return (
        row.allocationType === BillAllocationType.ADVANCE &&
        row.side === EntrySide.CR
      );
    }

    if (normalizeMode === "ADVANCES_PENDING_ADJUSTMENT") {
      return row.allocationType === BillAllocationType.ADVANCE;
    }

    return (
      row.allocationType === BillAllocationType.NEW_REF &&
      row.side === EntrySide.DR
    );
  });

  filteredRows = filteredRows.filter((row) => {
    const billAmount = this.round2(Number(row.billAmount || 0));
    const pendingAmount = this.round2(Math.max(0, Number(row.pendingAmount || 0)));

    if (normalizeStatus === "ALL") return true;
    if (normalizeStatus === "PENDING") return pendingAmount > 0.0001;
    if (normalizeStatus === "SETTLED") return pendingAmount <= 0.0001;
    if (normalizeStatus === "PARTIAL" || normalizeStatus === "PARTLY_PAID") {
      return pendingAmount > 0.0001 && pendingAmount < billAmount - 0.0001;
    }

    return true;
  });

  filteredRows = filteredRows.sort((a, b) => {
    const ad = new Date(a.date).getTime();
    const bd = new Date(b.date).getTime();
    if (ad !== bd) return ad - bd;
    return String(a.refNo || "").localeCompare(String(b.refNo || ""));
  });

 const isPendingMode =
  normalizeStatus === "PENDING" ||
  normalizeStatus === "UNADJUSTED";

const openingRows = isPendingMode
  ? []
  : filteredRows.filter((row) => row.date < fromDate);

const periodRows = isPendingMode
  ? filteredRows
  : filteredRows.filter(
      (row) => row.date >= fromDate && row.date <= toDate,
    );

  const openingBill = this.round2(
    openingRows.reduce((sum, row) => sum + Number(row.billAmount || 0), 0),
  );

  const openingPending = this.round2(
    openingRows.reduce((sum, row) => sum + Number(row.pendingAmount || 0), 0),
  );

  const totalBill = this.round2(
    periodRows.reduce((sum, row) => sum + Number(row.billAmount || 0), 0),
  );

const totalPending = this.round2(
  periodRows.reduce((sum, row) => sum + Number(row.pendingAmount || 0), 0),
);

  const reportTitle =
    normalizeMode === "PAYABLE_TO_YOU"
      ? "Bills Payable"
      : normalizeMode === "ADVANCE_RECEIVED"
        ? "Advance Received"
        : normalizeMode === "ADVANCE_ISSUED"
          ? "Advance Issued"
          : normalizeMode === "ADVANCES_PENDING_ADJUSTMENT"
            ? "Advances Pending Adjustment"
            : "Bills Receivable";
const hidePeriodForStatus =
  normalizeStatus === "PENDING" || normalizeStatus === "UNADJUSTED";

const showOpeningRowInBillWise = false;
  const PDFDocumentKit = require("pdfkit");
  const doc = new PDFDocumentKit({ size: "A4", margin: 36 });
  const chunks: Buffer[] = [];

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    const top = doc.page.margins.top;
    const bottom = doc.page.margins.bottom;
    const usableW = pageW - left - right;

    const col = {
      date: 62,
      refNo: 125,
      billAmount: 110,
      pendingAmount: 110,
      status: 0,
    };

    col.status =
      usableW - (col.date + col.refNo + col.billAmount + col.pendingAmount + 24);

    const gap = 8;

    const X = {
      date: left,
      refNo: left + col.date + gap,
      billAmount: left + col.date + col.refNo + gap * 2,
      pendingAmount: left + col.date + col.refNo + col.billAmount + gap * 3,
      status:
        left +
        col.date +
        col.refNo +
        col.billAmount +
        col.pendingAmount +
        gap * 4,
    };

    const money2 = (n: number) => {
      const v = Number(n || 0);
      if (!v) return "";
      return v.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const amountWithDrCr = (amount: number, side: EntrySide | string) => {
      const amt = money2(amount);
      if (!amt) return "";
      const s = String(side || "").toUpperCase();
      if (s === "DR") return `${amt} Dr`;
      if (s === "CR") return `${amt} Cr`;
      return amt;
    };

    const getStatusLabel = (row: {
      pendingAmount: number;
      billAmount: number;
      allocationType: BillAllocationType;
    }) => {
      const pendingAmount = this.round2(Math.max(0, Number(row.pendingAmount || 0)));
      const billAmount = this.round2(Number(row.billAmount || 0));

      if (row.allocationType === BillAllocationType.ADVANCE) {
        if (pendingAmount <= 0.0001) return "Adjusted";
        if (pendingAmount < billAmount - 0.0001) return "Partly Adjusted";
        return "Unadjusted";
      }

      if (pendingAmount <= 0.0001) return "Paid";
      if (pendingAmount < billAmount - 0.0001) return "Partly Paid";
      return "Pending";
    };

    const statusStyle = (statusText: string) => {
      const s = String(statusText || "").trim().toUpperCase();

      if (s === "PAID" || s === "ADJUSTED") {
        return {
          text: statusText,
          fill: "#dcfce7",
          stroke: "#86efac",
          textColor: "#166534",
        };
      }

      if (s === "PENDING" || s === "UNADJUSTED") {
        return {
          text: statusText,
          fill: "#fee2e2",
          stroke: "#fca5a5",
          textColor: "#b91c1c",
        };
      }

      if (s === "PARTLY PAID" || s === "PARTLY ADJUSTED" || s === "PARTIAL") {
        return {
          text: statusText,
          fill: "#ffedd5",
          stroke: "#fdba74",
          textColor: "#c2410c",
        };
      }

      return {
        text: statusText || "",
        fill: "#e5e7eb",
        stroke: "#cbd5e1",
        textColor: "#374151",
      };
    };

    const drawStatusBadge = (
      badgeText: string,
      x: number,
      y: number,
      width: number,
    ) => {
      const value = String(badgeText || "").trim();
      if (!value) return;

      const st = statusStyle(value);

      doc.save();
      doc.font("Helvetica-Bold").fontSize(8.2);

      const textW = doc.widthOfString(st.text);
      const badgeW = Math.min(width - 2, Math.max(44, textW + 14));
      const badgeH = 11;
      const badgeX = x;
      const badgeY = y - 1;

      doc
        .roundedRect(badgeX, badgeY, badgeW, badgeH, 5)
        .fillAndStroke(st.fill, st.stroke);

      doc.fillColor(st.textColor);
      doc.text(st.text, badgeX, badgeY + 2.2, {
        width: badgeW,
        align: "center",
        lineBreak: false,
      });

      doc.restore();
    };

    const drawCompressedText = (
      text: string,
      x: number,
      y: number,
      width: number,
      opts: {
        align?: "left" | "right" | "center";
        font?: string;
        fontSize?: number;
        color?: string;
        minScale?: number;
      } = {},
    ) => {
      const {
        align = "left",
        font = "Helvetica",
        fontSize = 9,
        color = "#111827",
        minScale = 55,
      } = opts;

      const value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value) return;

      doc.save();
      doc.font(font).fontSize(fontSize).fillColor(color);

      const naturalWidth = doc.widthOfString(value);
      let scale = 100;

      if (naturalWidth > width && naturalWidth > 0) {
        scale = Math.floor((width / naturalWidth) * 100);
      }

      if (scale < minScale) scale = minScale;

      doc.rect(x, y - 1, width, fontSize + 4).clip();

      let drawX = x;
      const scaledWidth = naturalWidth * (scale / 100);

      if (align === "right") {
        drawX = x + width - scaledWidth;
      } else if (align === "center") {
        drawX = x + (width - scaledWidth) / 2;
      }

      doc.text(value, drawX, y, {
        lineBreak: false,
        horizontalScaling: scale,
      });

      doc.restore();
    };

    const rowHeight = () => 13;

    const drawHeader = () => {
      const titleY = top;

      const partyAddress = String(party.address || "")
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const partyEmail = String(party.email || "").trim();
      const partyPhone = String(party.phone || "").trim();
      const partyGstin = String(party.gstin || "").trim().toUpperCase();
      const partyPan = String(party.pan || "").trim().toUpperCase();

      const taxInfoLine = [
        partyGstin ? `GSTIN: ${partyGstin}` : "",
        partyPan ? `PAN: ${partyPan}` : "",
      ]
        .filter(Boolean)
        .join("  |  ");

      const contactInfoLine = [
        partyPhone ? `Phone: ${partyPhone}` : "",
        partyEmail ? `Email: ${partyEmail}` : "",
      ]
        .filter(Boolean)
        .join("  |  ");

      const splitAddressIntoTwoBalancedLines = (
        text: string,
        maxWidth: number,
      ) => {
        const value = String(text || "").trim();
        if (!value) return { line1: "", line2: "" };

        const words = value.split(" ").filter(Boolean);
        if (words.length <= 1) {
          return { line1: value, line2: "" };
        }

        doc.font("Helvetica").fontSize(9.5);

        let bestIndex = -1;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let i = 1; i < words.length; i++) {
          const line1 = words.slice(0, i).join(" ");
          const line2 = words.slice(i).join(" ");

          const w1 = doc.widthOfString(line1);
          const w2 = doc.widthOfString(line2);

          if (w1 > maxWidth || w2 > maxWidth) continue;

          const score = Math.abs(w1 - w2);
          if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }

        if (bestIndex === -1) {
          let current = "";
          const line1Words: string[] = [];

          for (const word of words) {
            const next = current ? `${current} ${word}` : word;
            if (doc.widthOfString(next) <= maxWidth) {
              current = next;
              line1Words.push(word);
            } else {
              break;
            }
          }

          const used = line1Words.length || 1;

          return {
            line1: words.slice(0, used).join(" "),
            line2: words.slice(used).join(" "),
          };
        }

        return {
          line1: words.slice(0, bestIndex).join(" "),
          line2: words.slice(bestIndex).join(" "),
        };
      };

      const balancedAddress = splitAddressIntoTwoBalancedLines(
        partyAddress,
        usableW - 140,
      );

      const gradient = doc.linearGradient(left, titleY, left + usableW, titleY);
      gradient.stop(0, "#7f1d1d");
      gradient.stop(0.28, "#b91c1c");
      gradient.stop(0.62, "#9333ea");
      gradient.stop(1, "#2563eb");

      doc.font("Helvetica-Bold").fontSize(22).fill(gradient);
      doc.text("STAR ENGINEERING", left, titleY, {
        width: usableW,
        align: "center",
      });

      let y = titleY + 28;

      doc.save();
      doc.lineWidth(2);
      const lineGrad = doc.linearGradient(
        left + 110,
        y,
        left + usableW - 110,
        y,
      );
      lineGrad.stop(0, "#b91c1c");
      lineGrad.stop(0.5, "#a100ff");
      lineGrad.stop(1, "#2563eb");
      doc.strokeColor(lineGrad);
      doc.moveTo(left + 110, y).lineTo(left + usableW - 110, y).stroke();
      doc.restore();

      y += 10;

      doc.fillColor("#111827").font("Helvetica").fontSize(10);
      doc.text("H.N. 303, Sangam C.H.S., Indra Nagar,", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;
      doc.text("Pathan Wadi, R.S. Marg, Malad (E), Mumbai - 400097.", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;
      doc.text("GSTIN: 27BAJPA0708B1ZG  |  Udyam No.: UDYAM-MH-19-0033964", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;
      doc.text("Contact : +91-9702485922  |  E-Mail : corporate@stareng.co.in", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;

      const webGrad = doc.linearGradient(left, y, left + usableW, y);
      webGrad.stop(0, "#b91c1c");
      webGrad.stop(0.4, "#9333ea");
      webGrad.stop(1, "#2563eb");

      doc.font("Helvetica-Bold").fontSize(10).fill(webGrad);
      doc.text("www.stareng.co.in", left, y, {
        width: usableW,
        align: "center",
      });

      y += 24;

      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(16);
      doc.text(String(party.name || "").toUpperCase(), left, y, {
        width: usableW,
        align: "center",
      });

      y += 18;

      if (balancedAddress.line1) {
        doc.font("Helvetica").fontSize(9.5).fillColor("#475569");
        doc.text(balancedAddress.line1, left, y, {
          width: usableW,
          align: "center",
        });
        y += 12;
      }

      if (balancedAddress.line2) {
        doc.font("Helvetica").fontSize(9.5).fillColor("#475569");
        doc.text(balancedAddress.line2, left, y, {
          width: usableW,
          align: "center",
        });
        y += 12;
      }

      if (taxInfoLine) {
        doc.font("Helvetica").fontSize(9).fillColor("#64748b");
        doc.text(taxInfoLine, left, y, {
          width: usableW,
          align: "center",
        });
        y += 12;
      }

      if (contactInfoLine) {
        doc.font("Helvetica").fontSize(9).fillColor("#64748b");
        doc.text(contactInfoLine, left, y, {
          width: usableW,
          align: "center",
        });
        y += 14;
      }

      doc.font("Helvetica").fontSize(12).fillColor("#374151");
      doc.text(reportTitle, left, y, {
        width: usableW,
        align: "center",
      });

      y += 16;

if (!hidePeriodForStatus) {
  doc.font("Helvetica").fontSize(10).fillColor("#6b7280");
  doc.text(
    `Period: ${this.formatPdfDate(fromDate)} to ${this.formatPdfDate(toDate)}`,
    left,
    y,
    {
      width: usableW,
      align: "center",
    },
  );

  y += 18;
} else {
  y += 6;
}

      doc.save();
      doc.lineWidth(1);
      doc.strokeColor("#d1d5db");
      doc.moveTo(left, y).lineTo(left + usableW, y).stroke();
      doc.restore();

      doc.y = y + 10;
      doc.fillColor("#111827");
    };

    const drawTableHeader = (y: number) => {
      y -= 7;

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a");
      doc.text("Date", X.date, y, { width: col.date });
      doc.text("Ref. No.", X.refNo, y, { width: col.refNo });
      doc.text("Bill Amount", X.billAmount, y, {
        width: col.billAmount,
        align: "right",
      });
      doc.text("Pending Amount", X.pendingAmount, y, {
        width: col.pendingAmount,
        align: "right",
      });
      doc.text("Status of Bill", X.status, y, {
        width: col.status,
        align: "left",
      });

      y += 10;

      doc.save();
      doc.lineWidth(0.7);
      doc.strokeColor("#94a3b8");
      doc.moveTo(left, y).lineTo(left + usableW, y).stroke();
      doc.restore();

      y += 6;
      doc.font("Helvetica").fontSize(9).fillColor("#111827");
      return y;
    };

    const drawRow = (
      y: number,
      row: {
        date: string;
        refNo: string;
        billAmount: string;
        pendingAmount: string;
        status: string;
        attachmentUrl?: string;
      },
      opts: {
        isOpening?: boolean;
        isTotal?: boolean;
        totalsLine?: "above" | "below" | "both";
      } = {},
    ) => {
      const h = rowHeight();
      const isOpening = !!opts.isOpening;
      const isTotal = !!opts.isTotal;
      const totalsLine = opts.totalsLine;

      const normalFont = "Helvetica";
      const boldFont = "Helvetica-Bold";

      drawCompressedText(row.date || "", X.date, y, col.date - 4, {
        font: boldFont,
        fontSize: 9,
        minScale: 78,
      });

      const refNoText = String(row.refNo || "").trim();
      const refNoX = X.refNo;
      const refNoY = y;
      const refNoW = col.refNo - 8;
      const attachmentUrl =
        typeof row.attachmentUrl === "string" ? row.attachmentUrl.trim() : "";

      drawCompressedText(refNoText, refNoX, refNoY, refNoW, {
        font: attachmentUrl
          ? boldFont
          : isOpening || isTotal
            ? boldFont
            : normalFont,
        fontSize: 9,
        minScale: 55,
        color: attachmentUrl ? "#2563eb" : "#111827",
      });

      if (
        attachmentUrl &&
        refNoText &&
        Number.isFinite(refNoX) &&
        Number.isFinite(refNoY) &&
        Number.isFinite(refNoW) &&
        refNoW > 0
      ) {
        doc.link(refNoX, refNoY, refNoW, h, attachmentUrl);
      }

      drawCompressedText(row.billAmount || "", X.billAmount, y, col.billAmount - 6, {
        font: isTotal ? boldFont : normalFont,
        fontSize: 9,
        minScale: 80,
        align: "right",
      });

      drawCompressedText(
        row.pendingAmount || "",
        X.pendingAmount,
        y,
        col.pendingAmount - 6,
        {
          font: boldFont,
          fontSize: 9,
          minScale: 80,
          align: "right",
        },
      );

      if (row.status) {
        drawStatusBadge(row.status, X.status, y, col.status - 4);
      }

      if (totalsLine) {
        doc.save();
        doc.lineWidth(0.6);
        doc.strokeColor("#6b7280");

        const drawTotalLine = (lineY: number) => {
          doc
            .moveTo(X.billAmount + 6, lineY)
            .lineTo(X.billAmount + col.billAmount - 2, lineY)
            .stroke();
          doc
            .moveTo(X.pendingAmount + 6, lineY)
            .lineTo(X.pendingAmount + col.pendingAmount - 2, lineY)
            .stroke();
        };

        if (totalsLine === "above") {
          drawTotalLine(y - 2);
        } else if (totalsLine === "below") {
          drawTotalLine(y + h - 1);
        } else if (totalsLine === "both") {
          drawTotalLine(y - 2);
          drawTotalLine(y + h - 3);
        }

        doc.restore();
      }

      return y + h;
    };

    const drawFooter = (pageNo: number) => {
      const footerText =
        "This is a system generated bill-wise statement. No physical signature is required on digitally issued documents.";

      doc.save();
      doc.font("Helvetica").fontSize(7).fillColor("#64748b");

      const footerH = doc.heightOfString(footerText, {
        width: usableW - 70,
        align: "center",
      });

      const footerY = doc.page.height - doc.page.margins.bottom - footerH - 8;

      doc.text(footerText, left, footerY, {
        width: usableW - 70,
        align: "center",
      });

      doc.fillColor("#94a3b8");
      doc.text(`Page ${pageNo}`, left, footerY, {
        width: usableW,
        align: "right",
      });

      doc.restore();
      doc.fillColor("#111827");
    };

    const bottomLimit = () => doc.page.height - bottom - 32;

    let pageNo = 1;
    drawHeader();
    let y = drawTableHeader(doc.y);

   const openingRow =
  showOpeningRowInBillWise &&
  (Math.abs(openingBill) > 0.0001 || Math.abs(openingPending) > 0.0001)
    ? {
        date: this.formatPdfDate(fromDate),
        refNo: "Opening Refs b/d",
        billAmount:
          openingRows[0]?.side
            ? amountWithDrCr(openingBill, openingRows[0].side)
            : money2(openingBill),
        pendingAmount:
          openingRows[0]?.side
            ? amountWithDrCr(openingPending, openingRows[0].side)
            : money2(openingPending),
        status: "",
        attachmentUrl: "",
      }
    : null;

    if (!periodRows.length && !openingRow) {
      if (y + rowHeight() > bottomLimit()) {
        drawFooter(pageNo);
        doc.addPage();
        pageNo++;
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      y = drawRow(y, {
        date: "",
        refNo: "No bill rows found",
        billAmount: "",
        pendingAmount: "",
        status: "",
        attachmentUrl: "",
      });
    } else {
      if (openingRow) {
        if (y + rowHeight() > bottomLimit()) {
          drawFooter(pageNo);
          doc.addPage();
          pageNo++;
          drawHeader();
          y = drawTableHeader(doc.y);
        }

        y = drawRow(y, openingRow, { isOpening: true });
      }

      for (const item of periodRows) {
        if (y + rowHeight() > bottomLimit()) {
          drawFooter(pageNo);
          doc.addPage();
          pageNo++;
          drawHeader();
          y = drawTableHeader(doc.y);
        }

        y = drawRow(y, {
          date: this.formatPdfDate(item.date),
          refNo: item.refNo,
          billAmount: amountWithDrCr(item.billAmount, item.side),
          pendingAmount: amountWithDrCr(item.pendingAmount, item.side),
          status: getStatusLabel(item),
          attachmentUrl: item.attachmentUrl,
        });
      }

     const totalRow = {
  date: "",
  refNo: "Total",
  billAmount:
    periodRows[0]?.side
      ? amountWithDrCr(totalBill, periodRows[0].side)
      : money2(totalBill),
  pendingAmount:
    periodRows[0]?.side
      ? amountWithDrCr(totalPending, periodRows[0].side)
      : money2(totalPending),
  status: "",
  attachmentUrl: "",
};

      if (y + rowHeight() > bottomLimit()) {
        drawFooter(pageNo);
        doc.addPage();
        pageNo++;
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      y = drawRow(y, totalRow, {
        isTotal: true,
        totalsLine: "both",
      });
    }

    drawFooter(pageNo);
    doc.end();
  });

  return {
    fileName: `Bill_Wise_${String(reportTitle).replace(/[^\w]+/g, "_")}_${String(
      party.name || "Party",
    ).replace(/[^\w]+/g, "_")}_${from}_to_${to}.pdf`,
    buffer,
  };
}
async generateOnAccountPdf(params: {
  partyId: string;
  from: string;
  to: string;
}) {
  const { partyId, from, to } = params;

  await this.ensurePartyExists(partyId);

  const party = await this.prisma.user.findUnique({
    where: { id: partyId },
    select: {
      id: true,
      name: true,
      address: true,
      email: true,
      phone: true,
      gstin: true,
      pan: true,
    },
  });

  if (!party) {
    throw new NotFoundException("Party not found.");
  }

  const fromDate = new Date(from);
  const toDate = this.endOfDay(to);

  const transactions = await this.prisma.transaction.findMany({
    where: {
      partyId,
      voucherDate: {
        lte: toDate,
      },
    },
    orderBy: [{ voucherDate: "asc" }, { createdAt: "asc" }],
    include: {
      billRows: {
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const allRows = transactions.flatMap((txn) => {
    const firstAttachment = Array.isArray((txn as any).attachments)
      ? (txn as any).attachments[0]
      : null;

    return (txn.billRows || [])
      .filter((row) => row.allocationType === BillAllocationType.ON_ACCOUNT)
      .map((row) => ({
        date: txn.voucherDate,
        particulars:
          row.side === EntrySide.DR
            ? `To ${txn.particulars || "On Account"}`
            : `By ${txn.particulars || "On Account"}`,
        vchType: String(txn.type || "")
          .toLowerCase()
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        vchNo: txn.voucherNo || "",
        dr: row.side === EntrySide.DR ? Number(row.amount || 0) : 0,
        cr: row.side === EntrySide.CR ? Number(row.amount || 0) : 0,
        attachmentUrl: String(firstAttachment?.fileUrl || "").trim(),
      }));
  });

  const openingRows = allRows.filter((row) => row.date < fromDate);
  const periodRows = allRows.filter(
    (row) => row.date >= fromDate && row.date <= toDate,
  );

  let opening = 0;
  for (const row of openingRows) {
    opening += Number(row.dr || 0) - Number(row.cr || 0);
  }
  opening = Number(opening.toFixed(2));

  let totalDr = opening > 0 ? opening : 0;
  let totalCr = opening < 0 ? Math.abs(opening) : 0;

  for (const row of periodRows) {
    totalDr += Number(row.dr || 0);
    totalCr += Number(row.cr || 0);
  }

  totalDr = Number(totalDr.toFixed(2));
  totalCr = Number(totalCr.toFixed(2));

  const diff = Math.abs(totalDr - totalCr);
  const drGreater = totalDr > totalCr;
  const crGreater = totalCr > totalDr;
  const grandTotal = Math.max(totalDr, totalCr);

  const PDFDocumentKit = require("pdfkit");
  const doc = new PDFDocumentKit({ size: "A4", margin: 36 });
  const chunks: Buffer[] = [];

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    const top = doc.page.margins.top;
    const bottom = doc.page.margins.bottom;
    const usableW = pageW - left - right;

    const col = {
      date: 59,
      particulars: 0,
      vchType: 52,
      vchNo: 76,
      debit: 72,
      credit: 72,
    };

    col.particulars =
      usableW - (col.date + col.vchType + col.vchNo + col.debit + col.credit);

    if (col.particulars < 170) {
      col.date = 58;
      col.vchType = 50;
      col.vchNo = 72;
      col.debit = 68;
      col.credit = 68;

      col.particulars =
        usableW - (col.date + col.vchType + col.vchNo + col.debit + col.credit);
    }

    const X = {
      date: left,
      particulars: left + col.date,
      vchType: left + col.date + col.particulars,
      vchNo: left + col.date + col.particulars + col.vchType,
      debit: left + col.date + col.particulars + col.vchType + col.vchNo,
      credit:
        left +
        col.date +
        col.particulars +
        col.vchType +
        col.vchNo +
        col.debit,
    };

    const money2 = (n: number) => {
      const v = Number(n || 0);
      if (!v) return "";
      return v.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const drawCompressedText = (
      text: string,
      x: number,
      y: number,
      width: number,
      opts: {
        align?: "left" | "right" | "center";
        font?: string;
        fontSize?: number;
        color?: string;
        minScale?: number;
      } = {},
    ) => {
      const {
        align = "left",
        font = "Helvetica",
        fontSize = 9,
        color = "#111827",
        minScale = 55,
      } = opts;

      const value = String(text || "").replace(/\s+/g, " ").trim();
      if (!value) return;

      doc.save();
      doc.font(font).fontSize(fontSize).fillColor(color);

      const naturalWidth = doc.widthOfString(value);
      let scale = 100;

      if (naturalWidth > width && naturalWidth > 0) {
        scale = Math.floor((width / naturalWidth) * 100);
      }

      if (scale < minScale) scale = minScale;

      doc.rect(x, y - 1, width, fontSize + 4).clip();

      let drawX = x;
      const scaledWidth = naturalWidth * (scale / 100);

      if (align === "right") {
        drawX = x + width - scaledWidth;
      } else if (align === "center") {
        drawX = x + (width - scaledWidth) / 2;
      }

      doc.text(value, drawX, y, {
        lineBreak: false,
        horizontalScaling: scale,
      });

      doc.restore();
    };

    const rowHeight = () => 13;

    const drawHeader = () => {
      const titleY = top;

      const partyAddress = String(party.address || "")
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const partyEmail = String(party.email || "").trim();
      const partyPhone = String(party.phone || "").trim();
      const partyGstin = String(party.gstin || "").trim().toUpperCase();
      const partyPan = String(party.pan || "").trim().toUpperCase();

      const taxInfoLine = [
        partyGstin ? `GSTIN: ${partyGstin}` : "",
        partyPan ? `PAN: ${partyPan}` : "",
      ]
        .filter(Boolean)
        .join("  |  ");

      const contactInfoLine = [
        partyPhone ? `Phone: ${partyPhone}` : "",
        partyEmail ? `Email: ${partyEmail}` : "",
      ]
        .filter(Boolean)
        .join("  |  ");

      const splitAddressIntoTwoBalancedLines = (
        text: string,
        maxWidth: number,
      ) => {
        const value = String(text || "").trim();
        if (!value) return { line1: "", line2: "" };

        const words = value.split(" ").filter(Boolean);
        if (words.length <= 1) {
          return { line1: value, line2: "" };
        }

        doc.font("Helvetica").fontSize(9.5);

        let bestIndex = -1;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let i = 1; i < words.length; i++) {
          const line1 = words.slice(0, i).join(" ");
          const line2 = words.slice(i).join(" ");

          const w1 = doc.widthOfString(line1);
          const w2 = doc.widthOfString(line2);

          if (w1 > maxWidth || w2 > maxWidth) continue;

          const score = Math.abs(w1 - w2);
          if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }

        if (bestIndex === -1) {
          let current = "";
          const line1Words: string[] = [];

          for (const word of words) {
            const next = current ? `${current} ${word}` : word;
            if (doc.widthOfString(next) <= maxWidth) {
              current = next;
              line1Words.push(word);
            } else {
              break;
            }
          }

          const used = line1Words.length || 1;

          return {
            line1: words.slice(0, used).join(" "),
            line2: words.slice(used).join(" "),
          };
        }

        return {
          line1: words.slice(0, bestIndex).join(" "),
          line2: words.slice(bestIndex).join(" "),
        };
      };

      const balancedAddress = splitAddressIntoTwoBalancedLines(
        partyAddress,
        usableW - 140,
      );

      const gradient = doc.linearGradient(left, titleY, left + usableW, titleY);
      gradient.stop(0, "#7f1d1d");
      gradient.stop(0.28, "#b91c1c");
      gradient.stop(0.62, "#9333ea");
      gradient.stop(1, "#2563eb");

      doc.font("Helvetica-Bold").fontSize(22).fill(gradient);
      doc.text("STAR ENGINEERING", left, titleY, {
        width: usableW,
        align: "center",
      });

      let y = titleY + 28;

      doc.save();
      doc.lineWidth(2);
      const lineGrad = doc.linearGradient(
        left + 110,
        y,
        left + usableW - 110,
        y,
      );
      lineGrad.stop(0, "#b91c1c");
      lineGrad.stop(0.5, "#a100ff");
      lineGrad.stop(1, "#2563eb");
      doc.strokeColor(lineGrad);
      doc.moveTo(left + 110, y).lineTo(left + usableW - 110, y).stroke();
      doc.restore();

      y += 10;

      doc.fillColor("#111827").font("Helvetica").fontSize(10);
      doc.text("H.N. 303, Sangam C.H.S., Indra Nagar,", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;
      doc.text("Pathan Wadi, R.S. Marg, Malad (E), Mumbai - 400097.", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;
      doc.text("GSTIN: 27BAJPA0708B1ZG  |  Udyam No.: UDYAM-MH-19-0033964", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;
      doc.text("Contact : +91-9702485922  |  E-Mail : corporate@stareng.co.in", left, y, {
        width: usableW,
        align: "center",
      });

      y += 14;

      const webGrad = doc.linearGradient(left, y, left + usableW, y);
      webGrad.stop(0, "#b91c1c");
      webGrad.stop(0.4, "#9333ea");
      webGrad.stop(1, "#2563eb");

      doc.font("Helvetica-Bold").fontSize(10).fill(webGrad);
      doc.text("www.stareng.co.in", left, y, {
        width: usableW,
        align: "center",
      });

      y += 24;

      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(16);
      doc.text(String(party.name || "").toUpperCase(), left, y, {
        width: usableW,
        align: "center",
      });

      y += 18;

      if (balancedAddress.line1) {
        doc.font("Helvetica").fontSize(9.5).fillColor("#475569");
        doc.text(balancedAddress.line1, left, y, {
          width: usableW,
          align: "center",
        });
        y += 12;
      }

      if (balancedAddress.line2) {
        doc.font("Helvetica").fontSize(9.5).fillColor("#475569");
        doc.text(balancedAddress.line2, left, y, {
          width: usableW,
          align: "center",
        });
        y += 12;
      }

      if (taxInfoLine) {
        doc.font("Helvetica").fontSize(9).fillColor("#64748b");
        doc.text(taxInfoLine, left, y, {
          width: usableW,
          align: "center",
        });
        y += 12;
      }

      if (contactInfoLine) {
        doc.font("Helvetica").fontSize(9).fillColor("#64748b");
        doc.text(contactInfoLine, left, y, {
          width: usableW,
          align: "center",
        });
        y += 14;
      }

      doc.font("Helvetica").fontSize(12).fillColor("#374151");
      doc.text("On Account", left, y, {
        width: usableW,
        align: "center",
      });

      y += 16;
      doc.font("Helvetica").fontSize(10).fillColor("#6b7280");
      doc.text(
        `Period: ${this.formatPdfDate(fromDate)} to ${this.formatPdfDate(toDate)}`,
        left,
        y,
        {
          width: usableW,
          align: "center",
        },
      );

      y += 18;

      doc.save();
      doc.lineWidth(1);
      doc.strokeColor("#d1d5db");
      doc.moveTo(left, y).lineTo(left + usableW, y).stroke();
      doc.restore();

      doc.y = y + 10;
      doc.fillColor("#111827");
    };

    const drawTableHeader = (y: number) => {
      y -= 7;

      doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
      doc.text("Date", X.date, y, { width: col.date });

      doc.font("Helvetica-Bold");
      doc.text("Particulars", X.particulars, y, { width: col.particulars });

      doc.font("Helvetica");
      doc.text("Vch Type", X.vchType, y, { width: col.vchType });
      doc.text("Vch No.", X.vchNo, y, { width: col.vchNo, align: "right" });

      doc.font("Helvetica-Bold");
      doc.text("Debit", X.debit, y, { width: col.debit, align: "right" });
      doc.text("Credit", X.credit, y, { width: col.credit, align: "right" });

      y += 10;

      doc.save();
      doc.lineWidth(0.8);
      doc.strokeColor("#94a3b8");
      doc.moveTo(left, y).lineTo(left + usableW, y).stroke();
      doc.restore();

      y += 6;
      doc.font("Helvetica").fontSize(9).fillColor("#111827");
      return y;
    };

    const drawRow = (
      y: number,
      row: {
        date: string;
        particulars: string;
        vchType: string;
        vchNo: string;
        dr: number;
        cr: number;
        attachmentUrl?: string;
      },
      opts: {
        isOpening?: boolean;
        isGrandTotal?: boolean;
        totalsLine?: "above" | "below" | "both";
      } = {},
    ) => {
      const h = rowHeight();
      const isOpening = !!opts.isOpening;
      const isGrandTotal = !!opts.isGrandTotal;
      const totalsLine = opts.totalsLine;

      const normalFont = "Helvetica";
      const boldFont = "Helvetica-Bold";

      drawCompressedText(row.date || "", X.date, y, col.date - 4, {
        font: normalFont,
        fontSize: 9,
        minScale: 78,
      });

      const particularsText = String(row.particulars || "").trim();
      const prefixMatch = particularsText.match(/^(To|By)\s+(.*)$/i);

      if (prefixMatch) {
        const prefix = prefixMatch[1];
        const rest = prefixMatch[2];

        doc.font(normalFont).fontSize(9);
        const prefixWidth = doc.widthOfString(prefix + " ");

        drawCompressedText(prefix + " ", X.particulars, y, prefixWidth + 2, {
          font: normalFont,
          fontSize: 9,
          minScale: 100,
        });

        drawCompressedText(
          rest,
          X.particulars + prefixWidth,
          y,
          col.particulars - prefixWidth - 8,
          {
            font: boldFont,
            fontSize: 9,
            minScale: 42,
          },
        );
      } else {
        drawCompressedText(
          particularsText,
          X.particulars,
          y,
          col.particulars - 8,
          {
            font: boldFont,
            fontSize: 9,
            minScale: 42,
          },
        );
      }

      drawCompressedText(row.vchType || "", X.vchType, y, col.vchType - 4, {
        font: boldFont,
        fontSize: 8.5,
        minScale: 58,
      });

      const voucherNoText = String(row.vchNo || "").trim();
      const voucherNoX = X.vchNo + 5;
      const voucherNoY = y;
      const voucherNoW = col.vchNo - 6;
      const attachmentUrl =
        typeof row.attachmentUrl === "string" ? row.attachmentUrl.trim() : "";

      drawCompressedText(voucherNoText, voucherNoX, voucherNoY, voucherNoW, {
        font: attachmentUrl ? boldFont : normalFont,
        fontSize: 9,
        minScale: 58,
        align: "right",
        color: attachmentUrl ? "#2563eb" : "#111827",
      });

      if (
        attachmentUrl &&
        voucherNoText &&
        Number.isFinite(voucherNoX) &&
        Number.isFinite(voucherNoY) &&
        Number.isFinite(voucherNoW) &&
        voucherNoW > 0
      ) {
        doc.link(voucherNoX, voucherNoY, voucherNoW, h, attachmentUrl);
      }

      const debitFont = isOpening || isGrandTotal ? boldFont : normalFont;
      const creditFont = isOpening || isGrandTotal ? boldFont : normalFont;

      drawCompressedText(money2(row.dr), X.debit, y, col.debit - 2, {
        font: debitFont,
        fontSize: 9,
        minScale: 85,
        align: "right",
      });

      drawCompressedText(money2(row.cr), X.credit, y, col.credit - 2, {
        font: creditFont,
        fontSize: 9,
        minScale: 85,
        align: "right",
      });

      if (totalsLine) {
        doc.save();
        doc.lineWidth(0.6);
        doc.strokeColor("#6b7280");

        const drawTotalLine = (lineY: number) => {
          doc
            .moveTo(X.debit + 6, lineY)
            .lineTo(X.debit + col.debit - 2, lineY)
            .stroke();
          doc
            .moveTo(X.credit + 6, lineY)
            .lineTo(X.credit + col.credit - 2, lineY)
            .stroke();
        };

        if (totalsLine === "above") {
          drawTotalLine(y - 2);
        } else if (totalsLine === "below") {
          drawTotalLine(y + h - 1);
        } else if (totalsLine === "both") {
          drawTotalLine(y - 2);
          drawTotalLine(y + h - 3);
        }

        doc.restore();
      }

      return y + h;
    };

    const drawFooter = (pageNo: number) => {
      const footerText =
        "This is a system generated on-account statement. No physical signature is required on digitally issued documents.";

      doc.save();
      doc.font("Helvetica").fontSize(7).fillColor("#64748b");

      const footerH = doc.heightOfString(footerText, {
        width: usableW - 70,
        align: "center",
      });

      const footerY = doc.page.height - doc.page.margins.bottom - footerH - 8;

      doc.text(footerText, left, footerY, {
        width: usableW - 70,
        align: "center",
      });

      doc.fillColor("#94a3b8");
      doc.text(`Page ${pageNo}`, left, footerY, {
        width: usableW,
        align: "right",
      });

      doc.restore();
      doc.fillColor("#111827");
    };

    const bottomLimit = () => doc.page.height - bottom - 32;

    let pageNo = 1;
    drawHeader();
    let y = drawTableHeader(doc.y);

    const openingRow = {
      date: this.formatPdfDate(fromDate),
      particulars:
        opening >= 0 ? "To Opening Balance b/d" : "By Opening Balance b/d",
      vchType: "",
      vchNo: "",
      dr: opening > 0 ? opening : 0,
      cr: opening < 0 ? Math.abs(opening) : 0,
      attachmentUrl: "",
    };

    if (Math.abs(Number(opening || 0)) > 0.0001) {
      if (y + rowHeight() > bottomLimit()) {
        drawFooter(pageNo);
        doc.addPage();
        pageNo++;
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      y = drawRow(y, openingRow, { isOpening: true });
    }

    for (const row of periodRows) {
      if (y + rowHeight() > bottomLimit()) {
        drawFooter(pageNo);
        doc.addPage();
        pageNo++;
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      y = drawRow(y, {
        date: this.formatPdfDate(row.date),
        particulars: row.particulars,
        vchType: row.vchType,
        vchNo: row.vchNo,
        dr: row.dr,
        cr: row.cr,
        attachmentUrl: row.attachmentUrl,
      });
    }

    const subTotalRow = {
      date: "",
      particulars: "",
      vchType: "",
      vchNo: "",
      dr: totalDr,
      cr: totalCr,
      attachmentUrl: "",
    };

    if (diff === 0) {
      if (y + rowHeight() > bottomLimit()) {
        drawFooter(pageNo);
        doc.addPage();
        pageNo++;
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      y = drawRow(y, subTotalRow, {
        isGrandTotal: true,
        totalsLine: "both",
      });
    } else {
      if (y + rowHeight() > bottomLimit()) {
        drawFooter(pageNo);
        doc.addPage();
        pageNo++;
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      y = drawRow(y, subTotalRow, {
        totalsLine: "above",
      });

      const closingRow = {
        date: "",
        particulars:
          drGreater ? "By Closing Balance c/d" : "To Closing Balance c/d",
        vchType: "",
        vchNo: "",
        dr: crGreater ? diff : 0,
        cr: drGreater ? diff : 0,
        attachmentUrl: "",
      };

      if (y + rowHeight() > bottomLimit()) {
        drawFooter(pageNo);
        doc.addPage();
        pageNo++;
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      y = drawRow(y, closingRow);

      const grandRow = {
        date: "",
        particulars: "",
        vchType: "",
        vchNo: "",
        dr: grandTotal,
        cr: grandTotal,
        attachmentUrl: "",
      };

      if (y + rowHeight() > bottomLimit()) {
        drawFooter(pageNo);
        doc.addPage();
        pageNo++;
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      y = drawRow(y, grandRow, {
        isGrandTotal: true,
        totalsLine: "both",
      });
    }

    drawFooter(pageNo);
    doc.end();
  });

  return {
    fileName: `On_Account_${String(party.name || "Party").replace(
      /[^\w]+/g,
      "_",
    )}_${from}_to_${to}.pdf`,
    buffer,
  };
}
}