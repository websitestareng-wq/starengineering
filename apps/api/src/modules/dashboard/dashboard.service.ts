import { Injectable } from "@nestjs/common";
import {
  $Enums,
  BillAllocationType,
  EntrySide,
  Prisma,
  TransactionType,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type DashboardMonthlyBucket = {
  monthKey: string;
  monthLabel: string;
  sales: number;
  purchase: number;
  receipt: number;
  payment: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  getCurrentFinancialYear() {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

    const from = new Date(startYear, 3, 1);
    const to = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }
async getOverview(params: {
  from?: string;
  to?: string;
  partyId?: string;
  role?: string;
}) {
    const fy = this.getCurrentFinancialYear();

    const from = params.from || fy.from;
    const to = params.to || fy.to;
 const partyId =
  params.role === "USER"
    ? params.partyId // already forced from controller
    : params.partyId && params.partyId !== "all"
    ? params.partyId
    : undefined;

    const fromDate = new Date(from);
    const toDate = this.endOfDay(to);

    const transactionWhere: Prisma.TransactionWhereInput = {
      voucherDate: {
        gte: fromDate,
        lte: toDate,
      },
      ...(partyId ? { partyId } : {}),
    };

    const allTransactionWhere: Prisma.TransactionWhereInput = {
      ...(partyId ? { partyId } : {}),
    };

    const customerWhere: Prisma.UserWhereInput = {
      role: UserRole.USER,
      ...(partyId ? { id: partyId } : {}),
    };

    const [
      parties,
      customersCount,
      activeCustomersCount,
      transactions,
      allTransactionsForOutstanding,
      recentTransactions,
      recentCustomers,
      reminderSummary,
      documentSummary,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: UserRole.USER,
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gstin: true,
          pan: true,
        },
      }),

      this.prisma.user.count({
        where: customerWhere,
      }),

      this.prisma.user.count({
        where: {
          ...customerWhere,
          isActive: true,
        },
      }),

      this.prisma.transaction.findMany({
        where: transactionWhere,
        orderBy: [{ voucherDate: "asc" }, { createdAt: "asc" }],
        include: {
          party: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          attachments: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      }),

      this.prisma.transaction.findMany({
        where: allTransactionWhere,
        orderBy: [{ voucherDate: "asc" }, { createdAt: "asc" }],
        include: {
          billRows: true,
          party: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      this.prisma.transaction.findMany({
        where: transactionWhere,
        orderBy: [{ voucherDate: "desc" }, { createdAt: "desc" }],
        take: 8,
        include: {
          party: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          attachments: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      }),

      this.prisma.user.findMany({
        where: customerWhere,
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gstin: true,
          pan: true,
          isActive: true,
          createdAt: true,
        },
      }),

      this.prisma.reminder.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),

      this.prisma.documentFile.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
        select: {
          id: true,
          name: true,
          originalName: true,
          fileUrl: true,
          mimeType: true,
          createdAt: true,
        },
      }),
    ]);

    const totals = {
      sales: 0,
      purchase: 0,
      receipt: 0,
      payment: 0,
      debitNote: 0,
      creditNote: 0,
      journalDr: 0,
      journalCr: 0,
      totalTransactionAmount: 0,
    };

    for (const txn of transactions) {
      const amount = Number(txn.amount || 0);

      totals.totalTransactionAmount += amount;

      switch (txn.type) {
        case TransactionType.SALES:
          totals.sales += amount;
          break;
        case TransactionType.PURCHASE:
          totals.purchase += amount;
          break;
        case TransactionType.RECEIPT:
          totals.receipt += amount;
          break;
        case TransactionType.PAYMENT:
          totals.payment += amount;
          break;
        case TransactionType.DEBIT_NOTE:
          totals.debitNote += amount;
          break;
        case TransactionType.CREDIT_NOTE:
          totals.creditNote += amount;
          break;
        case TransactionType.JOURNAL_DR:
          totals.journalDr += amount;
          break;
        case TransactionType.JOURNAL_CR:
          totals.journalCr += amount;
          break;
      }
    }

    const monthlyMap = new Map<string, DashboardMonthlyBucket>();

    for (const txn of transactions) {
      const date = new Date(txn.voucherDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          monthKey,
          monthLabel,
          sales: 0,
          purchase: 0,
          receipt: 0,
          payment: 0,
        });
      }

      const bucket = monthlyMap.get(monthKey)!;
      const amount = Number(txn.amount || 0);

      if (txn.type === TransactionType.SALES) bucket.sales += amount;
      if (txn.type === TransactionType.PURCHASE) bucket.purchase += amount;
      if (txn.type === TransactionType.RECEIPT) bucket.receipt += amount;
      if (txn.type === TransactionType.PAYMENT) bucket.payment += amount;
    }

    const monthlyTrend = Array.from(monthlyMap.values()).map((item) => ({
      ...item,
      sales: this.round2(item.sales),
      purchase: this.round2(item.purchase),
      receipt: this.round2(item.receipt),
      payment: this.round2(item.payment),
    }));

    const voucherTypeDistribution = [
      { name: "Sales", value: this.round2(totals.sales) },
      { name: "Purchase", value: this.round2(totals.purchase) },
      { name: "Receipt", value: this.round2(totals.receipt) },
      { name: "Payment", value: this.round2(totals.payment) },
      { name: "Debit Note", value: this.round2(totals.debitNote) },
      { name: "Credit Note", value: this.round2(totals.creditNote) },
      { name: "Journal Dr", value: this.round2(totals.journalDr) },
      { name: "Journal Cr", value: this.round2(totals.journalCr) },
    ].filter((item) => item.value > 0);
    const topPartyTypeMaps = {
  sales: new Map<string, { partyId: string; partyName: string; amount: number }>(),
  purchase: new Map<string, { partyId: string; partyName: string; amount: number }>(),
  receipt: new Map<string, { partyId: string; partyName: string; amount: number }>(),
  payment: new Map<string, { partyId: string; partyName: string; amount: number }>(),
};

    const partyBusinessMap = new Map<
      string,
      { partyId: string; partyName: string; amount: number }
    >();

    for (const txn of transactions) {
      const key = txn.partyId;
      const amount = Number(txn.amount || 0);
      const existing = partyBusinessMap.get(key);

      if (existing) {
        existing.amount += amount;
      } else {
        partyBusinessMap.set(key, {
          partyId: txn.partyId,
          partyName: txn.party?.name || "Unknown Party",
          amount,
        });
      }
    }
for (const txn of transactions) {
  const amount = Number(txn.amount || 0);
  const baseItem = {
    partyId: txn.partyId,
    partyName: txn.party?.name || "Unknown Party",
    amount,
  };

  const applyToMap = (
    map: Map<string, { partyId: string; partyName: string; amount: number }>,
  ) => {
    const existing = map.get(txn.partyId);
    if (existing) {
      existing.amount += amount;
    } else {
      map.set(txn.partyId, baseItem);
    }
  };

  if (txn.type === TransactionType.SALES) applyToMap(topPartyTypeMaps.sales);
  if (txn.type === TransactionType.PURCHASE) applyToMap(topPartyTypeMaps.purchase);
  if (txn.type === TransactionType.RECEIPT) applyToMap(topPartyTypeMaps.receipt);
  if (txn.type === TransactionType.PAYMENT) applyToMap(topPartyTypeMaps.payment);
}
    const topParties = Array.from(partyBusinessMap.values())
      .map((item) => ({
        ...item,
        amount: this.round2(item.amount),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
const topPartiesByType = {
  sales: Array.from(topPartyTypeMaps.sales.values())
    .map((item) => ({ ...item, amount: this.round2(item.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5),

  purchase: Array.from(topPartyTypeMaps.purchase.values())
    .map((item) => ({ ...item, amount: this.round2(item.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5),

  receipt: Array.from(topPartyTypeMaps.receipt.values())
    .map((item) => ({ ...item, amount: this.round2(item.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5),

  payment: Array.from(topPartyTypeMaps.payment.values())
    .map((item) => ({ ...item, amount: this.round2(item.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5),
};
    const outstanding = this.computeOutstanding(allTransactionsForOutstanding, {
      fromDate,
      toDate,
    });
const lifetimeBillwise = this.computeLifetimeBillwise(allTransactionsForOutstanding, {
  toDate,
});

const finalClosing = this.computeFinalClosing(lifetimeBillwise);
    const recentTransactionItems = recentTransactions.map((txn) => ({
      id: txn.id,
      voucherNo: txn.voucherNo,
      voucherDate: txn.voucherDate,
      type: txn.type,
      side: txn.side,
      amount: Number(txn.amount || 0),
      particulars: txn.particulars,
      party: txn.party,
      attachmentUrl: String(txn.attachments?.[0]?.fileUrl || "").trim(),
    }));

    const reminderCounts = {
      active: 0,
      completed: 0,
      stopped: 0,
    };

    for (const row of reminderSummary) {
      if (row.status === "ACTIVE") reminderCounts.active = row._count._all;
      if (row.status === "COMPLETED") reminderCounts.completed = row._count._all;
      if (row.status === "STOPPED") reminderCounts.stopped = row._count._all;
    }

    return {
      filters: {
        from,
        to,
        partyId: partyId || "all",
      },
      parties: params.role === "USER" ? [] : parties,
summary: {
  totalCustomers: customersCount,
  activeCustomers: activeCustomersCount,
  totalTransactions: transactions.length,
  totalTransactionAmount: this.round2(totals.totalTransactionAmount),

  totalSales: this.round2(totals.sales),
  totalPurchase: this.round2(totals.purchase),
  totalReceipts: this.round2(totals.receipt),
  totalPayments: this.round2(totals.payment),

  totalDebitNote: this.round2(totals.debitNote),
  totalCreditNote: this.round2(totals.creditNote),
  totalJournalDr: this.round2(totals.journalDr),
  totalJournalCr: this.round2(totals.journalCr),

  outstandingReceivable: this.round2(outstanding.receivable),
  outstandingPayable: this.round2(outstanding.payable),

  billsReceivableClosing: this.round2(lifetimeBillwise.billsReceivableClosing),
  billsPayableClosing: this.round2(lifetimeBillwise.billsPayableClosing),
  unraisedInvoiceClosing: this.round2(lifetimeBillwise.unraisedInvoiceClosing),
  unreceivedInvoiceClosing: this.round2(lifetimeBillwise.unreceivedInvoiceClosing),
  onAccountClosing: this.round2(lifetimeBillwise.onAccountClosing.amount),
  onAccountClosingSide: lifetimeBillwise.onAccountClosing.side,

  finalClosingAmount: this.round2(finalClosing.amount),
  finalClosingSide: finalClosing.side,
  finalClosingLabel: finalClosing.label,
},
      charts: {
        monthlyTrend,
        voucherTypeDistribution,
        receivableVsPayable: [
          {
            name: "Receivable",
            value: this.round2(outstanding.receivable),
          },
          {
            name: "Payable",
            value: this.round2(outstanding.payable),
          },
        ],
        topParties,
topPartiesByType,
      },
      recentTransactions: recentTransactionItems,
      recentCustomers,
      reminders: reminderCounts,
      recentDocuments: documentSummary,
    };
  }

  private computeOutstanding(
    transactions: Array<{
      id: string;
      voucherDate: Date;
      billRows: Array<{
        id: string;
        allocationType: BillAllocationType;
        side: EntrySide;
        amount: Prisma.Decimal;
        againstBillRowId: string | null;
      }>;
    }>,
    range: {
      fromDate: Date;
      toDate: Date;
    },
  ) {
    const openBaseRows = new Map<
      string,
      { id: string; voucherDate: Date; side: EntrySide; originalAmount: number }
    >();

    for (const txn of transactions) {
      for (const row of txn.billRows || []) {
        if (
          row.allocationType === BillAllocationType.NEW_REF ||
          row.allocationType === BillAllocationType.ADVANCE
        ) {
          openBaseRows.set(row.id, {
            id: row.id,
            voucherDate: txn.voucherDate,
            side: row.side,
            originalAmount: Number(row.amount || 0),
          });
        }
      }
    }

    const settledMap = new Map<string, number>();

    for (const txn of transactions) {
      for (const row of txn.billRows || []) {
        if (
          row.allocationType === BillAllocationType.AGAINST_REF &&
          row.againstBillRowId
        ) {
          const current = settledMap.get(row.againstBillRowId) ?? 0;
          settledMap.set(
            row.againstBillRowId,
            this.round2(current + Number(row.amount || 0)),
          );
        }
      }
    }

    let receivable = 0;
    let payable = 0;

    for (const row of openBaseRows.values()) {
      if (row.voucherDate > range.toDate) continue;

      const settled = settledMap.get(row.id) ?? 0;
      const pending = this.round2(row.originalAmount - settled);

      if (pending <= 0) continue;

      if (row.side === EntrySide.DR) receivable += pending;
      if (row.side === EntrySide.CR) payable += pending;
    }

    return {
      receivable: this.round2(receivable),
      payable: this.round2(payable),
    };
  }
private computeLifetimeBillwise(
  transactions: Array<{
    id: string;
    voucherDate: Date;
    billRows: Array<{
      id: string;
      allocationType: BillAllocationType;
      side: EntrySide;
      amount: Prisma.Decimal;
      againstBillRowId: string | null;
    }>;
  }>,
  range: {
    toDate: Date;
  },
) {
  const openBaseRows = new Map<
    string,
    {
      id: string;
      voucherDate: Date;
      side: EntrySide;
      allocationType: BillAllocationType;
      originalAmount: number;
    }
  >();

  for (const txn of transactions) {
    for (const row of txn.billRows || []) {
      if (
        row.allocationType === BillAllocationType.NEW_REF ||
        row.allocationType === BillAllocationType.ADVANCE ||
        row.allocationType === BillAllocationType.ON_ACCOUNT
      ) {
        openBaseRows.set(row.id, {
          id: row.id,
          voucherDate: txn.voucherDate,
          side: row.side,
          allocationType: row.allocationType,
          originalAmount: Number(row.amount || 0),
        });
      }
    }
  }

  const settledMap = new Map<string, number>();

  for (const txn of transactions) {
    for (const row of txn.billRows || []) {
      if (
        row.allocationType === BillAllocationType.AGAINST_REF &&
        row.againstBillRowId
      ) {
        const current = settledMap.get(row.againstBillRowId) ?? 0;
        settledMap.set(
          row.againstBillRowId,
          this.round2(current + Number(row.amount || 0)),
        );
      }
    }
  }

  let billsReceivableClosing = 0;
  let billsPayableClosing = 0;
  let unraisedInvoiceClosing = 0;
  let unreceivedInvoiceClosing = 0;
  let onAccountDr = 0;
  let onAccountCr = 0;

  for (const row of openBaseRows.values()) {
    if (row.voucherDate > range.toDate) continue;

    const settled = settledMap.get(row.id) ?? 0;
    const pending = this.round2(row.originalAmount - settled);

    if (row.allocationType === BillAllocationType.ON_ACCOUNT) {
      if (row.side === EntrySide.DR) onAccountDr += row.originalAmount;
      if (row.side === EntrySide.CR) onAccountCr += row.originalAmount;
      continue;
    }

    if (pending <= 0) continue;

    if (row.allocationType === BillAllocationType.NEW_REF) {
      if (row.side === EntrySide.DR) billsReceivableClosing += pending;
      if (row.side === EntrySide.CR) billsPayableClosing += pending;
    }

    if (row.allocationType === BillAllocationType.ADVANCE) {
      if (row.side === EntrySide.CR) unraisedInvoiceClosing += pending;
      if (row.side === EntrySide.DR) unreceivedInvoiceClosing += pending;
    }
  }

  const onAccountNet = this.round2(onAccountDr - onAccountCr);

  return {
    billsReceivableClosing: this.round2(billsReceivableClosing),
    billsPayableClosing: this.round2(billsPayableClosing),
    unraisedInvoiceClosing: this.round2(unraisedInvoiceClosing),
    unreceivedInvoiceClosing: this.round2(unreceivedInvoiceClosing),
    onAccountClosing: {
      amount: Math.abs(onAccountNet),
      side: onAccountNet > 0 ? "Dr" : onAccountNet < 0 ? "Cr" : "",
    },
  };
}

private computeFinalClosing(input: {
  billsReceivableClosing: number;
  billsPayableClosing: number;
  unraisedInvoiceClosing: number;
  unreceivedInvoiceClosing: number;
  onAccountClosing: {
    amount: number;
    side: string;
  };
}) {
  const onAccountSigned =
    input.onAccountClosing.side === "Dr"
      ? input.onAccountClosing.amount
      : input.onAccountClosing.side === "Cr"
        ? -input.onAccountClosing.amount
        : 0;

  const net = this.round2(
    input.billsReceivableClosing +
      input.unreceivedInvoiceClosing -
      input.billsPayableClosing -
      input.unraisedInvoiceClosing +
      onAccountSigned,
  );

  return {
    amount: Math.abs(net),
    side: net > 0 ? "Dr" : net < 0 ? "Cr" : "",
    label: net > 0 ? "Net Debit Closing" : net < 0 ? "Net Credit Closing" : "Settled",
  };
}
  private endOfDay(dateString: string) {
    const date = new Date(dateString);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private round2(value: number) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }
}