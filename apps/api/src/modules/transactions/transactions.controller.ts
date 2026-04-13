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
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { TransactionsService } from "./transactions.service";
import { TransactionsEmailService } from "./transactions-email.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";
import { BulkSendTransactionEmailDto } from "./dto/bulk-send-transaction-email.dto";

type TransactionUploadFiles = {
  mainDocument?: Express.Multer.File[];
  attachments?: Express.Multer.File[];
};

@Controller("transactions")
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly transactionsEmailService: TransactionsEmailService,
  ) {}

  @Get()
  findAll(@Query() query: QueryTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get("open-refs")
  getOpenRefs(
    @Query("partyId") partyId: string,
    @Query("asOf") asOf?: string,
  ) {
    return this.transactionsService.getOpenRefs(partyId, asOf);
  }
    @Get("reports/ledger")
getLedger(
  @Query("partyId") partyId: string,
  @Query("from") from?: string,
  @Query("to") to?: string,
  @Query("skipOpeningBalance") skipOpeningBalance?: string,
) {
  if (!partyId) {
    throw new BadRequestException("partyId is required.");
  }

  if (!from || !to) {
    const fy = this.transactionsService.getCurrentFinancialYear();
    from = fy.from;
    to = fy.to;
  }

  return this.transactionsService.getLedgerReport({
    partyId,
    from,
    to,
    skipOpeningBalance:
      skipOpeningBalance === "true" || skipOpeningBalance === "1",
  });
}
  @Get("reports/ledger/pdf")
  async getLedgerPdf(
    @Query("partyId") partyId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("skipOpeningBalance") skipOpeningBalance?: string,
    @Res() res?: Response,
  ) {
    if (!partyId) {
      throw new BadRequestException("partyId is required.");
    }

    if (!from || !to) {
      const fy = this.transactionsService.getCurrentFinancialYear();
      from = fy.from;
      to = fy.to;
    }

    const file = await this.transactionsService.generateLedgerPdf({
      partyId,
      from,
      to,
      skipOpeningBalance:
        skipOpeningBalance === "true" || skipOpeningBalance === "1",
    });

    res!.setHeader("Content-Type", "application/pdf");
    res!.setHeader(
      "Content-Disposition",
      `inline; filename="${file.fileName}"`,
    );

    return res!.send(file.buffer);
  }
  @Get("reports/bill-wise/pdf")
async getBillWisePdf(
  @Query("partyId") partyId: string,
  @Query("from") from?: string,
  @Query("to") to?: string,
  @Query("mode") mode?: string,
  @Query("status") status?: string,
  @Res() res?: Response,
) {
  if (!partyId) {
    throw new BadRequestException("partyId is required.");
  }

  if (!from || !to) {
    const fy = this.transactionsService.getCurrentFinancialYear();
    from = fy.from;
    to = fy.to;
  }

  const file = await this.transactionsService.generateBillWisePdf({
    partyId,
    from,
    to,
    mode,
    status,
  });

  res!.setHeader("Content-Type", "application/pdf");
  res!.setHeader(
    "Content-Disposition",
    `inline; filename="${file.fileName}"`,
  );

  return res!.send(file.buffer);
}
@Get("reports/on-account/pdf")
async getOnAccountPdf(
  @Query("partyId") partyId: string,
  @Query("from") from?: string,
  @Query("to") to?: string,
  @Res() res?: Response,
) {
  if (!partyId) {
    throw new BadRequestException("partyId is required.");
  }

  if (!from || !to) {
    const fy = this.transactionsService.getCurrentFinancialYear();
    from = fy.from;
    to = fy.to;
  }

  const file = await this.transactionsService.generateOnAccountPdf({
    partyId,
    from,
    to,
  });

  res!.setHeader("Content-Type", "application/pdf");
  res!.setHeader(
    "Content-Disposition",
    `inline; filename="${file.fileName}"`
  );

  return res!.send(file.buffer);
}
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post("parse-document")
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: "mainDocument", maxCount: 1 }],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 15 * 1024 * 1024,
        },
      },
    ),
  )
  parseDocument(@UploadedFiles() files: TransactionUploadFiles) {
    return this.transactionsService.parseMainDocument(
      files?.mainDocument?.[0] ?? null,
    );
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "mainDocument", maxCount: 1 },
        { name: "attachments", maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 15 * 1024 * 1024,
          files: 11,
        },
      },
    ),
  )
  create(
    @Body() body: Record<string, any>,
    @UploadedFiles() files: TransactionUploadFiles,
  ) {
    const dto: CreateTransactionDto = {
      voucherNo: String(body.voucherNo || ""),
      voucherDate: String(body.voucherDate || ""),
      type: body.type,
      side: body.side,
      amount: Number(body.amount || 0),
      particulars: String(body.particulars || ""),
      sendEmail:
        body.sendEmail === true ||
        body.sendEmail === "true" ||
        body.sendEmail === "1",
      partyId: String(body.partyId || ""),
      createdById: body.createdById ? String(body.createdById) : undefined,
      billRows: (() => {
        try {
          const parsed =
            typeof body.billRows === "string"
              ? JSON.parse(body.billRows)
              : Array.isArray(body.billRows)
                ? body.billRows
                : [];

          return Array.isArray(parsed)
            ? parsed.map((row: any) => ({
                allocationType: row?.allocationType,
                side: row?.side,
                refNo: row?.refNo ? String(row.refNo) : undefined,
                againstBillRowId: row?.againstBillRowId
                  ? String(row.againstBillRowId)
                  : undefined,
                amount: Number(row?.amount || 0),
              }))
            : [];
        } catch {
          return [];
        }
      })(),
    };

    console.log("RAW BODY:", body);
    console.log("PARSED DTO:", dto);
    console.log("PARSED DTO billRows:", dto.billRows);

    return this.transactionsService.create(dto, {
      mainDocument: files?.mainDocument?.[0] ?? null,
      attachments: files?.attachments ?? [],
    });
  }

  @Patch(":id")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "mainDocument", maxCount: 1 },
        { name: "attachments", maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 15 * 1024 * 1024,
          files: 11,
        },
      },
    ),
  )
  update(
    @Param("id") id: string,
    @Body() body: Record<string, any>,
    @UploadedFiles() files: TransactionUploadFiles,
  ) {
    const dto: UpdateTransactionDto = {
      voucherNo: body.voucherNo ? String(body.voucherNo) : undefined,
      voucherDate: body.voucherDate ? String(body.voucherDate) : undefined,
      type: body.type || undefined,
      side: body.side || undefined,
      amount:
        body.amount !== undefined && body.amount !== null
          ? Number(body.amount)
          : undefined,
      particulars: body.particulars ? String(body.particulars) : undefined,
      sendEmail:
        body.sendEmail === undefined
          ? undefined
          : body.sendEmail === true ||
            body.sendEmail === "true" ||
            body.sendEmail === "1",
      partyId: body.partyId ? String(body.partyId) : undefined,
      createdById: body.createdById ? String(body.createdById) : undefined,
      billRows: (() => {
        try {
          const parsed =
            typeof body.billRows === "string"
              ? JSON.parse(body.billRows)
              : Array.isArray(body.billRows)
                ? body.billRows
                : undefined;

          if (!Array.isArray(parsed)) return undefined;

          return parsed.map((row: any) => ({
            allocationType: row?.allocationType,
            side: row?.side,
            refNo: row?.refNo ? String(row.refNo) : undefined,
            againstBillRowId: row?.againstBillRowId
              ? String(row.againstBillRowId)
              : undefined,
            amount: Number(row?.amount || 0),
          }));
        } catch {
          return undefined;
        }
      })(),
    };

    console.log("RAW UPDATE BODY:", body);
    console.log("PARSED UPDATE DTO:", dto);
    console.log("PARSED UPDATE billRows:", dto.billRows);

    return this.transactionsService.update(id, dto, {
  mainDocument: files?.mainDocument?.[0] ?? null,
  attachments: files?.attachments ?? [],
  removeAttachmentIds: (() => {
    try {
      const parsed =
        typeof body.removeAttachmentIds === "string"
          ? JSON.parse(body.removeAttachmentIds)
          : Array.isArray(body.removeAttachmentIds)
            ? body.removeAttachmentIds
            : [];

      return Array.isArray(parsed)
        ? parsed.map((id: any) => String(id)).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  })(),
});
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.transactionsService.remove(id);
  }

  @Post(":id/send-email")
  sendTransactionEmail(@Param("id") id: string) {
    return this.transactionsEmailService.sendSingle(id);
  }

  @Post("bulk-send-email")
  bulkSendTransactionEmails(@Body() dto: BulkSendTransactionEmailDto) {
    return this.transactionsEmailService.sendBulk(dto.transactionIds);
  }
    @Get(":id/download")
  async downloadMergedAttachment(
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const file = await this.transactionsService.getMergedAttachmentForDownload(id);

    res.setHeader("Content-Type", file.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.fileName}"`,
    );

    return res.send(file.buffer);
  }
}