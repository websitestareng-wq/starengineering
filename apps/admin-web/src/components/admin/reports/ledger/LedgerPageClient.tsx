"use client";

import { useEffect, useMemo, useState } from "react";
import GlobalPageLoader from "@/components/admin/GlobalPageLoader";
import {
  CalendarRange,
  Download,
  Eye,
  FileSearch,
  FileText,
  Filter,
  Layers,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  getTransactions,
  type TransactionAttachmentRecord,
  type TransactionRecord,
  type TransactionType,
} from "@/lib/api/transactions-api";

type LedgerRow = {
  id: string;
  transactionId: string;
  partyId: string;
  partyName: string;
  date: string;
  particulars: string;
  voucherType: TransactionType | string;
  voucherNo: string;
  debit: number;
  credit: number;
  narration: string;
  rawTransaction: TransactionRecord;
  attachments: TransactionAttachmentRecord[];
  isOpeningLike: boolean;
};

type LedgerFilters = {
  fromDate: string;
  toDate: string;
  skipOpeningBalance: boolean;
  voucherTypes: string[];
  search: string;
};

type PdfActionTarget = {
  url: string;
  fileName: string;
  title: string;
};

type PdfActionModalState = {
  open: boolean;
  target: PdfActionTarget | null;
};
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};
function getCurrentFinancialYearRange() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const from = new Date(year, 3, 1);
  const to = new Date(year + 1, 2, 31);

  return {
    fromDate: formatDateForInput(from),
    toDate: formatDateForInput(to),
  };
}

function createDefaultFilters(): LedgerFilters {
  const fy = getCurrentFinancialYearRange();

  return {
    fromDate: fy.fromDate,
    toDate: fy.toDate,
    skipOpeningBalance: false,
    voucherTypes: [],
    search: "",
  };
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date?: string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatInputDate(date?: string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return formatDateForInput(d);
}

function formatCurrency(value?: number | string | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompactCurrency(value?: number | string | null) {
  const amount = Number(value || 0);
  if (!amount) return "0";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTypeLabel(type?: string | null) {
  if (!type) return "—";

  return String(type)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function readPortalUser() {
  if (typeof window === "undefined") return null;

  const keys = ["currentUser", "auth_user", "user"];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as {
        id?: string;
        name?: string;
        role?: string;
      };

      if (parsed?.id) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return null;
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
function getTransactionAmounts(transaction: TransactionRecord) {
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

function buildParticulars(transaction: TransactionRecord) {
  const { debit, credit } = getTransactionAmounts(transaction);
  const prefix = debit > 0 ? "To" : credit > 0 ? "By" : "To";
  const narration = String(transaction.particulars || "").trim();

  if (narration) return `${prefix} ${narration}`;
  return `${prefix} ${formatTypeLabel(transaction.type)}`;
}

function isOpeningLikeTransaction(txn: TransactionRecord) {
  const voucherType = String(txn.type || "").toUpperCase();
  const voucherNo = String(txn.voucherNo || "").toLowerCase();
  const particulars = String(txn.particulars || "").toLowerCase();

  return (
    voucherType.includes("OPENING") ||
    voucherNo.includes("opening") ||
    particulars.includes("opening")
  );
}

function matchesDateRange(date: string, fromDate: string, toDate: string) {
  const value = formatInputDate(date);
  if (!value) return false;
  if (fromDate && value < fromDate) return false;
  if (toDate && value > toDate) return false;
  return true;
}

function isBeforeDate(date: string, compareTo: string) {
  const value = formatInputDate(date);
  if (!value || !compareTo) return false;
  return value < compareTo;
}

function getSignedAmount(transaction: TransactionRecord) {
  const { debit, credit } = getTransactionAmounts(transaction);
  return Number((debit - credit).toFixed(2));
}

function getBalanceLabel(amount: number) {
  const normalized = Number(amount || 0);

  return {
    amount: Math.abs(Number(normalized.toFixed(2))),
    type: normalized > 0 ? "Dr" : normalized < 0 ? "Cr" : "",
  };
}

export default function LedgerPageClient() {
  const defaultFilters = useMemo(() => createDefaultFilters(), []);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

const [partyId, setPartyId] = useState("");
const [searchInput, setSearchInput] = useState("");
const [filters, setFilters] = useState<LedgerFilters>(defaultFilters);
const [draftFilters, setDraftFilters] = useState<LedgerFilters>(defaultFilters);
const [filterOpen, setFilterOpen] = useState(false);
const [pdfActionModal, setPdfActionModal] = useState<PdfActionModalState>({
  open: false,
  target: null,
});
const [mounted, setMounted] = useState(false);
const [portalUser, setPortalUser] = useState<{
  id?: string;
  name?: string;
  role?: string;
} | null>(null);
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
  setMounted(true);
}, []);
useEffect(() => {
  setPortalUser(readPortalUser());
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
  useEffect(() => {
    void loadData();
  }, []);

  const partyOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const txn of transactions) {
      if (txn.party?.id && txn.party?.name) {
        map.set(txn.party.id, txn.party.name);
      }
    }

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

  const voucherTypeOptions = useMemo(() => {
    const set = new Set<string>();

    transactions.forEach((txn) => {
      if (txn.type) set.add(String(txn.type));
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const partyTransactions = useMemo(() => {
    if (!partyId) return [];

    return transactions
      .filter((txn) => txn.partyId === partyId)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.voucherDate).getTime() - new Date(b.voucherDate).getTime(),
      );
  }, [partyId, transactions]);

  const visibleTransactions = useMemo(() => {
  return partyTransactions.filter((txn) => {
    if (!matchesDateRange(txn.voucherDate, filters.fromDate, filters.toDate)) {
      return false;
    }

    if (
      filters.voucherTypes.length > 0 &&
      !filters.voucherTypes.includes(String(txn.type || ""))
    ) {
      return false;
    }

    return true;
  });
}, [filters, partyTransactions]);

  const openingNet = useMemo(() => {
  if (!partyTransactions.length || !filters.fromDate) return 0;

  if (filters.skipOpeningBalance) {
    return 0;
  }

  return Number(
    partyTransactions
      .filter((txn) => isBeforeDate(txn.voucherDate, filters.fromDate))
      .reduce((sum, txn) => sum + getSignedAmount(txn), 0)
      .toFixed(2),
  );
}, [filters.fromDate, filters.skipOpeningBalance, partyTransactions]);

  const ledgerRows = useMemo<LedgerRow[]>(() => {
    if (!partyId) return [];

    const rows: LedgerRow[] = visibleTransactions.map((txn) => {
      const { debit, credit } = getTransactionAmounts(txn);

      return {
  id: `ledger-${txn.id}`,
  transactionId: txn.id,
  partyId: txn.partyId,
  partyName: txn.party?.name || "—",
  date: txn.voucherDate,
  particulars: buildParticulars(txn),
  voucherType: txn.type,
  voucherNo: txn.voucherNo || "—",
  debit,
  credit,
  narration: txn.particulars || "",
  rawTransaction: txn,
  attachments: txn.attachments || [],
  isOpeningLike: isOpeningLikeTransaction(txn),
};
    });

    const q = filters.search.trim().toLowerCase();

    const filtered = q
      ? rows.filter((row) => {
          return (
            row.partyName.toLowerCase().includes(q) ||
            row.particulars.toLowerCase().includes(q) ||
            String(row.voucherType).toLowerCase().includes(q) ||
            row.voucherNo.toLowerCase().includes(q) ||
            row.narration.toLowerCase().includes(q) ||
            formatDate(row.date).toLowerCase().includes(q)
          );
        })
      : rows;

    filtered.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return filtered;
  }, [filters.search, partyId, visibleTransactions]);

  const periodTotals = useMemo(() => {
    const debit = ledgerRows.reduce((sum, row) => sum + row.debit, 0);
    const credit = ledgerRows.reduce((sum, row) => sum + row.credit, 0);
    const net = Number((openingNet + debit - credit).toFixed(2));
    const opening = getBalanceLabel(openingNet);
    const closing = getBalanceLabel(net);

    return {
      count: ledgerRows.length,
      debit: Number(debit.toFixed(2)),
      credit: Number(credit.toFixed(2)),
      openingAmount: opening.amount,
      openingType: opening.type,
      closingAmount: closing.amount,
      closingType: closing.type,
    };
  }, [ledgerRows, openingNet]);

  const selectedPartyName =
    partyOptions.find((party) => party.id === partyId)?.name || "";

  function openFilterModal() {
    setDraftFilters({
      ...filters,
      search: searchInput,
    });
    setFilterOpen(true);
  }

  function applyFilters() {
    setFilters({
      ...draftFilters,
      search: searchInput.trim(),
    });
    setFilterOpen(false);
  }

  function resetFilters() {
    const freshDefaults = createDefaultFilters();
    setDraftFilters(freshDefaults);
    setSearchInput("");
  }

  function clearAppliedFilters() {
    const freshDefaults = createDefaultFilters();
    setFilters(freshDefaults);
    setDraftFilters(freshDefaults);
    setSearchInput("");
  }

function toggleVoucherType(type: string) {
  setDraftFilters((prev) => ({
    ...prev,
    voucherTypes: prev.voucherTypes.includes(type)
      ? prev.voucherTypes.filter((item) => item !== type)
      : [...prev.voucherTypes, type],
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
  if (!pdfActionModal.target?.url) return;

  await downloadFileFromUrl(
    pdfActionModal.target.url,
    pdfActionModal.target.fileName,
  );

  closePdfActionModal();
}

function openVoucherAttachmentAction(
  attachment?: TransactionAttachmentRecord | null,
  voucherNo?: string | null,
) {
  if (!attachment?.fileUrl) return;

  openPdfActionModal({
    url: attachment.fileUrl,
    title: voucherNo ? `Voucher ${voucherNo}` : "Voucher Attachment",
    fileName: buildSafePdfFileName(
      voucherNo ? `Voucher-${voucherNo}` : "voucher-attachment.pdf",
    ),
  });
}

function exportPdf() {
  if (!partyId) return;
  if (!filters.fromDate || !filters.toDate) return;
  if (!API_BASE_URL) {
    console.error("NEXT_PUBLIC_API_BASE_URL is not defined.");
    return;
  }

  const url = new URL(
    `${API_BASE_URL.replace(/\/$/, "")}/transactions/reports/ledger/pdf`,
  );

  url.searchParams.set("partyId", partyId);
  url.searchParams.set("from", filters.fromDate);
  url.searchParams.set("to", filters.toDate);

  if (filters.skipOpeningBalance) {
    url.searchParams.set("skipOpeningBalance", "true");
  }

  const fileLabel = selectedPartyName?.trim() || "ledger";

  openPdfActionModal({
    url: url.toString(),
    title: "Ledger PDF",
    fileName: buildSafePdfFileName(
      `${fileLabel} Ledger ${filters.fromDate} to ${filters.toDate}.pdf`,
    ),
  });
}

  const hasActiveFilters =
    !!filters.fromDate ||
    !!filters.toDate ||
    filters.skipOpeningBalance ||
    filters.voucherTypes.length > 0 ||
    !!filters.search;

  return (
    <div className="space-y-4">
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.32, ease: "easeOut" }}
  className="overflow-hidden rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.96))] shadow-[0_24px_70px_rgba(124,58,237,0.10)] backdrop-blur-xl"
>
  <div className="hidden border-b border-violet-100/80 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.07),rgba(236,72,153,0.06))] px-5 py-5 sm:px-6 lg:block">
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 xl:max-w-[620px]">
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
            Ledger
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Party-wise ledger report with compact layout, opening and closing balances, attachment access.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <CompactInfoPill
              label="Opening"
              value={
                filters.skipOpeningBalance
                  ? "SKIPPED"
                  : `${formatCompactCurrency(periodTotals.openingAmount)}${periodTotals.openingType ? ` ${periodTotals.openingType}` : ""}`
              }
            />
            <CompactInfoPill
              label="Closing"
              value={`${formatCompactCurrency(periodTotals.closingAmount)}${periodTotals.closingType ? ` ${periodTotals.closingType}` : ""}`}
              strong
            />
          </div>
        </div>

        <div className="w-full max-w-[780px]">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Party
              </label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFilters((prev) => ({
                      ...prev,
                      search: searchInput.trim(),
                    }));
                  }
                }}
                placeholder="Search by date, particulars, voucher type, voucher no..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <button
              type="button"
              onClick={exportPdf}
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
    <div className="border-b border-violet-100/80 bg-[linear-gradient(135deg,rgba(168,85,247,0.10),rgba(124,58,237,0.08),rgba(236,72,153,0.07))] px-4 py-4 sm:hidden">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
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
          Ledger
        </h2>

        <p className="mt-2 text-[13px] leading-5 text-slate-500">
           Party-wise ledger report with compact layout, opening and closing balances, attachment access.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <CompactInfoPill
            label="Opening"
            value={
              filters.skipOpeningBalance
                ? "SKIPPED"
                : `${formatCompactCurrency(periodTotals.openingAmount)}${periodTotals.openingType ? ` ${periodTotals.openingType}` : ""}`
            }
          />
          <CompactInfoPill
            label="Closing"
            value={`${formatCompactCurrency(periodTotals.closingAmount)}${periodTotals.closingType ? ` ${periodTotals.closingType}` : ""}`}
            strong
          />
        </div>
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
        onClick={exportPdf}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-violet-100 bg-white/92 px-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 active:scale-[0.99]"
      >
        <FileText className="h-4 w-4" />
        Export PDF
      </button>
    </div>
  </div>
</motion.div>
  

      {loading ? (
        
        <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
          <div className="text-center">
           <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
  <Loader2 className="h-7 w-7 animate-spin" />
</div>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Loading ledger...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Please wait while we prepare your report.
            </p>
          </div>
        </div>
      ) : !partyId ? (
        <EmptyState
          title="No party selected"
          description="Please select party from the dropdown above to view the ledger report."
        />
      ) : (
        <>

          {ledgerRows.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                title="No matching ledger rows"
                description="No Transaction found. Please try to change filter."
              />

            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)] lg:block">
                <table className="w-full table-fixed">
<colgroup>
  <col className="w-[12%]" />
  <col className="w-[30%]" />
  <col className="w-[16%]" />
  <col className="w-[14%]" />
  <col className="w-[14%]" />
  <col className="w-[14%]" />
</colgroup>

                  <thead className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.07),rgba(124,58,237,0.05),rgba(236,72,153,0.04))]">
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
                    {ledgerRows.map((row, index) => (
                     <motion.tr
  key={row.id}
  variants={fadeUp}
  initial="initial"
  animate="animate"
  exit="exit"
  className={`${index !== 0 ? "border-t border-slate-100" : ""} transition-colors duration-200 hover:bg-violet-50/40`}
>
                        <td className="px-4 py-3 align-top">
  <div className="space-y-0.5">
    <p className="text-sm font-bold text-slate-900">
      {formatDate(row.date) || "—"}
    </p>
  </div>
</td>

                        <td className="px-4 py-3 align-top">
  <div className="space-y-0.5">
    <p className="text-sm text-slate-700">
      {row.particulars || "—"}
    </p>
  </div>
</td>

                       <td className="px-4 py-3 align-top text-sm text-slate-700">
  <span className="block truncate">
    {formatTypeLabel(String(row.voucherType))}
  </span>
</td>

<td className="px-4 py-3 align-top text-sm font-medium">
  {row.attachments?.[0]?.fileUrl ? (
    <button
      type="button"
      onClick={() =>
        openVoucherAttachmentAction(row.attachments[0], row.voucherNo)
      }
      className="cursor-pointer font-semibold text-violet-700 underline-offset-4 transition hover:text-fuchsia-700 hover:underline"
      title="Voucher options"
    >
      {row.voucherNo || "—"}
    </button>
  ) : (
    <span className="text-slate-900">{row.voucherNo || "—"}</span>
  )}
</td>

                      <td className="px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
  <span className="block truncate text-right">
    {filters.skipOpeningBalance && row.isOpeningLike
      ? "SKIPPED"
      : row.debit
        ? `₹ ${formatCurrency(row.debit)}`
        : ""}
  </span>
</td>
<td className="px-4 py-3 text-right align-top text-sm font-bold text-slate-900">
  <span className="block truncate text-right">
    {filters.skipOpeningBalance && row.isOpeningLike
      ? "SKIPPED"
      : row.credit
        ? `₹ ${formatCurrency(row.credit)}`
        : ""}
  </span>
</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
  {ledgerRows.map((row, index) => (
    <motion.tr
      key={row.id}
      variants={fadeUp}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`${
        index !== 0 ? "border-t border-slate-100" : ""
      } align-top transition-colors duration-200 hover:bg-violet-50/30`}
    >
      {/* DATE */}
      <td className="px-2 py-3 align-top">
        <p className="text-[12px] font-semibold leading-4 text-slate-900 break-words">
          {formatDate(row.date)}
        </p>
      </td>

      {/* PARTICULARS */}
      <td className="px-2 py-3 align-top">
        <p className="line-clamp-2 text-[12px] leading-4 text-slate-800">
          {row.particulars || "—"}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-4 text-slate-500">
          <span>{formatTypeLabel(String(row.voucherType))}</span>
          <span>•</span>
        {row.attachments?.[0]?.fileUrl ? (
  <button
    type="button"
    onClick={() =>
      openVoucherAttachmentAction(row.attachments[0], row.voucherNo)
    }
    className="cursor-pointer font-semibold text-violet-700 underline-offset-4 hover:underline"
  >
    {row.voucherNo || "—"}
  </button>
) : (
  <span>{row.voucherNo || "—"}</span>
)}
        </div>
      </td>

      {/* AMOUNT */}
      <td className="px-2 py-3 text-right align-top">
        <p className="text-[12px] font-bold leading-4 text-slate-900 break-words">
          {filters.skipOpeningBalance && row.isOpeningLike
            ? "SKIPPED"
            : row.debit
              ? `${formatCurrency(row.debit)}`
              : row.credit
                ? `${formatCurrency(row.credit)}`
                : ""}
        </p>

        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          {row.debit ? "Debit" : row.credit ? "Credit" : ""}
        </p>
      </td>
    </motion.tr>
  ))}
</tbody>
  </table>
</div>


            </>
          )}
        </>
      )}

{mounted && filterOpen
  ? createPortal(
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
            className="my-auto flex w-full max-w-[520px] max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-[22px] border border-violet-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] shadow-[0_26px_70px_rgba(124,58,237,0.16)] sm:max-h-[84vh] sm:rounded-[26px]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.06),rgba(236,72,153,0.05))] px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                  Apply Filter
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  Date range, opening balance aur voucher types yahin se control honge.
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
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
              }}
            >
              <div className="space-y-3.5">
                <div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Party
  </label>

  <select
    value={partyId}
    onChange={(e) => setPartyId(e.target.value)}
    className="h-10.5 w-full rounded-[18px] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={draftFilters.fromDate}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          fromDate: e.target.value,
                        }))
                      }
                      className="h-10.5 w-full rounded-[18px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={draftFilters.toDate}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          toDate: e.target.value,
                        }))
                      }
                      className="h-10.5 w-full rounded-[18px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>
                </div>

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
                        Opening type entries ko report se skip karega.
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-700">
                    Voucher Type
                  </label>

                  {voucherTypeOptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No voucher types found.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {voucherTypeOptions.map((type) => {
                        const active = draftFilters.voucherTypes.includes(type);

                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => toggleVoucherType(type)}
                            className={`inline-flex min-h-[38px] cursor-pointer items-center rounded-2xl border px-3 text-sm font-semibold transition ${
                              active
                                ? "border-violet-200 bg-violet-50 text-violet-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {formatTypeLabel(type)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-violet-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,245,255,0.96))] px-4 py-3.5 sm:px-5">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-10.5 items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                >
                  Reset
                </button>

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
    )
  : null}
  {mounted && pdfActionModal.open && pdfActionModal.target
  ? createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[150] bg-[rgba(15,23,42,0.34)] backdrop-blur-[6px]"
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
                  className="flex w-full items-center justify-between rounded-[22px] border border-violet-100 bg-white px-4 py-4 text-left transition hover:border-violet-200 hover:bg-violet-50/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Download</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Download directly to this device without opening it.
                    </p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <Download className="h-5 w-5" />
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
                    className="flex w-full items-center justify-between rounded-[22px] border border-violet-100 bg-white px-4 py-4 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Download</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Download directly to this device without opening it.
                      </p>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                      <Download className="h-5 w-5" />
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
    </div>
  );
}

function CompactInfoPill({
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

function MiniSummaryCard({
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
      <p className="mt-1 min-h-[20px] whitespace-nowrap text-sm font-bold text-slate-900">
        {value || "0"}
      </p>
    </div>
  );
}

function AttachmentIconButton({
  attachment,
  disabled,
}: {
  attachment?: TransactionAttachmentRecord | null;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || !attachment?.fileUrl}
      onClick={() => {
        if (!attachment?.fileUrl) return;
        openUrlInNewTab(attachment.fileUrl);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
      title="Open attachment"
    >
      <Eye className="h-4 w-4" />
    </button>
  );
}

function FilterTag({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-[32px] items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
      {label}
    </span>
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