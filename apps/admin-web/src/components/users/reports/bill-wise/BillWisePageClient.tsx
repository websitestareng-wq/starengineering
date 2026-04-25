"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  Filter,
  Layers,
  Loader2,
  FileText,
  MoreHorizontal,
  Search,
  X,
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
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type BillWiseType =
  | "receivable"
  | "payable"
  | "unraised"
  | "unreceived"
  | "on-account";

type StatusFilter = "pending" | "settled" | "adjusted";

type PdfActionTarget = {
  url: string;
  downloadUrl?: string;
  fileName: string;
  title: string;
};

type PdfActionModalState = {
  open: boolean;
  target: PdfActionTarget | null;
};

type ReportStatus =
  | "Pending"
  | "Partial"
  | "Paid"
  | "Unadjusted"
  | "Partial"
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
  debit: number;
  credit: number;

  reportBucket:
    | "receivable-base"
    | "payable-base"
    | "unraised-base"
    | "unreceived-base"
    | "receivable-settled-from-advance"
    | "payable-settled-from-advance";

  settledAmount: number;
  originalAdvanceRefNo?: string;
  originalAdvanceVoucherNo?: string;
  originalAdvanceAmount?: number;
};

type FilterState = {
  partyId: string;
  status: StatusFilter;
  search: string;
  dateFrom: string;
  dateTo: string;
  skipOpeningBalance: boolean;
};

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2, ease: "easeOut" as const },
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

function formatCompactCurrency(value?: number | string | null) {
  const amount = Number(value || 0);
  if (!amount) return "0";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getSignedAmountFromRow(row: ReportRow) {
  return Number((row.debit - row.credit).toFixed(2));
}

function getBalanceLabel(amount: number) {
  const normalized = Number(amount || 0);

  return {
    amount: Math.abs(Number(normalized.toFixed(2))),
    type: normalized > 0 ? "Dr" : normalized < 0 ? "Cr" : "",
  };
}

function getPageTitle(type: BillWiseType) {
  switch (type) {
    case "receivable":
      return "Bills Receivable";
    case "payable":
      return "Bills Payable";
    case "unraised":
      return "Unraised Invoices";
    case "unreceived":
      return "Unreceived Invoices";
    case "on-account":
      return "On Account";
    default:
      return "Bill-wise";
  }
}

function getPageDescription(type: BillWiseType) {
  switch (type) {
    case "receivable":
      return "Customer-wise pending bills with settlement visibility and attachment access.";
    case "payable":
      return "Supplier payable references with compact outstanding tracking.";
    case "unraised":
      return "Advance credit references not fully adjusted yet.";
    case "unreceived":
      return "Advance debit references not fully adjusted yet.";
    case "on-account":
      return "Transactions marked as on-account with clean party-wise listing.";
    default:
      return "Bill-wise reports.";
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
      return "Partial";
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
    case "Partial":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Pending":
    default:
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

function openUrlInNewTab(url?: string | null) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function downloadFileFromUrl(
  url?: string | null,
  fileName = "document.pdf",
) {
  if (!url) return;

  const safeFileName = buildSafePdfFileName(fileName);

  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = safeFileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);
  } catch (error) {
    console.error("Download failed, falling back to direct link:", error);

    const a = document.createElement("a");
    a.href = url;
    a.download = safeFileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function buildSafePdfFileName(name?: string | null) {
  const safe = String(name || "document.pdf")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");

  if (!safe) return "document.pdf";
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

function matchesStatusFilter(
  row: ReportRow,
  filter: StatusFilter,
  type: BillWiseType,
) {
  if (type === "receivable" || type === "payable") {
    if (filter === "pending") {
      return row.status === "Pending" || row.status === "Partial";
    }

    if (filter === "settled") {
      return row.status === "Paid";
    }

    return false;
  }

  if (type === "unraised" || type === "unreceived") {
    if (filter === "pending") {
      return (
        row.status === "Unadjusted" || row.status === "Partial"
      );
    }

    if (filter === "adjusted") {
      return row.status === "Adjusted";
    }

    return false;
  }

  return true;
}

function getStatusOptions(type: BillWiseType) {
  if (type === "receivable" || type === "payable") {
    return [
      { value: "pending", label: "Pending" },
      { value: "settled", label: "Settled" },
    ] as const;
  }

  if (type === "unraised" || type === "unreceived") {
    return [
      { value: "pending", label: "Pending" },
      { value: "adjusted", label: "Adjusted" },
    ] as const;
  }

  return [] as const;
}

function getCurrentFyRange() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const from = `${year}-04-01`;
  const to = `${year + 1}-03-31`;

  return { from, to };
}

function getDefaultStatus(type: BillWiseType): StatusFilter {
  if (type === "receivable" || type === "payable") {
    return "pending";
  }

  if (type === "unraised" || type === "unreceived") {
    return "pending";
  }

  return "pending";
}

function isDateWithinRange(date: string, from?: string, to?: string) {
  if (!date) return false;

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (value < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59`);
    if (value > toDate) return false;
  }

  return true;
}
function getLoggedInPartyId() {
  if (typeof window === "undefined") return "";

  try {
    const raw =
      window.localStorage.getItem("currentUser") ||
      window.localStorage.getItem("auth_user") ||
      window.localStorage.getItem("user") ||
      "";

    if (!raw) return "";

    const parsed = JSON.parse(raw) as {
      id?: string;
      partyId?: string;
    };

    return parsed.partyId || parsed.id || "";
  } catch {
    return "";
  }
}
export default function BillWisePageClient({
  type,
}: {
  type: BillWiseType;
}) {
const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
const [loading, setLoading] = useState(true);
const [filterOpen, setFilterOpen] = useState(false);
const [pdfActionModal, setPdfActionModal] = useState<PdfActionModalState>({
  open: false,
  target: null,
});
const [pdfDownloading, setPdfDownloading] = useState(false);
const [mounted, setMounted] = useState(false);

  const fyRange = getCurrentFyRange();
const resolvedPartyId = useMemo(() => getLoggedInPartyId(), []);
  const [filters, setFilters] = useState<FilterState>({
partyId: "CURRENT_USER",
    status: getDefaultStatus(type),
    search: "",
    dateFrom: fyRange.from,
    dateTo: fyRange.to,
    skipOpeningBalance: false,
  });

  const [draftFilters, setDraftFilters] = useState<FilterState>({
    partyId: "CURRENT_USER",
    status: getDefaultStatus(type),
    search: "",
    dateFrom: fyRange.from,
    dateTo: fyRange.to,
    skipOpeningBalance: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);
useEffect(() => {
  const shouldLock = filterOpen || pdfActionModal.open;

  if (!shouldLock) {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    return;
  }

  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  return () => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  };
}, [filterOpen, pdfActionModal.open]);
  async function loadData() {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

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
    const fy = getCurrentFyRange();
    const defaultStatus = getDefaultStatus(type);

    setFilters((prev) => ({
      ...prev,
      status: defaultStatus,
      dateFrom: fy.from,
      dateTo: fy.to,
      skipOpeningBalance: false,
    }));

    setDraftFilters((prev) => ({
      ...prev,
      status: defaultStatus,
      dateFrom: fy.from,
      dateTo: fy.to,
      skipOpeningBalance: false,
    }));
  }, [type]);

   const allRows = useMemo<ReportRow[]>(() => {
    const againstRows = transactions.flatMap((txn) =>
      (txn.billRows || [])
        .filter((row) => row.allocationType === "AGAINST_REF")
        .map((row) => ({
          ...row,
          settlementTransaction: txn,
        })),
    );

    const reportRows: ReportRow[] = [];

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

        let reportBucket: ReportRow["reportBucket"] = "receivable-base";

        if (row.allocationType === "NEW_REF" && row.side === "DR") {
          reportBucket = "receivable-base";
        } else if (row.allocationType === "NEW_REF" && row.side === "CR") {
          reportBucket = "payable-base";
        } else if (row.allocationType === "ADVANCE" && row.side === "CR") {
          reportBucket = "unraised-base";
        } else if (row.allocationType === "ADVANCE" && row.side === "DR") {
          reportBucket = "unreceived-base";
        }

        reportRows.push({
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
          debit: row.side === "DR" ? billAmount : 0,
          credit: row.side === "CR" ? billAmount : 0,
          sourceRow: row,
          settlementRows: linkedSettlements,
          attachments: txn.attachments || [],
          reportBucket,
          settledAmount,
          originalAdvanceRefNo: undefined,
          originalAdvanceVoucherNo: undefined,
          originalAdvanceAmount: undefined,
        });

        // ADVANCE fully/partially adjusted against NEW_REF bills:
        // Un bill rows ko receivable/payable settled view me bhi dikhana hai.
  if (row.allocationType === "ADVANCE" && linkedSettlements.length > 0) {
  linkedSettlements.forEach((against) => {
    const settlementTxn = against.settlementTransaction;

    const candidateNewRefRows = (settlementTxn.billRows || []).filter(
      (billRow) => {
        if (billRow.allocationType !== "NEW_REF") return false;

        // Advance received adjusted into sales bill
        if (row.side === "CR" && billRow.side !== "DR") return false;

        // Advance paid adjusted into purchase bill
        if (row.side === "DR" && billRow.side !== "CR") return false;

        return true;
      },
    );

    const matchedNewRefRow =
      candidateNewRefRows.find(
        (billRow) =>
          Number(billRow.amount || 0) === Number(against.amount || 0),
      ) || candidateNewRefRows[0];

    if (!matchedNewRefRow) return;

    const matchedBillAmount = Number(matchedNewRefRow.amount || 0);
    const adjustedPartAmount = Number(against.amount || 0);

    const isReceivableBill =
      matchedNewRefRow.side === "DR" && row.side === "CR";

    const isPayableBill =
      matchedNewRefRow.side === "CR" && row.side === "DR";

    if (!isReceivableBill && !isPayableBill) return;

    reportRows.push({
      id: `adv-settlement-${against.id}-${matchedNewRefRow.id}`,
      transactionId: settlementTxn.id,
      partyId: settlementTxn.partyId,
      partyName: settlementTxn.party?.name || txn.party?.name || "—",
      date: settlementTxn.voucherDate,
      voucherNo: settlementTxn.voucherNo,
      voucherType: settlementTxn.type,
      narration: settlementTxn.particulars || "—",
      refNo: matchedNewRefRow.refNo || settlementTxn.voucherNo || "—",
      billAmount: matchedBillAmount,
      pendingAmount: 0,
      status: "Paid",
      side: matchedNewRefRow.side,
      allocationType: matchedNewRefRow.allocationType,
      transaction: settlementTxn,
      debit: matchedNewRefRow.side === "DR" ? matchedBillAmount : 0,
      credit: matchedNewRefRow.side === "CR" ? matchedBillAmount : 0,
      sourceRow: matchedNewRefRow,
      settlementRows: [
        {
          ...against,
          settlementTransaction: settlementTxn,
        },
      ],
      attachments: settlementTxn.attachments || [],
      reportBucket: isReceivableBill
        ? "receivable-settled-from-advance"
        : "payable-settled-from-advance",
      settledAmount: adjustedPartAmount,
      originalAdvanceRefNo: row.refNo || txn.voucherNo || "—",
      originalAdvanceVoucherNo: txn.voucherNo || "—",
      originalAdvanceAmount: Number(row.amount || 0),
    });
  });
}
      });
    });

    return reportRows;
  }, [transactions]);

   const filteredRows = useMemo(() => {
    let rows = [...allRows];

    rows = rows.filter((row) => {
      if (type === "receivable") {
        return (
          row.reportBucket === "receivable-base" ||
          row.reportBucket === "receivable-settled-from-advance"
        );
      }

      if (type === "payable") {
        return (
          row.reportBucket === "payable-base" ||
          row.reportBucket === "payable-settled-from-advance"
        );
      }

      if (type === "unraised") {
        return row.reportBucket === "unraised-base";
      }

      if (type === "unreceived") {
        return row.reportBucket === "unreceived-base";
      }

      if (type === "on-account") {
        return row.allocationType === "ON_ACCOUNT";
      }

      return false;
    });

   if (!resolvedPartyId) return [];

rows = rows.filter((row) => row.partyId === resolvedPartyId);

    if (type === "receivable" || type === "payable") {
      rows = rows.filter((row) => matchesStatusFilter(row, filters.status, type));

      if (filters.status === "pending") {
        // lifetime
        rows = rows.filter(
          (row) => row.status === "Pending" || row.status === "Partial",
        );
      }

      if (filters.status === "settled") {
        // date asked
        rows = rows.filter(
          (row) =>
            row.status === "Paid" &&
            !!filters.dateFrom &&
            !!filters.dateTo &&
            isDateWithinRange(row.date, filters.dateFrom, filters.dateTo),
        );
      }
    }

    if (type === "unraised" || type === "unreceived") {
      if (filters.status === "pending") {
        // lifetime
        rows = rows.filter(
          (row) =>
            row.status === "Unadjusted" ||
            row.status === "Partial",
        );
      }

      if (filters.status === "adjusted") {
        // date asked
        rows = rows.filter(
          (row) =>
            row.status === "Adjusted" &&
            !!filters.dateFrom &&
            !!filters.dateTo &&
            isDateWithinRange(row.date, filters.dateFrom, filters.dateTo),
        );
      }
    }

    if (type === "on-account") {
      rows = rows.filter(
        (row) =>
          !!filters.dateFrom &&
          !!filters.dateTo &&
          isDateWithinRange(row.date, filters.dateFrom, filters.dateTo),
      );
    }

    const q = filters.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        return (
          row.partyName.toLowerCase().includes(q) ||
          row.voucherNo.toLowerCase().includes(q) ||
          row.refNo.toLowerCase().includes(q) ||
          row.narration.toLowerCase().includes(q) ||
          formatDate(row.date).toLowerCase().includes(q) ||
          (row.originalAdvanceRefNo || "").toLowerCase().includes(q) ||
          (row.originalAdvanceVoucherNo || "").toLowerCase().includes(q)
        );
      });
    }

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return rows;
  }, [allRows, filters, resolvedPartyId, type]);

  const totals = useMemo(() => {
    return {
      count: filteredRows.length,
      billAmount: filteredRows.reduce((sum, row) => sum + row.billAmount, 0),
      pendingAmount: filteredRows.reduce((sum, row) => sum + row.pendingAmount, 0),
    };
  }, [filteredRows]);

  const onAccountBaseRows = useMemo(() => {
    if (type !== "on-account") return [];

   return allRows
  .filter(
    (row) =>
      row.partyId === resolvedPartyId &&
      row.allocationType === "ON_ACCOUNT",
  )
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}, [allRows, resolvedPartyId, type]);

  const onAccountOpeningNet = useMemo(() => {
    if (type !== "on-account") return 0;
   if (!resolvedPartyId || !filters.dateFrom) return 0;
    if (filters.skipOpeningBalance) return 0;

    return Number(
      onAccountBaseRows
        .filter((row) => {
          const rowDate = new Date(row.date);
          const fromDate = new Date(`${filters.dateFrom}T00:00:00`);
          return !Number.isNaN(rowDate.getTime()) && rowDate < fromDate;
        })
        .reduce((sum, row) => sum + getSignedAmountFromRow(row), 0)
        .toFixed(2),
    );
  }, [
    filters.dateFrom,
    resolvedPartyId,
    filters.skipOpeningBalance,
    onAccountBaseRows,
    type,
  ]);

  const onAccountPeriodNet = useMemo(() => {
    if (type !== "on-account") return 0;

    return Number(
      filteredRows
        .reduce((sum, row) => sum + getSignedAmountFromRow(row), 0)
        .toFixed(2),
    );
  }, [filteredRows, type]);

  const onAccountClosingNet = useMemo(() => {
    if (type !== "on-account") return 0;

    return Number((onAccountOpeningNet + onAccountPeriodNet).toFixed(2));
  }, [onAccountOpeningNet, onAccountPeriodNet, type]);

  const onAccountBalances = useMemo(() => {
    return {
      opening: getBalanceLabel(onAccountOpeningNet),
      closing: getBalanceLabel(onAccountClosingNet),
    };
  }, [onAccountOpeningNet, onAccountClosingNet]);

  function openFilterModal() {
    setDraftFilters(filters);
    setFilterOpen(true);
  }

function applyFilters() {
  const needsDate =
    type === "on-account" ||
    draftFilters.status === "settled" ||
    draftFilters.status === "adjusted";

  if (needsDate && (!draftFilters.dateFrom || !draftFilters.dateTo)) {
    return;
  }

  setFilters(draftFilters);
  setFilterOpen(false);
}

function resetDraftFilters() {
  const fy = getCurrentFyRange();
  const defaultStatus = getDefaultStatus(type);
  const needsDate =
    type === "on-account" ||
    defaultStatus === "settled" ||
    defaultStatus === "adjusted";

  setDraftFilters((prev) => ({
    ...prev,
    search: "",
    status: defaultStatus,
    partyId: "CURRENT_USER",
    dateFrom: needsDate ? fy.from : "",
    dateTo: needsDate ? fy.to : "",
    skipOpeningBalance: false,
  }));
}

function openPdfActionModal(target: PdfActionTarget) {
  setPdfActionModal({
    open: true,
    target,
  });
}

function closePdfActionModal() {
  setPdfActionModal({
    open: false,
    target: null,
  });
}

function handlePdfView() {
  if (!pdfActionModal.target?.url) return;
  openUrlInNewTab(pdfActionModal.target.url);
  closePdfActionModal();
}

async function handlePdfDownload() {
  const targetUrl =
    pdfActionModal.target?.downloadUrl || pdfActionModal.target?.url;

  if (!targetUrl || pdfDownloading) return;

  try {
    setPdfDownloading(true);

    await downloadFileFromUrl(
      targetUrl,
      pdfActionModal.target?.fileName || "document.pdf",
    );
  } finally {
    setPdfDownloading(false);
    closePdfActionModal();
  }
}

function openAttachmentAction(
  transactionId?: string | null,
  attachment?: TransactionAttachmentRecord | null,
  label?: string | null,
) {
  if (!attachment?.fileUrl || !transactionId) return;

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

  openPdfActionModal({
    url: attachment.fileUrl,
    downloadUrl: `${apiBase}/transactions/${transactionId}/download`,
    title: label ? `Reference ${label}` : "Attachment PDF",
    fileName: buildSafePdfFileName(
      label ? `Reference-${label}` : "attachment.pdf",
    ),
  });
}

function handleExportPdf() {
  const needsDate =
    type === "on-account" ||
    filters.status === "settled" ||
    filters.status === "adjusted";

  if (!resolvedPartyId) return;
  if (needsDate && (!filters.dateFrom || !filters.dateTo)) return;

  const params = new URLSearchParams({
    partyId: resolvedPartyId,
  });

  if (needsDate) {
    params.append("from", filters.dateFrom);
    params.append("to", filters.dateTo);
  }

  if (type === "receivable") params.append("mode", "RECEIVABLE_FROM_YOU");
  if (type === "payable") params.append("mode", "PAYABLE_TO_YOU");
  if (type === "unraised") params.append("mode", "ADVANCE_RECEIVED");
  if (type === "unreceived") params.append("mode", "ADVANCE_ISSUED");
  if (type === "on-account") params.append("mode", "ON_ACCOUNT");

  if (type !== "on-account") {
    params.append("status", filters.status.toUpperCase());
  }

  const endpoint =
    type === "on-account"
      ? "/transactions/reports/on-account/pdf"
      : "/transactions/reports/bill-wise/pdf";

  openPdfActionModal({
    url: `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}?${params.toString()}`,
    title: `${getPageTitle(type)} PDF`,
    fileName: buildSafePdfFileName(
      `${getPageTitle(type)}${needsDate ? ` ${filters.dateFrom} to ${filters.dateTo}` : ""}.pdf`,
    ),
  });
}

  return (
    <div className="space-y-4 sm:space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
       className="overflow-hidden rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.96))] shadow-[0_24px_70px_rgba(124,58,237,0.10)] backdrop-blur-xl"
      >
        <div className="hidden border-b border-violet-100/80 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.07),rgba(236,72,153,0.06))] px-5 py-5 sm:px-6 lg:block">
          <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <motion.div
                  variants={fadeUp}
                  initial="initial"
                  animate="animate"
                  className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 text-white shadow-[0_18px_38px_rgba(147,51,234,0.28)]"
                >
                  <Layers className="h-5 w-5" />
                </motion.div>

                <div className="inline-flex rounded-full border border-violet-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
                  Reports
                </div>

                <h2 className="mt-3 text-[2rem] font-semibold leading-[1.05] tracking-tight text-slate-900">
                  {getPageTitle(type)}
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  {getPageDescription(type)}
                </p>

                <div
                  className={`mt-4 flex items-center gap-2.5 ${
                    type === "on-account" ? "flex-nowrap" : "flex-wrap"
                  }`}
                >
                  {type === "on-account" ? (
                    <>
                      <InfoPill
                        label="Opening"
                        value={
                          filters.skipOpeningBalance
                            ? "SKIPPED"
                            : `${formatCompactCurrency(onAccountBalances.opening.amount)}${
                                onAccountBalances.opening.type
                                  ? ` ${onAccountBalances.opening.type}`
                                  : ""
                              }`
                        }
                        strong
                      />
                      <InfoPill
                        label="Closing"
                        value={`${formatCompactCurrency(onAccountBalances.closing.amount)}${
                          onAccountBalances.closing.type
                            ? ` ${onAccountBalances.closing.type}`
                            : ""
                        }`}
                        strong
                      />
                    </>
                  ) : (
                    <InfoPill
                      label="Pending Amount"
                      value={`₹ ${formatCurrency(totals.pendingAmount)}`}
                      strong
                    />
                  )}
                </div>
              </div>

              <div className="w-full max-w-[760px]">
                <div className="grid grid-cols-1 gap-3">
                </div>

<div className="w-full">
  <div className="mt-5 flex flex-col gap-3">
    <div className="relative w-full max-w-[360px] ml-auto">
      <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={filters.search}
        onChange={(e) =>
          setFilters((prev) => ({ ...prev, search: e.target.value }))
        }
        placeholder={
          type === "on-account"
            ? "Search by date, particulars, voucher type, voucher no..."
            : "Search by date, ref no, voucher no, particulars..."
        }
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-4 pr-11 text-right text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>

    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={handleExportPdf}
        className="inline-flex h-12 items-center gap-2 rounded-2xl border border-violet-100 bg-white/90 px-4 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-[1px] hover:border-violet-200 hover:bg-violet-50/60"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </button>

      <button
        type="button"
        onClick={openFilterModal}
        className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-4 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(147,51,234,0.24)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_22px_42px_rgba(147,51,234,0.30)] active:translate-y-0"
      >
        <Filter className="h-4 w-4" />
        Apply Filter
      </button>
    </div>
  </div>
</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-violet-100/80 bg-[linear-gradient(135deg,rgba(168,85,247,0.10),rgba(124,58,237,0.08),rgba(236,72,153,0.07))] px-4 py-4 sm:hidden">
<div className="flex items-start justify-between gap-3">
  <div className="min-w-0 xl:max-w-[620px]">
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)]"
    >
      <Layers className="h-4.5 w-4.5" />
    </motion.div>

    <div className="inline-flex rounded-full border border-violet-100 bg-white/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
      Reports
    </div>

    <h2 className="mt-3 text-[1.7rem] font-semibold leading-[1.05] tracking-tight text-slate-900">
      {getPageTitle(type)}
    </h2>

    <p className="mt-2 text-[13px] leading-5 text-slate-500">
      {getPageDescription(type)}
    </p>

    {type === "on-account" ? (
      <div className="mt-3 flex flex-wrap gap-2">
        <SmallInfoPill
          label="Opening"
          value={
            filters.skipOpeningBalance
              ? "Skipped"
              : `${formatCompactCurrency(onAccountBalances.opening.amount)}${
                  onAccountBalances.opening.type
                    ? ` ${onAccountBalances.opening.type}`
                    : ""
                }`
          }
        />
        <SmallInfoPill
          label="Closing"
          value={`${formatCompactCurrency(onAccountBalances.closing.amount)}${
            onAccountBalances.closing.type
              ? ` ${onAccountBalances.closing.type}`
              : ""
          }`}
        />
      </div>
    ) : (
      <div className="mt-3 inline-flex min-h-[36px] items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <span className="text-slate-500">Pending Amount:</span>
        <span className="font-bold text-slate-900">
          ₹ {formatCurrency(totals.pendingAmount)}
        </span>
      </div>
    )}
  </div>
</div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={openFilterModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)] transition-all duration-200 active:scale-[0.99]"
            >
              <Filter className="h-4 w-4" />
              Apply Filter
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
             className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-violet-100 bg-white/92 px-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 active:scale-[0.99]"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 lg:p-0">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)] lg:rounded-none lg:border-0 lg:shadow-none">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Loading {getPageTitle(type).toLowerCase()}...
                </p>
                <p className="mt-1 text-sm text-slate-500">
              Please wait while we prepare your bills.
            </p>
              </div>
            </div>
          ) : false ? null : filteredRows.length === 0 ? (
            <EmptyState
              title="No matching rows"
              description="No bill rows found."
            />
          ) : (
            <>
              {type === "on-account" ? (
                <div className="hidden overflow-hidden rounded-b-[24px] border-x border-b border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)] lg:block">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[12%]" />
                      <col className="w-[36%]" />
                      <col className="w-[18%]" />
                      <col className="w-[18%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                    </colgroup>

                    <thead className="border-b border-slate-200 bg-slate-50/70">
                      <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Particulars</th>
                        <th className="px-4 py-3 font-semibold">Voucher Type</th>
                        <th className="px-4 py-3 font-semibold">Voucher No.</th>
                        <th className="px-4 py-3 text-right font-semibold">Debit</th>
                        <th className="px-4 py-3 text-right font-semibold">Credit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((row, index) => (
                        <tr
                          key={row.id}
                          className={`${
                            index !== 0 ? "border-t border-slate-100" : ""
                          } transition hover:bg-slate-50/60`}
                        >
                          <td className="px-4 py-3 align-top">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatDate(row.date) || "—"}
                            </p>
                          </td>

                          <td className="px-4 py-3 align-top">
  <div className="space-y-1">
    <p className="text-sm text-slate-700">{row.narration}</p>

    {row.reportBucket === "receivable-settled-from-advance" ||
    row.reportBucket === "payable-settled-from-advance" ? (
      <div className="space-y-0.5">
        <p className="text-[11px] font-semibold text-cyan-700">
          Settled from advance: {row.originalAdvanceRefNo || "—"}
        </p>
        <p className="text-[11px] text-slate-500">
          Adjusted: ₹ {formatCurrency(row.settledAmount)}
          {row.originalAdvanceAmount
            ? ` • Advance Total: ₹ ${formatCurrency(row.originalAdvanceAmount)}`
            : ""}
        </p>
      </div>
    ) : null}
  </div>
</td>

                          <td className="px-4 py-3 align-top text-sm text-slate-700">
                            {formatTypeLabel(row.voucherType)}
                          </td>

                          <td className="px-4 py-3 align-top text-sm font-medium">
                            {row.attachments?.[0]?.fileUrl ? (
                             <button
  type="button"
onClick={() =>
  openAttachmentAction(row.transactionId, row.attachments[0], row.voucherNo)
}
  className="font-semibold text-violet-700 underline-offset-4 transition hover:text-fuchsia-700 hover:underline"
  title="Reference options"
>
  {row.voucherNo || "—"}
</button>
                            ) : (
                              <span className="text-slate-900">
                                {row.voucherNo || "—"}
                              </span>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
                            {row.debit ? `₹ ${formatCurrency(row.debit)}` : ""}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
                            {row.credit ? `₹ ${formatCurrency(row.credit)}` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
               <div className="hidden overflow-hidden rounded-b-[24px] border-x border-b border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)] lg:block">
                  <table className="w-full table-fixed">
                    <colgroup>
  <col className="w-[13%]" />
  <col className="w-[16%]" />
  <col className="w-[31%]" />
  <col className="w-[16%]" />
  <col className="w-[16%]" />
  <col className="w-[8%]" />
</colgroup>

   <thead className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.07),rgba(124,58,237,0.05),rgba(236,72,153,0.04))]">
  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
    <th className="px-4 py-3 font-semibold">Date</th>
    <th className="px-4 py-3 font-semibold">Ref</th>
    <th className="px-4 py-3 font-semibold">Particulars</th>
    <th className="px-4 py-3 text-right font-semibold">Bill Amount</th>
    <th className="px-4 py-3 text-right font-semibold">Pending Amount</th>
    <th className="px-4 py-3 font-semibold">Status</th>
  </tr>
</thead>

                    <tbody>
                      {filteredRows.map((row, index) => (
<ReportTableRow
  key={row.id}
  row={row}
  bordered
  onOpenAttachment={openAttachmentAction}
/>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {type === "on-account" ? (
                <div className="overflow-hidden rounded-[22px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.92))] shadow-[0_12px_28px_rgba(124,58,237,0.08)] lg:hidden">
                  <table className="w-full table-fixed">
<colgroup>
  <col className="w-[20%]" />
  <col className="w-[48%]" />
  <col className="w-[32%]" />
</colgroup>
<thead className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.07),rgba(124,58,237,0.05),rgba(236,72,153,0.04))]">
  <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-slate-500">
    <th className="px-2 py-2.5 font-semibold">Date</th>
    <th className="px-2 py-2.5 font-semibold">Particulars</th>
    <th className="px-2 py-2.5 text-right font-semibold">Amount</th>
  </tr>
</thead>
<tbody>
  {filteredRows.map((row, index) => (
    <tr
      key={row.id}
      className={`${
        index !== 0 ? "border-t border-slate-100" : ""
      } align-top transition-colors duration-200 hover:bg-violet-50/30`}
    >
      <td className="px-2 py-3 align-top">
        <p className="text-[12px] font-semibold leading-4 text-slate-900 break-words">
          {formatDate(row.date)}
        </p>
      </td>

      <td className="px-2 py-3 align-top">
        <p className="line-clamp-2 text-[12px] leading-4 text-slate-800">
          {row.narration || "—"}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-4 text-slate-500">
          <span>{formatTypeLabel(row.voucherType)}</span>
          <span>•</span>
          {row.attachments?.[0]?.fileUrl ? (
            <button
  type="button"
onClick={() =>
  openAttachmentAction(
    row.transactionId,
    row.attachments[0],
    row.refNo || row.voucherNo,
  )
}
  className="font-semibold text-violet-700 underline-offset-4 hover:underline"
>
  {row.refNo || row.voucherNo || "—"}
</button>
          ) : (
            <span>{row.refNo || row.voucherNo || "—"}</span>
          )}
        </div>
      </td>

      <td className="px-2 py-3 text-right align-top">
        {getSignedAmountFromRow(row) >= 0 ? (
          <p className="text-[12px] font-bold leading-4 text-rose-600 break-words">
            -{formatCurrency(Math.abs(getSignedAmountFromRow(row)))}
          </p>
        ) : (
          <p className="text-[12px] font-bold leading-4 text-emerald-600 break-words">
            +{formatCurrency(Math.abs(getSignedAmountFromRow(row)))}
          </p>
        )}

      {row.attachments?.[0]?.fileUrl ? (
  <button
    type="button"
  onClick={() =>
  openAttachmentAction(
    row.transactionId,
    row.attachments[0],
    row.refNo || row.voucherNo,
  )
}
    className="mt-1 text-[11px] font-semibold text-violet-700 underline-offset-4 hover:underline"
  >
    View / Download
  </button>
) : null}
      </td>
    </tr>
  ))}
</tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[22px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.92))] shadow-[0_12px_28px_rgba(124,58,237,0.08)] lg:hidden">
                  <table className="w-full table-fixed">
<colgroup>
  <col className="w-[22%]" />
  <col className="w-[46%]" />
  <col className="w-[32%]" />
</colgroup>
<thead className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.07),rgba(124,58,237,0.05),rgba(236,72,153,0.04))]">
  <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-slate-500">
    <th className="px-2 py-2.5 font-semibold">Date</th>
    <th className="px-2 py-2.5 font-semibold">Particulars</th>
    <th className="px-2 py-2.5 text-right font-semibold">Pending</th>
  </tr>
</thead>
<tbody>
  {filteredRows.map((row, index) => (
  <UserMobileBillWiseRow
  key={row.id}
  row={row}
  bordered={index !== 0}
  onOpenAttachment={openAttachmentAction}
/>
  ))}
</tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {mounted &&
          filterOpen &&
          createPortal(
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-[rgba(15,23,42,0.34)] px-2 py-4 sm:p-4 backdrop-blur-[5px]"
              >
                <motion.div
  initial={{ opacity: 0, y: 22, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 18, scale: 0.98 }}
  transition={{ duration: 0.24, ease: "easeOut" }}
 className="my-auto flex w-full max-w-[500px] max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-[22px] sm:max-h-[84vh] sm:rounded-[26px] border border-violet-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] shadow-[0_26px_70px_rgba(124,58,237,0.16)]"
>
                 <div className="flex items-start justify-between gap-4 border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.06),rgba(236,72,153,0.05))] px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                        Apply Filter
                      </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
  Access the most relevant data by applying filters. You can filter by status, date range, and more.
</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

<div
className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-8 sm:px-5 sm:py-5"
style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
>
                    <div className="space-y-3.5">

                      {type !== "on-account" ? (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Status
                          </label>
                          <select
                            value={draftFilters.status}
                     onChange={(e) => {
  const nextStatus = e.target.value as StatusFilter;
  const fy = getCurrentFyRange();

  setDraftFilters((prev) => ({
    ...prev,
    status: nextStatus,
    dateFrom:
      nextStatus === "settled" || nextStatus === "adjusted"
        ? prev.dateFrom || fy.from
        : "",
    dateTo:
      nextStatus === "settled" || nextStatus === "adjusted"
        ? prev.dateTo || fy.to
        : "",
  }));
}}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          >
                            {getStatusOptions(type).map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

{(type === "on-account" ||
  draftFilters.status === "settled" ||
  draftFilters.status === "adjusted") ? (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        Date From {type === "on-account" ? "*" : ""}
      </label>
      <input
        type="date"
        value={draftFilters.dateFrom}
        onChange={(e) =>
          setDraftFilters((prev) => ({
            ...prev,
            dateFrom: e.target.value,
          }))
        }
        className="h-10.5 w-full rounded-[18px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        Date To {type === "on-account" ? "*" : ""}
      </label>
      <input
        type="date"
        value={draftFilters.dateTo}
        onChange={(e) =>
          setDraftFilters((prev) => ({
            ...prev,
            dateTo: e.target.value,
          }))
        }
        className="h-10.5 w-full rounded-[18px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>
  </div>
) : (
  <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-3">
    <p className="text-sm font-semibold text-emerald-700">Lifetime Data</p>
    <p className="mt-1 text-xs leading-5 text-emerald-600">
      The loaded data will be shown for the entire lifetime of the account, no need to select date.
    </p>
  </div>
)}

                      {type === "on-account" ? (
                        <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={draftFilters.skipOpeningBalance}
                              onChange={(e) =>
                                setDraftFilters((prev) => ({
                                  ...prev,
                                  skipOpeningBalance: e.target.checked,
                                }))
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                Skip Opening Balance
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                Closing sirf selected range se calculate hoga.
                              </p>
                            </div>
                          </label>
                        </div>
                      ) : null}

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Search
                        </label>
                        <input
                          value={draftFilters.search}
                          onChange={(e) =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              search: e.target.value,
                            }))
                          }
                          placeholder="Ref no, voucher no, particulars..."
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>
                    </div>
                  </div>

<div className="shrink-0 border-t border-violet-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,245,255,0.96))] px-4 py-3.5 sm:px-5">
  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
                

                      <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <button
                          type="button"
                          onClick={() => setFilterOpen(false)}
                          className="inline-flex h-10.5 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={applyFilters}
                          className="inline-flex h-10.5 items-center justify-center rounded-[18px] bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(147,51,234,0.22)] transition-all duration-200 hover:-translate-y-[1px] hover:opacity-95"
                        >
                          Apply Filter
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>,
            document.body,
          )}
          {mounted && pdfActionModal.open && pdfActionModal.target
  ? createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
         className="fixed inset-0 z-[9999] bg-[rgba(15,23,42,0.34)] backdrop-blur-[6px]"
          onClick={closePdfActionModal}
        >
          <div className="hidden min-h-screen items-center justify-center p-4 sm:flex">
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] overflow-hidden rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] shadow-[0_26px_70px_rgba(124,58,237,0.18)]"
            >
              <div className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.06),rgba(236,72,153,0.05))] px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                      PDF Action
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">
                      {pdfActionModal.target.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Choose how you want to continue with this PDF.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closePdfActionModal}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 px-5 py-5">
                <button
                  type="button"
                  onClick={handlePdfView}
                  className="flex w-full items-center justify-between rounded-[22px] border border-violet-100 bg-white px-4 py-4 text-left transition hover:border-violet-200 hover:bg-violet-50/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">View</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Open the PDF in a new browser tab.
                    </p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <Eye className="h-5 w-5" />
                  </span>
                </button>

               <button
  type="button"
  onClick={handlePdfDownload}
  disabled={pdfDownloading}
  className="flex w-full items-center justify-between rounded-[22px] border border-violet-100 bg-white px-4 py-4 text-left transition hover:border-violet-200 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-60"
>
  <div>
    <p className="text-sm font-semibold text-slate-900">
      {pdfDownloading ? "Downloading..." : "Download"}
    </p>
    <p className="mt-1 text-xs text-slate-500">
      Download directly to this device without opening it.
    </p>
  </div>

  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
    {pdfDownloading ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      <Download className="h-5 w-5" />
    )}
  </span>
</button>
              </div>
            </motion.div>
          </div>

          <div className="sm:hidden">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-x-0 bottom-0 overflow-hidden rounded-t-[28px] border-t border-violet-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] shadow-[0_-18px_50px_rgba(124,58,237,0.16)]"
            >
              <div className="flex justify-center pt-3">
                <div className="h-1.5 w-12 rounded-full bg-slate-300" />
              </div>

              <div className="px-4 pb-6 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                      PDF Action
                    </p>
                    <h3 className="mt-2 text-[1.1rem] font-semibold text-slate-900">
                      {pdfActionModal.target.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-5 text-slate-500">
                      Choose how you want to continue with this PDF.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closePdfActionModal}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={handlePdfView}
                    className="flex w-full items-center justify-between rounded-[22px] border border-violet-100 bg-white px-4 py-4 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">View</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Open the PDF in a new browser tab.
                      </p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                      <Eye className="h-5 w-5" />
                    </span>
                  </button>

                 <button
  type="button"
  onClick={handlePdfDownload}
  disabled={pdfDownloading}
  className="flex w-full items-center justify-between rounded-[22px] border border-violet-100 bg-white px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
>
  <div>
    <p className="text-sm font-semibold text-slate-900">
      {pdfDownloading ? "Downloading..." : "Download"}
    </p>
    <p className="mt-1 text-xs text-slate-500">
      Download directly to this device without opening it.
    </p>
  </div>

  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
    {pdfDownloading ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      <Download className="h-5 w-5" />
    )}
  </span>
</button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body,
    )
  : null}
      </motion.div>
    </div>
  );
}

function InfoPill({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm">
      <span className="whitespace-nowrap text-slate-500">{label}:</span>
      <span
        className={`whitespace-nowrap ${
          strong ? "font-bold text-slate-900" : "font-semibold text-slate-900"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function SmallInfoPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3.5 text-[11px] text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <span className="text-slate-500">{label}:</span>
      <span className="font-semibold text-slate-900">{value || "—"}</span>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-white px-6 text-center">
      <div className="rounded-full bg-slate-100 p-4 text-slate-500">
        <Layers className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ReportTableRow({
  row,
  bordered,
  onOpenAttachment,
}: {
  row: ReportRow;
  bordered: boolean;
onOpenAttachment: (
  transactionId?: string | null,
  attachment?: TransactionAttachmentRecord | null,
  label?: string | null,
) => void;
}) {
  const [settlementOpen, setSettlementOpen] = useState(false);

  return (
    <>
      <tr
        className={`transition-colors duration-200 hover:bg-violet-50/40 ${
          bordered ? "border-t border-slate-100" : ""
        }`}
      >
        <td className="px-4 py-3 align-top">
          <p className="text-sm font-bold text-slate-900">
            {formatDate(row.date)}
          </p>
        </td>

        <td className="px-4 py-3 align-top text-sm font-medium">
          {row.attachments?.[0]?.fileUrl ? (
           <button
  type="button"
onClick={() =>
  onOpenAttachment(row.transactionId, row.attachments[0], row.refNo)
}
  className="cursor-pointer font-semibold text-violet-700 underline-offset-4 transition hover:text-fuchsia-700 hover:underline"
  title="Reference options"
>
  {row.refNo || "—"}
</button>
          ) : (
            <span className="text-slate-900">{row.refNo || "—"}</span>
          )}
        </td>

        <td className="px-4 py-3 align-top">
          <div className="space-y-0.5">
            <p className="text-sm text-slate-700">{row.narration}</p>
          </div>
        </td>

        <td className="px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
          <span className="block truncate text-right">
            ₹ {formatCurrency(row.billAmount)}
          </span>
        </td>

        <td className="px-4 py-3 text-right align-top">
          <span className="block truncate text-sm font-bold text-slate-900">
            ₹ {formatCurrency(row.pendingAmount)}
          </span>

{row.settlementRows.length > 0 ? (
  <button
    type="button"
    onClick={() => setSettlementOpen(true)}
    className="mt-1 ml-auto inline-flex whitespace-nowrap text-right text-[11px] font-semibold text-violet-700 underline-offset-4 transition hover:text-fuchsia-700 hover:underline"
  >
    View Settlement
  </button>
) : null}
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
      </tr>

    {settlementOpen ? (
  <SettlementDetailsModal
    row={row}
    onClose={() => setSettlementOpen(false)}
    onOpenAttachment={onOpenAttachment}
  />
) : null}
    </>
  );
}
function UserMobileBillWiseRow({
  row,
  bordered,
  onOpenAttachment,
}: {
  row: ReportRow;
  bordered: boolean;
onOpenAttachment: (
  transactionId?: string | null,
  attachment?: TransactionAttachmentRecord | null,
  label?: string | null,
) => void;
}) {
  const [settlementOpen, setSettlementOpen] = useState(false);

  return (
    <>
      <tr
        className={`${
          bordered ? "border-t border-slate-100" : ""
        } align-top transition-colors duration-200 hover:bg-violet-50/30`}
      >
        <td className="px-2 py-3 align-top">
          <p className="text-[12px] font-semibold leading-4 text-slate-900 break-words">
            {formatDate(row.date)}
          </p>
        </td>

        <td className="px-2 py-3 align-top">
          <p className="line-clamp-2 text-[12px] leading-4 text-slate-800">
            {row.narration || "—"}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-4 text-slate-500">
            {row.attachments?.[0]?.fileUrl ? (
              <button
  type="button"
  onClick={() => onOpenAttachment(row.transactionId, row.attachments[0], row.refNo)}
  className="font-semibold text-violet-700 underline-offset-4 hover:underline"
>
  {row.refNo || "—"}
</button>
            ) : (
              <span>{row.refNo || "—"}</span>
            )}
          </div>

          {row.reportBucket === "receivable-settled-from-advance" ||
          row.reportBucket === "payable-settled-from-advance" ? (
            <p className="mt-1 text-[10px] font-semibold leading-4 text-cyan-700">
              From Adv: {row.originalAdvanceRefNo || "—"}
            </p>
          ) : null}
        </td>

        <td className="px-2 py-3 text-right align-top">
          <p className="whitespace-nowrap text-[12px] font-bold leading-4 text-rose-600">
            {formatCurrency(row.pendingAmount)}
          </p>

          <p className="mt-1 whitespace-nowrap text-[10px] leading-4 text-slate-500">
            {row.status}
          </p>

          {row.settlementRows.length > 0 ? (
            <button
              type="button"
              onClick={() => setSettlementOpen(true)}
              className="mt-1 ml-auto inline-flex whitespace-nowrap text-right text-[11px] font-semibold text-violet-700 underline-offset-4 transition hover:text-fuchsia-700 hover:underline"
            >
              View Settlement
            </button>
          ) : null}
        </td>
      </tr>

     {settlementOpen ? (
  <SettlementDetailsModal
    row={row}
    onClose={() => setSettlementOpen(false)}
    onOpenAttachment={onOpenAttachment}
  />
) : null}
    </>
  );
}
function SettlementDetailsModal({
  row,
  onClose,
  onOpenAttachment,
}: {
  row: ReportRow;
  onClose: () => void;
  onOpenAttachment: (
    transactionId?: string | null,
    attachment?: TransactionAttachmentRecord | null,
    label?: string | null,
  ) => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/30 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-auto w-full max-w-4xl flex-col overflow-hidden rounded-t-[26px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] max-h-[72vh] sm:max-h-[78vh] lg:max-h-[760px] sm:rounded-[24px]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900 sm:text-lg">
              Settlement Details
            </h3>

            {row.originalAdvanceRefNo ? (
              <p className="mt-1 text-[11px] leading-5 text-cyan-700 sm:text-xs">
                Settled through Advance Ref: {row.originalAdvanceRefNo}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          {/* Desktop */}
          <div className="hidden max-h-full overflow-auto rounded-[20px] border border-slate-200 sm:block">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-[28%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
              </colgroup>

              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Voucher No.</th>
                  <th className="px-4 py-3 font-semibold">Particulars</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Adjusted Amount
                  </th>
                  <th className="px-4 py-3 font-semibold">Dr/Cr</th>
                  <th className="px-4 py-3 text-center font-semibold">Open</th>
                </tr>
              </thead>

              <tbody>
                {row.settlementRows.map((item, index) => {
                  const settlementTxn = item.settlementTransaction;
                  const openAttachment =
                    settlementTxn?.attachments?.[0]?.fileUrl ||
                    row.attachments?.[0]?.fileUrl;

                  const openTarget =
                    settlementTxn?.attachments?.[0] || row.attachments?.[0];

                  return (
                    <tr
                      key={item.id}
                      className={index !== 0 ? "border-t border-slate-100" : ""}
                    >
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(settlementTxn?.voucherDate)}
                      </td>

                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                        {settlementTxn?.voucherNo || item.refNo || "—"}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700">
                        {settlementTxn?.particulars || "—"}
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                        ₹ {formatCurrency(item.amount)}
                      </td>

                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                        {item.side || "—"}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {openAttachment ? (
                          <button
  type="button"
  onClick={() =>
   onOpenAttachment(
  settlementTxn?.id,
  openTarget,
  settlementTxn?.voucherNo || item.refNo || row.refNo,
)
  }
  className="text-sm font-semibold text-violet-700 underline-offset-4 hover:underline"
>
  View / Download
</button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="max-h-full overflow-auto rounded-[20px] border border-slate-200 sm:hidden">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[44%]" />
                <col className="w-[32%]" />
              </colgroup>

              <thead className="border-b border-slate-200 bg-slate-50/80">
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Particulars</th>
                  <th className="px-3 py-3 text-right font-semibold">
                    Adjusted Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {row.settlementRows.map((item, index) => {
                  const settlementTxn = item.settlementTransaction;
                  const voucherLabel =
                    settlementTxn?.voucherNo || item.refNo || "—";

                  const openTarget =
                    settlementTxn?.attachments?.[0] || row.attachments?.[0];

                  const hasOpen =
                    !!settlementTxn?.attachments?.[0]?.fileUrl ||
                    !!row.attachments?.[0]?.fileUrl;

                  return (
                    <tr
                      key={item.id}
                      className={index !== 0 ? "border-t border-slate-100" : ""}
                    >
                      <td className="px-3 py-3 align-top">
                        <p className="text-[12px] font-semibold leading-5 text-slate-900">
                          {formatDate(settlementTxn?.voucherDate)}
                        </p>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <p className="text-[12px] leading-5 text-slate-800">
                          {settlementTxn?.particulars || "—"}
                        </p>

                        <div className="mt-1 space-y-1">
                          <p className="text-[11px] font-semibold leading-4 text-violet-700">
                            {voucherLabel}
                          </p>

                         {hasOpen ? (
  <button
    type="button"
    onClick={() =>
     onOpenAttachment(
  settlementTxn?.id,
  openTarget,
  settlementTxn?.voucherNo || item.refNo || row.refNo,
)
    }
    className="text-[11px] font-semibold leading-4 text-violet-700 underline-offset-4 hover:underline"
  >
    View / Download
  </button>
) : null}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right align-top">
                        <p className="text-[12px] font-bold leading-5 text-slate-900">
                          ₹ {formatCurrency(item.amount)}
                        </p>

                        <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                          {item.side || "—"}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
function RowActionMenu({
  row,
  compact = false,
  onOpenAttachment,
}: {
  row: ReportRow;
  compact?: boolean;
onOpenAttachment: (
  transactionId?: string | null,
  attachment?: TransactionAttachmentRecord | null,
  label?: string | null,
) => void;
}) {
  const [settlementOpen, setSettlementOpen] = useState(false);
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
      const menuWidth = window.innerWidth < 640 ? 190 : 220;
      const viewportPadding = 12;

      let left = rect.right - menuWidth;
      if (left < viewportPadding) left = viewportPadding;
      if (left + menuWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - menuWidth - viewportPadding;
      }

      let top = rect.bottom + 8;
      const estimatedHeight = row.settlementRows.length > 0 ? 116 : 64;

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

  function openAttachmentInNewTab(arg0: TransactionAttachmentRecord | undefined): void {
    throw new Error("Function not implemented.");
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
       className={`inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 ${
  compact ? "h-9 w-9" : "h-10 w-10"
}`}
        title="Actions"
      >
        <MoreHorizontal size={compact ? 16 : 18} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 500,
            }}
            className="rounded-2xl border border-violet-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.96))] p-2 shadow-[0_22px_50px_rgba(124,58,237,0.16)]"
          >
            <MenuButton
  label="View / Download"
  disabled={!row.attachments.length}
  onClick={() => {
    setOpen(false);
  onOpenAttachment(
  row.transactionId,
  row.attachments[0],
  row.refNo || row.voucherNo,
);
  }}
/>

{row.settlementRows.length > 0 ? (
  <button
    type="button"
    onClick={() => {
      const event = new CustomEvent("open-mobile-settlement", {
        detail: row,
      });
      window.dispatchEvent(event);
    }}
    className="mt-1 inline-flex whitespace-nowrap text-[11px] font-semibold leading-none text-violet-700 underline-offset-4 hover:underline"
  >
    View Settlement
  </button>
) : null}
          </motion.div>,
          document.body,
        )}

      {mounted &&
        settlementOpen &&
        createPortal(
          <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/30 p-2 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
                {row.originalAdvanceRefNo ? (
  <div className="border-b border-slate-100 bg-cyan-50/70 px-4 py-3 sm:px-5">
    <p className="text-sm font-semibold text-cyan-800">
      Settled through Advance Ref: {row.originalAdvanceRefNo}
    </p>
    <p className="mt-1 text-xs text-cyan-700">
      Advance Voucher: {row.originalAdvanceVoucherNo || "—"}
      {row.originalAdvanceAmount
        ? ` • Advance Amount: ₹ ${formatCurrency(row.originalAdvanceAmount)}`
        : ""}
    </p>
  </div>
) : null}
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                  Settlement Details
                </h3>
                <button
                  onClick={() => setSettlementOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-5 sm:py-4">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold sm:px-4">
                        Date
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold sm:px-4">
                        Particulars
                      </th>
                      <th className="hidden border-b border-slate-200 px-4 py-3 font-semibold sm:table-cell">
                        Voucher Type
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 font-semibold sm:px-4">
                        Voucher No.
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-right font-semibold sm:px-4">
                        Amount
                      </th>
                      <th className="border-b border-slate-200 px-3 py-3 text-center font-semibold sm:px-4">
                        Dr./Cr.
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {row.settlementRows.map((s, i) => (
                      <tr key={i} className="transition-colors hover:bg-slate-50/80">
                        <td className="border-b border-slate-100 px-3 py-3 text-[12px] text-slate-800 sm:px-4 sm:text-sm">
                          {formatDate(s.settlementTransaction.voucherDate)}
                        </td>

                        <td className="border-b border-slate-100 px-3 py-3 text-[12px] text-slate-700 sm:px-4 sm:text-sm">
                          {s.settlementTransaction.particulars || "-"}
                        </td>

                        <td className="hidden border-b border-slate-100 px-4 py-3 text-sm text-slate-700 sm:table-cell">
                          {formatTypeLabel(s.settlementTransaction.type)}
                        </td>

                        <td className="border-b border-slate-100 px-3 py-3 text-[12px] sm:px-4 sm:text-sm">
                          <button
                            type="button"
                           onClick={() =>
  onOpenAttachment(
    s.settlementTransaction.id,
    s.settlementTransaction.attachments?.[0],
    s.settlementTransaction.voucherNo,
  )
}
                            className="cursor-pointer font-semibold text-violet-700 underline-offset-4 transition hover:text-fuchsia-700 hover:underline"
                            title="Open voucher attachment"
                          >
                            {s.settlementTransaction.voucherNo}
                          </button>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-3 text-right text-[12px] font-semibold text-slate-900 sm:px-4 sm:text-sm">
                          ₹ {formatCurrency(s.amount)}
                        </td>

                        <td className="border-b border-slate-100 px-3 py-3 text-center text-[12px] font-semibold text-slate-700 sm:px-4 sm:text-sm">
                          {s.side}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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