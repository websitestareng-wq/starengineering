import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { Resend } from "resend";
import * as fs from "fs/promises";
import * as path from "path";

@Injectable()
export class TransactionsEmailService {
  private readonly resend: Resend;
  private readonly mailFrom: string;
  private readonly portalUrl: string;
  private readonly logger = new Logger(TransactionsEmailService.name);

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }

    this.mailFrom = process.env.MAIL_FROM || "noreply@mail.stareng.co.in";
    this.portalUrl = process.env.PORTAL_URL || "https://www.stareng.co.in";

    this.resend = new Resend(apiKey);
  }

  async sendSingle(transactionId: string) {
    const transaction = await this.loadTransaction(transactionId);

    if (!transaction.party?.email?.trim()) {
      throw new BadRequestException(
        "Selected transaction party does not have an email address.",
      );
    }

    const { subject, html } = await this.buildEmail(transaction);
    const attachments = this.buildAttachments(transaction);

    try {
      const { error } = await this.resend.emails.send({
        from: this.mailFrom,
        to: [transaction.party.email.trim()],
        subject,
        html,
        attachments,
      });

      if (error) {
        throw new Error(
          typeof error.message === "string"
            ? error.message
            : "Failed to send email.",
        );
      }

      return {
        success: true,
        message: `Email sent for ${transaction.voucherNo}.`,
      };
    } catch (err) {
      this.logger.error("Email send failed", err);
      throw new BadRequestException("Failed to send email.");
    }
  }

  async sendBulk(transactionIds: string[]) {
    let successCount = 0;

    for (const id of transactionIds) {
      try {
        await this.sendSingle(id);
        successCount += 1;
      } catch {
        continue;
      }
    }

    return {
      success: true,
      message: `${successCount} email(s) sent successfully.`,
      total: successCount,
    };
  }

  async sendIfEnabled(transactionId: string) {
    try {
      const transaction = await this.loadTransaction(transactionId);

      if (!transaction.sendEmail) return;
      if (!transaction.party?.email?.trim()) return;

      const { subject, html } = await this.buildEmail(transaction);
      const attachments = this.buildAttachments(transaction);

      await this.resend.emails.send({
        from: this.mailFrom,
        to: [transaction.party.email.trim()],
        subject,
        html,
        attachments,
      });
    } catch (error) {
      // IMPORTANT: Do not break transaction creation
      this.logger.error(
        "Email send failed (ignored to avoid transaction rollback)",
        error,
      );
    }
  }

 private buildAttachments(transaction: any) {
  const attachments: Array<{
    filename: string;
    path: string;
  }> = [];

  if (Array.isArray(transaction.attachments)) {
    for (const item of transaction.attachments) {
      if (!item?.fileUrl?.trim()) continue;

      attachments.push({
        filename: item.fileName?.trim() || "attachment",
        path: item.fileUrl.trim(),
      });
    }
  }

  return attachments;
}

  private async loadTransaction(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        party: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        attachments: true,
        billRows: {
          include: {
            againstBillRow: {
              include: {
                transaction: {
                  select: {
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
      },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found.");
    }

    return transaction;
  }

  private async buildEmail(transaction: any) {
    const templateName = this.getTemplateName(transaction.type);
    const templatePath = path.join(
      process.cwd(),
      "src",
      "modules",
      "transactions",
      "email-templates",
      templateName,
    );

    let html = await fs.readFile(templatePath, "utf-8");

    const primaryRef =
      transaction.billRows.find(
        (row: any) =>
          row.allocationType === "NEW_REF" || row.allocationType === "ADVANCE",
      )?.refNo || transaction.voucherNo;

    const replacements: Record<string, string> = {
      party_name: transaction.party?.name || "Customer",
      VoucherNo: transaction.voucherNo,
      voucher_no: transaction.voucherNo,
      invoice_no: transaction.voucherNo,
      receipt_no: transaction.voucherNo,
      note_no: transaction.voucherNo,
      purchase_ref: primaryRef,
      invoice_date: this.formatDate(transaction.voucherDate),
      purchase_date: this.formatDate(transaction.voucherDate),
      receipt_date: this.formatDate(transaction.voucherDate),
      note_date: this.formatDate(transaction.voucherDate),
      advice_date: this.formatDate(transaction.voucherDate),
      invoice_amt: this.formatAmount(transaction.amount),
      total_amount: this.formatAmount(transaction.amount),
      amount: this.formatAmount(transaction.amount),
      narration: transaction.particulars || "—",
      drcr: transaction.side,
      login_url: this.portalUrl,
    };

    html = this.replaceTokens(html, replacements);

    const subject = `${this.getSubjectPrefix(
      transaction.type,
    )} - ${transaction.voucherNo}`;

    return { subject, html };
  }

  private replaceTokens(html: string, replacements: Record<string, string>) {
    let output = html;

    for (const [key, value] of Object.entries(replacements)) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      output = output.replace(pattern, value ?? "");
    }

    return output;
  }

  private getTemplateName(type: TransactionType) {
    switch (type) {
      case "SALES":
        return "salesInvoice.html";
      case "PURCHASE":
        return "purchaseInvoice.html";
      case "PAYMENT":
        return "paymentAdvice.html";
      case "RECEIPT":
        return "receiptVoucher.html";
      case "DEBIT_NOTE":
        return "debitNote.html";
      case "CREDIT_NOTE":
        return "creditNote.html";
      case "JOURNAL_DR":
      case "JOURNAL_CR":
        return "journalAdvice.html";
      default:
        return "salesInvoice.html";
    }
  }

  private getSubjectPrefix(type: TransactionType) {
    switch (type) {
      case "SALES":
        return "Sales Invoice";
      case "PURCHASE":
        return "Purchase Invoice";
      case "PAYMENT":
        return "Payment Advice";
      case "RECEIPT":
        return "Receipt Voucher";
      case "DEBIT_NOTE":
        return "Debit Note";
      case "CREDIT_NOTE":
        return "Credit Note";
      case "JOURNAL_DR":
      case "JOURNAL_CR":
        return "Journal Advice";
      default:
        return "Transaction Advice";
    }
  }

  private formatDate(value: Date | string) {
    const date = new Date(value);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  private formatAmount(value: number | string) {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }
}