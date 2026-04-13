"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Layers,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Search,
} from "lucide-react";
import {
  getTransactions,
  type BillAllocationType,
  type EntrySide,
  type TransactionAttachmentRecord,
  type TransactionBillRowRecord,
  type TransactionRecord,
  type TransactionType,
} from "@/lib/api/transactions-api";

type ReportType =
  | "receivable"
  | "payable"
  | "unraised"
  | "unreceived"
  | "onaccount"
  | "ledger";

type BillsStatusFilter = "all" | "pending" | "settled";
type AdvanceStatusFilter = "all" | "unadjusted" | "adjusted";
type LedgerStatusFilter = "all";
type StatusFilter =
  | BillsStatusFilter
  | AdvanceStatusFilter
  | LedgerStatusFilter;

type ReportStatus =
  | "Pending"
  | "Partial"
  | "Paid"
  | "Unadjusted"
  | "Unadjusted Partial"
  | "Adjusted";

type ReportRow = {
  id: string;
  transactionId: string;
  partyId: string;
  partyName: string;
  date: string;
  voucherNo: string;
  voucherType: TransactionType;
  narration: string;
  refNo: string;
  billAmount: number;
  pendingAmount: number;
  status: ReportStatus;
  side: EntrySide;
  allocationType: BillAllocationType;
  transaction: TransactionRecord;
  sourceRow: TransactionBillRowRecord;
  settlementRows: Array<
    TransactionBillRowRecord & {
      settlementTransaction: TransactionRecord;
    }
  >;
  attachments: TransactionAttachmentRecord[];
};

type LedgerRow = {
  id: string;
  date: string;
  particulars: string;
  voucherType: TransactionType | string;
  voucherNo: string;
  debit: number;
  credit: number;
  narration: string;
  refNo?: string;
  attachments: TransactionAttachmentRecord[];
  actionReportRow?: ReportRow | null;
};

function formatDate(date?: string | null) {
  if (!date) return "—";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value?: number | string | null) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTypeLabel(type?: TransactionType | string | null) {
  if (!type) return "—";

  return String(type)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getReportLabel(type: ReportType) {
  switch (type) {
    case "receivable":
      return "Bills Receivable";
    case "payable":
      return "Bills Payable";
    case "unraised":
      return "Unraised Invoice";
    case "unreceived":
      return "Unreceived Invoice";
    case "onaccount":
      return "On Account";
    case "ledger":
      return "Ledger";
    default:
      return "Reports";
  }
}

function getOutstandingStatus(
  allocationType: BillAllocationType,
  billAmount: number,
  pendingAmount: number,
  settlementCount: number,
): ReportStatus {
  if (allocationType === "ADVANCE" || allocationType === "ON_ACCOUNT") {
    if (pendingAmount <= 0) return "Adjusted";
    if (settlementCount > 0 && pendingAmount < billAmount) {
      return "Unadjusted Partial";
    }
    return "Unadjusted";
  }

  if (pendingAmount <= 0) return "Paid";
  if (settlementCount > 0 && pendingAmount < billAmount) return "Partial";
  return "Pending";
}

function getStatusClasses(status: ReportStatus) {
  switch (status) {
    case "Paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Adjusted":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "Partial":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Unadjusted":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "Unadjusted Partial":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Pending":
    default:
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

function isBillsType(type: ReportType) {
  return type === "receivable" || type === "payable";
}

function isLedgerLikeType(type: ReportType) {
  return type === "ledger" || type === "onaccount";
}

function matchesStatusFilter(
  row: ReportRow,
  filter: StatusFilter,
  reportType: ReportType,
) {
  if (filter === "all") return true;

  if (isBillsType(reportType)) {
    if (filter === "pending") {
      return row.status === "Pending" || row.status === "Partial";
    }

    if (filter === "settled") {
      return row.status === "Paid";
    }

    return true;
  }

  if (reportType === "ledger") return true;

  if (filter === "unadjusted") {
    return row.status === "Unadjusted" || row.status === "Unadjusted Partial";
  }

  if (filter === "adjusted") {
    return row.status === "Adjusted";
  }

  return true;
}

function openAttachmentInNewTab(
  attachment?: TransactionAttachmentRecord | null,
) {
  if (!attachment?.fileUrl) return;
  window.open(attachment.fileUrl, "_blank", "noopener,noreferrer");
}

async function downloadAttachment(
  attachment?: TransactionAttachmentRecord | null,
) {
  if (!attachment?.fileUrl) return;

  try {
    const link = document.createElement("a");
    link.href = attachment.fileUrl;
    link.setAttribute("download", attachment.fileName || "attachment");
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Attachment download failed:", error);
    window.open(attachment.fileUrl, "_blank", "noopener,noreferrer");
  }
}
function buildSettlementSummary(row: ReportRow) {
  if (!row.settlementRows.length) {
    return `No settlements linked for ${row.refNo}.`;
  }

  return row.settlementRows
    .map((item, index) => {
      return `${index + 1}. ${formatDate(
        item.settlementTransaction.voucherDate,
      )} | ${item.settlementTransaction.voucherNo} | ${formatTypeLabel(
        item.settlementTransaction.type,
      )} | ${item.side} | ₹ ${formatCurrency(item.amount)}`;
    })
    .join("\n");
}

function getTransactionLedgerAmounts(transaction: TransactionRecord) {
  let debit = 0;
  let credit = 0;

  for (const row of transaction.billRows || []) {
    const amount = Number(row.amount || 0);

    if (row.side === "DR") debit += amount;
    if (row.side === "CR") credit += amount;
  }

  return {
    debit: Number(debit.toFixed(2)),
    credit: Number(credit.toFixed(2)),
  };
}

function buildLedgerParticulars(transaction: TransactionRecord) {
  const { debit, credit } = getTransactionLedgerAmounts(transaction);
  const side = debit > 0 ? "To" : credit > 0 ? "By" : "To";
  const narration = String(transaction.particulars || "").trim();

  if (narration) return `${side} ${narration}`;
  return `${side} ${formatTypeLabel(transaction.type)}`;
}

export default function ReportsPageClient() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reportType, setReportType] = useState<ReportType>("receivable");
  const [search, setSearch] = useState("");
  const [partyId, setPartyId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  async function loadData(soft = false) {
    try {
      if (soft) setRefreshing(true);
      else setLoading(true);

      const data = await getTransactions();
      setTransactions(data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setStatus("all");
  }, [reportType]);

  const partyOptions = useMemo(() => {
    const map = new Map<string, string>();

    transactions.forEach((txn) => {
      if (txn.party?.id && txn.party?.name) {
        map.set(txn.party.id, txn.party.name);
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  useEffect(() => {
    if (!partyOptions.length) {
      if (partyId) setPartyId("");
      return;
    }

    const exists = partyOptions.some((party) => party.id === partyId);
    if (!exists) {
      setPartyId(partyOptions[0].id);
    }
  }, [partyId, partyOptions]);

  const allRows = useMemo<ReportRow[]>(() => {
    const againstRows = transactions.flatMap((txn) =>
      (txn.billRows || [])
        .filter((row) => row.allocationType === "AGAINST_REF")
        .map((row) => ({
          ...row,
          settlementTransaction: txn,
        })),
    );

    const baseRows: ReportRow[] = [];

    transactions.forEach((txn) => {
      (txn.billRows || []).forEach((row) => {
        const isBaseRow =
          row.allocationType === "NEW_REF" ||
          row.allocationType === "ADVANCE" ||
          row.allocationType === "ON_ACCOUNT";

        if (!isBaseRow) return;

        const linkedSettlements = againstRows.filter(
          (against) => against.againstBillRowId === row.id,
        );

        const settledAmount = linkedSettlements.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        );

        const billAmount = Number(row.amount || 0);
        const pendingAmount = Number((billAmount - settledAmount).toFixed(2));

        baseRows.push({
          id: `${txn.id}-${row.id}`,
          transactionId: txn.id,
          partyId: txn.partyId,
          partyName: txn.party?.name || "—",
          date: txn.voucherDate,
          voucherNo: txn.voucherNo,
          voucherType: txn.type,
          narration: txn.particulars || "—",
          refNo: row.refNo || txn.voucherNo || "—",
          billAmount,
          pendingAmount: pendingAmount < 0 ? 0 : pendingAmount,
          status: getOutstandingStatus(
            row.allocationType,
            billAmount,
            pendingAmount,
            linkedSettlements.length,
          ),
          side: row.side,
          allocationType: row.allocationType,
          transaction: txn,
          sourceRow: row,
          settlementRows: linkedSettlements,
          attachments: txn.attachments || [],
        });
      });
    });

    return baseRows;
  }, [transactions]);

  const selectedPartyTransactions = useMemo(() => {
    if (!partyId) return [];
    return transactions.filter((txn) => txn.partyId === partyId);
  }, [partyId, transactions]);

  const filteredRows = useMemo(() => {
    let rows = [...allRows];

    rows = rows.filter((row) => {
      if (reportType === "receivable") {
        return row.allocationType === "NEW_REF" && row.side === "DR";
      }

      if (reportType === "payable") {
        return row.allocationType === "NEW_REF" && row.side === "CR";
      }

      if (reportType === "unraised") {
        return row.allocationType === "ADVANCE" && row.side === "CR";
      }

      if (reportType === "unreceived") {
        return row.allocationType === "ADVANCE" && row.side === "DR";
      }

      if (reportType === "onaccount") {
        return row.allocationType === "ON_ACCOUNT";
      }

      if (reportType === "ledger") {
        return false;
      }

      return true;
    });

    if (partyId) {
      rows = rows.filter((row) => row.partyId === partyId);
    } else {
      rows = [];
    }

    rows = rows.filter((row) => matchesStatusFilter(row, status, reportType));

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        return (
          row.partyName.toLowerCase().includes(q) ||
          row.voucherNo.toLowerCase().includes(q) ||
          row.refNo.toLowerCase().includes(q) ||
          row.narration.toLowerCase().includes(q) ||
          formatDate(row.date).toLowerCase().includes(q)
        );
      });
    }

    rows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return rows;
  }, [allRows, partyId, reportType, search, status]);

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    if (!partyId) return [];

    const q = search.trim().toLowerCase();
    const rows: LedgerRow[] = [];

    if (reportType === "ledger") {
      selectedPartyTransactions.forEach((txn) => {
        const amounts = getTransactionLedgerAmounts(txn);

        rows.push({
          id: `ledger-${txn.id}`,
          date: txn.voucherDate,
          particulars: buildLedgerParticulars(txn),
          voucherType: txn.type,
          voucherNo: txn.voucherNo,
          debit: amounts.debit,
          credit: amounts.credit,
          narration: txn.particulars || "—",
          attachments: txn.attachments || [],
          actionReportRow: null,
        });
      });
    }

    if (reportType === "onaccount") {
      const onAccountBaseRows = allRows.filter(
        (row) => row.partyId === partyId && row.allocationType === "ON_ACCOUNT",
      );

      onAccountBaseRows.forEach((row) => {
        const isDebit = row.side === "DR";

        rows.push({
          id: `onaccount-base-${row.id}`,
          date: row.date,
          particulars: `${isDebit ? "To" : "By"} ${row.narration}`,
          voucherType: row.voucherType,
          voucherNo: row.voucherNo,
          debit: isDebit ? row.billAmount : 0,
          credit: isDebit ? 0 : row.billAmount,
          narration: row.narration,
          refNo: row.refNo,
          attachments: row.attachments,
          actionReportRow: row,
        });

        row.settlementRows.forEach((settlement, index) => {
          const amount = Number(settlement.amount || 0);
          const oppositeDebit = row.side === "CR";
          const settlementNarration =
            settlement.settlementTransaction.particulars?.trim() ||
            formatTypeLabel(settlement.settlementTransaction.type);

          rows.push({
            id: `onaccount-settlement-${row.id}-${settlement.id}-${index}`,
            date: settlement.settlementTransaction.voucherDate,
            particulars: `${
              oppositeDebit ? "To" : "By"
            } Adjusted against ${settlement.settlementTransaction.voucherNo} · ${settlementNarration}`,
            voucherType: settlement.settlementTransaction.type,
            voucherNo: settlement.settlementTransaction.voucherNo,
            debit: oppositeDebit ? amount : 0,
            credit: oppositeDebit ? 0 : amount,
            narration: settlementNarration,
            refNo: row.refNo,
            attachments: settlement.settlementTransaction.attachments || [],
            actionReportRow: row,
          });
        });
      });
    }

    let out = rows;

    if (q) {
      out = out.filter((row) => {
        return (
          row.particulars.toLowerCase().includes(q) ||
          row.voucherNo.toLowerCase().includes(q) ||
          String(row.voucherType).toLowerCase().includes(q) ||
          row.narration.toLowerCase().includes(q) ||
          formatDate(row.date).toLowerCase().includes(q) ||
          String(row.refNo || "").toLowerCase().includes(q)
        );
      });
    }

    out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return out;
  }, [
    allRows,
    partyId,
    reportType,
    search,
    selectedPartyTransactions,
  ]);

  const grandTotals = useMemo(() => {
    return {
      count: filteredRows.length,
      billAmount: filteredRows.reduce((sum, row) => sum + row.billAmount, 0),
      pendingAmount: filteredRows.reduce(
        (sum, row) => sum + row.pendingAmount,
        0,
      ),
    };
  }, [filteredRows]);

  const ledgerTotals = useMemo(() => {
    const debit = ledgerRows.reduce((sum, row) => sum + row.debit, 0);
    const credit = ledgerRows.reduce((sum, row) => sum + row.credit, 0);
    const balance = Math.abs(debit - credit);
    const balanceLabel =
      debit > credit
        ? `${formatCurrency(balance)} Dr`
        : credit > debit
        ? `${formatCurrency(balance)} Cr`
        : "0.00";

    return {
      count: ledgerRows.length,
      debit,
      credit,
      balanceLabel,
    };
  }, [ledgerRows]);

  const statusOptions = useMemo(() => {
    if (reportType === "ledger") {
      return [{ value: "all", label: "All" }] as const;
    }

    if (isBillsType(reportType)) {
      return [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "settled", label: "Settled" },
      ] as const;
    }

    return [
      { value: "all", label: "All" },
      { value: "unadjusted", label: "Unadjusted" },
      { value: "adjusted", label: "Adjusted" },
    ] as const;
  }, [reportType]);

  const selectedPartyName =
    partyOptions.find((party) => party.id === partyId)?.name || "";

  const showEmptyPartyState = !loading && !partyId;
  const isLedgerMode = isLedgerLikeType(reportType);

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
            STAR Engineering
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Reports
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review outstanding, party-wise reference position, settlements,
            ledger entries, and attachment-backed accounting reports in one
            place.
          </p>
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.2fr_1fr_1fr_auto]">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400"
          >
            <option value="receivable">Bills Receivable</option>
            <option value="payable">Bills Payable</option>
            <option value="unraised">Unraised Invoice</option>
            <option value="unreceived">Unreceived Invoice</option>
            <option value="onaccount">On Account</option>
            <option value="ledger">Ledger</option>
          </select>

          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isLedgerMode
                  ? "Search by date, particulars, voucher..."
                  : "Search by date, ref, voucher, narration..."
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400"
            />
          </div>

          <select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400"
          >
            {partyOptions.length === 0 ? (
              <option value="">No parties found</option>
            ) : null}

            {partyOptions.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400"
            disabled={reportType === "ledger"}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void loadData(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCcw size={16} />
            )}
            Refresh
          </button>
        </div>
      </div>

      {selectedPartyName ? (
        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Showing{" "}
          <span className="font-semibold text-slate-900">
            {getReportLabel(reportType)}
          </span>{" "}
          for{" "}
          <span className="font-semibold text-slate-900">
            {selectedPartyName}
          </span>
          .
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-slate-200 bg-white">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              Loading {getReportLabel(reportType).toLowerCase()}...
            </p>
          </div>
        </div>
      ) : showEmptyPartyState ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-white px-6 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-500">
            <Layers size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No party selected
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Party select karo tabhi report dikhegi.
          </p>
        </div>
      ) : isLedgerMode ? (
        <>
          {ledgerRows.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-white px-6 text-center">
              <div className="rounded-full bg-slate-100 p-4 text-slate-500">
                <Layers size={28} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No matching ledger rows
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Current filter ke hisaab se koi ledger entry nahi mili.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white lg:block">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[38%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col className="w-[11%]" />
                    <col className="w-[11%]" />
                  </colgroup>

                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Particulars</th>
                      <th className="px-4 py-3 font-semibold">Voucher Type</th>
                      <th className="px-4 py-3 font-semibold">Voucher No.</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Debit
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Credit
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {ledgerRows.map((row, index) => (
                      <LedgerTableRow
                        key={row.id}
                        row={row}
                        bordered={index !== ledgerRows.length - 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:hidden">
                {ledgerRows.map((row) => (
                  <LedgerMobileCard key={row.id} row={row} />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <TotalCard
                  label="Grand Total Records"
                  value={String(ledgerTotals.count)}
                />
                <TotalCard
                  label="Grand Total Debit"
                  value={`₹ ${formatCurrency(ledgerTotals.debit)}`}
                />
                <TotalCard
                  label="Grand Total Credit"
                  value={`₹ ${formatCurrency(ledgerTotals.credit)}`}
                />
                <TotalCard
                  label="Closing Balance"
                  value={ledgerTotals.balanceLabel}
                  highlight
                />
              </div>
            </>
          )}
        </>
      ) : filteredRows.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-white px-6 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-500">
            <Layers size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No matching rows
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Filters change karke try karo. Abhi current selection me koi record
            nahi mila.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white lg:block">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[36%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
              </colgroup>

              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Narration</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Bill Amount
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Pending Amount
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row, index) => (
                  <ReportTableRow
                    key={row.id}
                    row={row}
                    bordered={index !== filteredRows.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filteredRows.map((row) => (
              <ReportMobileCard key={row.id} row={row} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TotalCard
              label="Grand Total Records"
              value={String(grandTotals.count)}
            />
            <TotalCard
              label="Grand Total Bill Amount"
              value={`₹ ${formatCurrency(grandTotals.billAmount)}`}
            />
            <TotalCard
              label="Grand Total Pending Amount"
              value={`₹ ${formatCurrency(grandTotals.pendingAmount)}`}
              highlight
            />
          </div>
        </>
      )}
    </div>
  );
}

function ReportTableRow({
  row,
  bordered,
}: {
  row: ReportRow;
  bordered: boolean;
}) {
  return (
    <tr className={bordered ? "border-t border-slate-100" : ""}>
      <td className="px-4 py-3 align-top">
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-slate-900">{formatDate(row.date)}</p>
          <p className="text-xs text-slate-500">
            Ref:{" "}
            <span className="font-semibold text-slate-700">{row.refNo}</span>
          </p>
        </div>
      </td>

      <td className="px-4 py-3 align-top">
        <div className="space-y-0.5">
          <p className="text-sm text-slate-700">{row.narration}</p>
          <p className="text-xs text-slate-500">
            {row.voucherNo} • {formatTypeLabel(row.voucherType)}
          </p>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
        ₹ {formatCurrency(row.billAmount)}
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
        ₹ {formatCurrency(row.pendingAmount)}
      </td>

      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
            row.status,
          )}`}
        >
          {row.status}
        </span>
      </td>

      <td className="px-4 py-3 text-center align-top">
        <RowActionMenu row={row} />
      </td>
    </tr>
  );
}

function ReportMobileCard({ row }: { row: ReportRow }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{formatDate(row.date)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Ref: <span className="font-semibold text-slate-700">{row.refNo}</span>
          </p>
        </div>

        <span
          className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
            row.status,
          )}`}
        >
          {row.status}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-700">{row.narration}</p>
      <p className="mt-1 text-xs text-slate-500">
        {row.voucherNo} • {formatTypeLabel(row.voucherType)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Bill Amount
          </p>
          <p className="mt-1 whitespace-nowrap text-sm font-bold text-slate-900">
            ₹ {formatCurrency(row.billAmount)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Pending Amount
          </p>
          <p className="mt-1 whitespace-nowrap text-sm font-bold text-slate-900">
            ₹ {formatCurrency(row.pendingAmount)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <RowActionMenu row={row} />
      </div>
    </div>
  );
}

function LedgerTableRow({
  row,
  bordered,
}: {
  row: LedgerRow;
  bordered: boolean;
}) {
  return (
    <tr className={bordered ? "border-t border-slate-100" : ""}>
      <td className="px-4 py-3 align-top">
        <p className="text-sm font-semibold text-slate-900">
          {formatDate(row.date)}
        </p>
      </td>

      <td className="px-4 py-3 align-top">
        <div className="space-y-0.5">
          <p className="text-sm text-slate-800">{row.particulars}</p>
          {row.refNo ? (
            <p className="text-xs text-slate-500">
              Ref: <span className="font-medium text-slate-700">{row.refNo}</span>
            </p>
          ) : null}
        </div>
      </td>

      <td className="px-4 py-3 align-top text-sm text-slate-700">
        {formatTypeLabel(row.voucherType)}
      </td>

      <td className="px-4 py-3 align-top text-sm font-medium text-slate-900">
        {row.voucherNo || "—"}
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
        {row.debit > 0 ? `₹ ${formatCurrency(row.debit)}` : "—"}
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
        {row.credit > 0 ? `₹ ${formatCurrency(row.credit)}` : "—"}
      </td>
    </tr>
  );
}

function LedgerMobileCard({ row }: { row: LedgerRow }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{formatDate(row.date)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {formatTypeLabel(row.voucherType)} • {row.voucherNo || "—"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-800">{row.particulars}</p>

      {row.refNo ? (
        <p className="mt-1 text-xs text-slate-500">
          Ref: <span className="font-medium text-slate-700">{row.refNo}</span>
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Debit
          </p>
          <p className="mt-1 whitespace-nowrap text-sm font-bold text-slate-900">
            {row.debit > 0 ? `₹ ${formatCurrency(row.debit)}` : "—"}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Credit
          </p>
          <p className="mt-1 whitespace-nowrap text-sm font-bold text-slate-900">
            {row.credit > 0 ? `₹ ${formatCurrency(row.credit)}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function RowActionMenu({ row }: { row: ReportRow }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    function updatePosition() {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 220;
      const viewportPadding = 12;

      let left = rect.right - menuWidth;
      if (left < viewportPadding) left = viewportPadding;
      if (left + menuWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - menuWidth - viewportPadding;
      }

      let top = rect.bottom + 8;
      const estimatedHeight = row.settlementRows.length > 0 ? 154 : 112;

      if (top + estimatedHeight > window.innerHeight - viewportPadding) {
        top = Math.max(viewportPadding, rect.top - estimatedHeight - 8);
      }

      setPosition({
        top,
        left,
        width: menuWidth,
      });
    }

    function handleOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, row.settlementRows.length]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        title="Actions"
      >
        <MoreHorizontal size={18} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 300,
            }}
            className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          >
            <MenuButton
              label="Open Attachment"
              disabled={!row.attachments.length}
              onClick={() => {
                setOpen(false);
                openAttachmentInNewTab(row.attachments[0]);
              }}
            />
            {row.settlementRows.length > 0 ? (
              <MenuButton
                label="View Settlement"
                onClick={() => {
                  setOpen(false);
                  window.alert(buildSettlementSummary(row));
                }}
              />
            ) : null}
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function TotalCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] border px-4 py-3 ${
        highlight
          ? "border-blue-200 bg-blue-50/70"
          : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}