"use client";

import {
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Mail,
  MoreHorizontal,
  PencilLine,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { createPortal } from "react-dom";
import GlobalPageLoader from "@/components/admin/GlobalPageLoader";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  bulkSendTransactionEmails,
  deleteTransaction,
  getTransactions,
  sendTransactionEmail,
  type TransactionRecord,
  type TransactionType,
} from "@/lib/api/transactions-api";
import { getUsers } from "@/lib/users-api";
import type { PortalUser } from "@/types/user";
import TransactionFormModal from "./TransactionFormModal";

type ActionMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "lastMonth"
  | "thisMonth"
  | "currentFY"
  | "previousFY"
  | "custom";

type DateRange = {
  from: string;
  to: string;
};

function formatDate(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
  });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value?: string | number | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTypeLabel(type: TransactionType) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPresetRange(preset: DatePreset): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const last7Start = new Date(today);
  last7Start.setDate(last7Start.getDate() - 6);

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const currentFYStart =
    today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);

  const currentFYEnd =
    today.getMonth() >= 3
      ? new Date(today.getFullYear() + 1, 2, 31)
      : new Date(today.getFullYear(), 2, 31);

  const previousFYStart = new Date(currentFYStart.getFullYear() - 1, 3, 1);
  const previousFYEnd = new Date(currentFYStart.getFullYear(), 2, 31);

  switch (preset) {
    case "today":
      return {
        from: formatDateInput(today),
        to: formatDateInput(today),
      };

    case "yesterday":
      return {
        from: formatDateInput(yesterday),
        to: formatDateInput(yesterday),
      };

    case "last7":
      return {
        from: formatDateInput(last7Start),
        to: formatDateInput(today),
      };

    case "lastMonth":
      return {
        from: formatDateInput(lastMonthStart),
        to: formatDateInput(lastMonthEnd),
      };

    case "thisMonth":
      return {
        from: formatDateInput(startOfMonth),
        to: formatDateInput(endOfMonth),
      };

    case "currentFY":
      return {
        from: formatDateInput(currentFYStart),
        to: formatDateInput(currentFYEnd),
      };

    case "previousFY":
      return {
        from: formatDateInput(previousFYStart),
        to: formatDateInput(previousFYEnd),
      };

    default:
      return {
        from: "",
        to: "",
      };
  }
}

export default function TransactionsPageClient() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionType | "all">("all");

  const [datePreset, setDatePreset] = useState<DatePreset>("thisMonth");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [message, setMessage] = useState<ActionMessage>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionRecord | null>(null);
  const [viewTransaction, setViewTransaction] =
    useState<TransactionRecord | null>(null);
const [deleteTarget, setDeleteTarget] = useState<TransactionRecord | null>(
  null,
);
const [deleteLoading, setDeleteLoading] = useState(false);

const [confirmEmail, setConfirmEmail] =
  useState<TransactionRecord | null>(null);
const [confirmBulkEmail, setConfirmBulkEmail] = useState(false);
const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [bulkEmailLoading, setBulkEmailLoading] = useState(false);
const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
const [mobileSearchDraft, setMobileSearchDraft] = useState("");
const [mobileTypeDraft, setMobileTypeDraft] =
  useState<TransactionType | "all">("all");
const [mobileDatePresetDraft, setMobileDatePresetDraft] =
  useState<DatePreset>("thisMonth");
const [mobileCustomFromDraft, setMobileCustomFromDraft] = useState("");
const [mobileCustomToDraft, setMobileCustomToDraft] = useState("");
const [mounted, setMounted] = useState(false);
  const appliedDateRange = useMemo(() => {
    if (datePreset === "custom") {
      return {
        from: customFrom,
        to: customTo,
      };
    }

    return getPresetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  async function loadData(soft = false) {
    try {
      if (soft) setTableLoading(true);
      else setLoading(true);

      const [transactionData, userData] = await Promise.all([
        getTransactions({
          q: search,
          type,
          from: appliedDateRange.from || undefined,
          to: appliedDateRange.to || undefined,
        }),
        getUsers({ search: "", status: "all" }),
      ]);

      setTransactions(transactionData || []);
      setUsers(userData.items || []);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load transactions",
      });
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }
useEffect(() => {
  setMounted(true);
}, []);
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadData(true);
  }, [search, type, appliedDateRange.from, appliedDateRange.to]);

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => transactions.some((item) => item.id === id)),
    );
  }, [transactions]);
useEffect(() => {
  if (!mobileFilterOpen) return;

  setMobileSearchDraft(searchInput);
  setMobileTypeDraft(type);
  setMobileDatePresetDraft(datePreset);
  setMobileCustomFromDraft(customFrom);
  setMobileCustomToDraft(customTo);
}, [mobileFilterOpen, searchInput, type, datePreset, customFrom, customTo]);
  const stats = useMemo(() => {
    const total = transactions.length;
    const totalAmount = transactions.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    return {
      total,
      totalAmount,
    };
  }, [transactions]);

  const allVisibleSelected =
    transactions.length > 0 &&
    transactions.every((transaction) => selectedIds.includes(transaction.id));

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      setMessage(null);

      await deleteTransaction(deleteTarget.id);

      setDeleteTarget(null);
      setMessage({
        type: "success",
        text: "Transaction deleted successfully.",
      });

      await loadData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to delete transaction",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !transactions.some((item) => item.id === id)),
      );
      return;
    }

    setSelectedIds((prev) => {
      const merged = new Set(prev);
      transactions.forEach((item) => merged.add(item.id));
      return Array.from(merged);
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }
function applyMobileFilters() {
  setSearchInput(mobileSearchDraft);
  setType(mobileTypeDraft);
  setDatePreset(mobileDatePresetDraft);
  setCustomFrom(mobileCustomFromDraft);
  setCustomTo(mobileCustomToDraft);
  setMobileFilterOpen(false);
}
  async function handleSingleEmail(transaction: TransactionRecord) {
    try {
      setMessage(null);

      const response = await sendTransactionEmail(transaction.id);

      setMessage({
        type: "success",
        text: response.message || `Email sent for ${transaction.voucherNo}.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to send email.",
      });
    }
  }

  async function handleBulkEmail() {
    try {
      setBulkEmailLoading(true);
      setMessage(null);

      if (selectedIds.length === 0) {
        setMessage({
          type: "error",
          text: "Please select at least one transaction.",
        });
        return;
      }

      const response = await bulkSendTransactionEmails(selectedIds);

      setMessage({
        type: "success",
        text:
          response.message ||
          `${response.total || selectedIds.length} email(s) sent successfully.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to send bulk emails.",
      });
    } finally {
      setBulkEmailLoading(false);
    }
  }

  async function handleBulkDelete() {
    const selectedTransactions = transactions.filter((item) =>
      selectedIds.includes(item.id),
    );

    if (selectedTransactions.length === 0) return;

    try {
      setBulkDeleteLoading(true);
      setMessage(null);

      for (const transaction of selectedTransactions) {
        await deleteTransaction(transaction.id);
      }

      setMessage({
        type: "success",
        text: `${selectedTransactions.length} transaction(s) deleted successfully.`,
      });

      clearSelection();
      await loadData(true);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to delete selected transactions",
      });
    } finally {
      setBulkDeleteLoading(false);
    }
  }

  return (
    <div className="w-full px-0 py-0">
      <div className="w-full rounded-none border-0 bg-transparent p-0 shadow-none">
       <div className="rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.96))] p-4 shadow-[0_24px_70px_rgba(124,58,237,0.10)] backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm">
  <Receipt size={14} />
  Accounts Transactions
</div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Transactions Management
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Create, manage, edit, review, filter, email, and control
                voucher-based accounting entries with billwise allocation and
                reports-ready transaction structure.
              </p>
            </div>
<div className="mt-4 grid grid-cols-2 gap-3 lg:hidden">
  <button
    type="button"
    onClick={() => setCreateOpen(true)}
    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)]"
  >
    <Plus size={17} />
    Add Transaction
  </button>

  <button
    type="button"
    onClick={() => setMobileFilterOpen(true)}
    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-white/92 px-4 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
  >
    <Filter size={16} />
    Apply Filter
  </button>
</div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
            className="hidden items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)] transition duration-300 hover:-translate-y-0.5 hover:opacity-95 active:scale-[0.98] xl:inline-flex"
            >
              <Plus size={18} />
              Add Transaction
            </button>
          </div>

{message && (
  <div
    className={`mt-5 rounded-[22px] border px-4 py-3 text-sm font-medium shadow-sm ${
      message.type === "success"
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
        : "border-rose-200 bg-rose-50/80 text-rose-700"
    }`}
  >
    {message.text}
  </div>
)}

         <div className="mt-5 rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.94))] p-4 shadow-[0_18px_46px_rgba(124,58,237,0.08)]">
           <div className="hidden flex-col gap-3 lg:flex">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full xl:max-w-xl">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by voucher no, particulars, party, reference..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as TransactionType | "all")
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition duration-300 focus:border-violet-400"
                  >
                    <option value="all">All Types</option>
                    <option value="SALES">Sales</option>
                    <option value="PURCHASE">Purchase</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="RECEIPT">Receipt</option>
                    <option value="DEBIT_NOTE">Debit Note</option>
                    <option value="CREDIT_NOTE">Credit Note</option>
                    <option value="JOURNAL_DR">Journal Dr.</option>
                    <option value="JOURNAL_CR">Journal Cr.</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => loadData(true)}
                   className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-white/90 px-5 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/60"
                  >
                    <RefreshCcw size={16} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisMonth">This Month</option>
                  <option value="currentFY">Current Financial Year</option>
                  <option value="previousFY">Previous FY</option>
                  <option value="custom">Custom Date Range</option>
                </select>

                {datePreset === "custom" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-violet-400"
                    />
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-violet-400"
                    />
                  </div>
                ) : (
                  <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-500">
                    {appliedDateRange.from && appliedDateRange.to
                      ? `${appliedDateRange.from} → ${appliedDateRange.to}`
                      : "No date filter applied"}
                  </div>
                )}
              </div>
            </div>

            {selectedIds.length > 0 && (
             <div className="mt-5 flex flex-col gap-3 rounded-[22px] border border-violet-100 bg-[linear-gradient(135deg,rgba(245,243,255,1),rgba(250,245,255,0.98))] p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-sm font-semibold text-violet-800">
                  {selectedIds.length} transaction(s) selected
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
  type="button"
  onClick={() => setConfirmBulkEmail(true)}
  disabled={bulkEmailLoading}
 className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-violet-50 disabled:opacity-60"
>
  <Mail size={16} />
  {bulkEmailLoading ? "Sending..." : "Send Email"}
</button>

<button
  type="button"
  onClick={() => setConfirmBulkDelete(true)}
  disabled={bulkDeleteLoading}
  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
>
  <Trash2 size={16} />
  {bulkDeleteLoading ? "Deleting..." : "Delete Selected"}
</button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5">
{loading ? (
  <GlobalPageLoader
    title="Loading Transactions..."
    subtitle="Please wait while we fetch the latest transactions for you."
  />
) : transactions.length === 0 ? (
               <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-violet-200 bg-white text-center">
  <div className="rounded-full bg-violet-50 p-4 text-violet-600">
    <Receipt size={30} />
  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    No transactions found
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Try changing filters or create your first voucher entry.
                  </p>
                </div>
              ) : (
                <>
                <div className="hidden overflow-hidden rounded-[24px] border border-violet-100/80 bg-white shadow-[0_12px_28px_rgba(124,58,237,0.05)] lg:block">
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col className="w-[6%]" />
                          <col className="w-[15%]" />
                          <col className="w-[12%]" />
                          <col className="w-[24%]" />
                          <col className="w-[15%]" />
                          <col className="w-[16%]" />
                          <col className="w-[12%]" />
                        </colgroup>

                        <thead className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.07),rgba(124,58,237,0.05),rgba(236,72,153,0.04))]">
                          <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            <th className="px-4 py-4 font-semibold">
                              <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={toggleSelectAllVisible}
                               className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-violet-500"
                              />
                            </th>
                            <th className="px-4 py-4 font-semibold">Voucher</th>
                            <th className="px-4 py-4 font-semibold">Date</th>
                            <th className="px-4 py-4 font-semibold">
                              Party / Particulars
                            </th>
                            <th className="px-4 py-4 font-semibold">Type</th>
                            <th className="px-4 py-4 font-semibold">Amount</th>
                            <th className="px-4 py-4 text-right font-semibold">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {transactions.map((transaction, index) => (
  <tr
    key={transaction.id}
    className={`transition duration-300 hover:bg-violet-50/40 ${
      index !== 0 ? "border-t border-slate-100" : ""
    }`}
  >
                              <td className="px-4 py-4 align-top">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(transaction.id)}
                                  onChange={() => toggleSelectOne(transaction.id)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="max-w-full">
                                  <p className="truncate text-[15px] font-semibold text-slate-900">
                                    {transaction.voucherNo}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    Rows: {transaction.billRows.length}
                                  </p>
                                </div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <p className="text-sm font-medium text-slate-700">
                                  {formatDate(transaction.voucherDate)}
                                </p>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <div className="space-y-1">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {transaction.party?.name || "—"}
                                  </p>
                                  <p className="line-clamp-2 text-sm text-slate-500">
                                    {transaction.particulars}
                                  </p>
                                </div>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <p className="text-sm font-medium text-slate-700">
                                  {formatTypeLabel(transaction.type)}
                                </p>
                              </td>

                              <td className="px-4 py-4 align-top">
                                <p className="whitespace-nowrap text-sm font-bold text-slate-900">
                                  ₹ {formatCurrency(transaction.amount)}{" "}
                                  <span className="ml-1 text-xs font-semibold text-slate-500">
                                    {transaction.side}
                                  </span>
                                </p>
                              </td>

                              <td className="px-4 py-4 text-right align-top">
                               <RowActionMenu
  onView={() => setViewTransaction(transaction)}
  onEdit={() => setSelectedTransaction(transaction)}
  onEmail={() => setConfirmEmail(transaction)}
  onDelete={() => setDeleteTarget(transaction)}
  onOpenAttachment={() =>
    window.open(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/transactions/${transaction.id}/download`,
      "_blank"
    )
  }
/>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {tableLoading && (
                      <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                        Updating list...
                      </div>
                    )}
                  </div>

<div className="lg:hidden">
  <div className="overflow-hidden rounded-[22px] border border-violet-100/80 bg-white shadow-[0_10px_24px_rgba(124,58,237,0.05)]">
    <table className="w-full table-fixed">
      <colgroup>
        <col className="w-[20%]" />
        <col className="w-[40%]" />
        <col className="w-[30%]" />
        <col className="w-[14%]" />
      </colgroup>

      <thead className="border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.07),rgba(124,58,237,0.05),rgba(236,72,153,0.04))]">
        <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-slate-500">
          <th className="px-2 py-2.5 font-semibold">Date</th>
          <th className="px-2 py-2.5 font-semibold">Particulars</th>
          <th className="px-2 py-2.5 font-semibold text-right">Amount</th>
          <th className="px-2 py-2.5 text-center font-semibold">Action</th>
        </tr>
      </thead>

      <tbody>
        {transactions.map((transaction, index) => (
          <tr
            key={transaction.id}
            className={`${index !== 0 ? "border-t border-slate-100" : ""}`}
          >
            <td className="px-2 py-3 align-top">
              <p className="text-[11px] leading-4 text-slate-600">
                {formatDate(transaction.voucherDate)}
              </p>
            </td>

            <td className="px-2 py-3 align-top">
              <div className="min-w-0">
                <p className="line-clamp-3 text-[13px] font-semibold leading-5 text-slate-900">
                  {transaction.particulars || "—"}
                </p>

                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  V. No.: {transaction.voucherNo}
                </p>
              </div>
            </td>

            <td className="px-2 py-3 align-top text-right">
              <p
                className={`text-[13px] font-bold leading-5 ${
                  transaction.side === "DR"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {transaction.side === "DR" ? "+" : "-"} ₹
                {formatCurrency(transaction.amount)}
              </p>
            </td>

            <td className="px-2 py-3 align-top text-center">
              <div className="flex justify-center">
                <RowActionMenu
                  mobile
                  onView={() => setViewTransaction(transaction)}
                  onEdit={() => setSelectedTransaction(transaction)}
                  onEmail={() => setConfirmEmail(transaction)}
                  onDelete={() => setDeleteTarget(transaction)}
                  onOpenAttachment={() =>
                    window.open(
                      `${process.env.NEXT_PUBLIC_API_BASE_URL}/transactions/${transaction.id}/download`,
                      "_blank"
                    )
                  }
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {mounted && mobileFilterOpen && (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-900/30 px-4 py-5 backdrop-blur-[2px] lg:hidden">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] shadow-[0_24px_60px_rgba(124,58,237,0.14)]">
            <div className="flex items-center justify-between border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.06),rgba(236,72,153,0.05))] px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                  Transaction Filter
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  Apply Filter
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Search
                </label>
                <input
                  value={mobileSearchDraft}
                  onChange={(e) => setMobileSearchDraft(e.target.value)}
                  placeholder="Search by voucher no, particulars..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.12)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Type
                </label>
                <select
                  value={mobileTypeDraft}
                  onChange={(e) =>
                    setMobileTypeDraft(e.target.value as TransactionType | "all")
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.10)]"
                >
                  <option value="all">All Types</option>
                  <option value="SALES">Sales</option>
                  <option value="PURCHASE">Purchase</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="RECEIPT">Receipt</option>
                  <option value="DEBIT_NOTE">Debit Note</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                  <option value="JOURNAL_DR">Journal Dr.</option>
                  <option value="JOURNAL_CR">Journal Cr.</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Date Range
                </label>
                <select
                  value={mobileDatePresetDraft}
                  onChange={(e) =>
                    setMobileDatePresetDraft(e.target.value as DatePreset)
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(167,139,250,0.10)]"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisMonth">This Month</option>
                  <option value="currentFY">Current Financial Year</option>
                  <option value="previousFY">Previous FY</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {mobileDatePresetDraft === "custom" ? (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={mobileCustomFromDraft}
                    onChange={(e) => setMobileCustomFromDraft(e.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-violet-400"
                  />
                  <input
                    type="date"
                    value={mobileCustomToDraft}
                    onChange={(e) => setMobileCustomToDraft(e.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-violet-400"
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={applyMobileFilters}
                  className="h-11 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)]"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <TransactionFormModal
        open={createOpen}
        mode="create"
        users={users}
        onClose={() => setCreateOpen(false)}
        onSuccess={async (text) => {
          setCreateOpen(false);
          setMessage({
            type: "success",
            text,
          });
          await loadData(true);
        }}
      />

      <TransactionFormModal
        open={!!selectedTransaction}
        mode="edit"
        users={users}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onSuccess={async (text) => {
          setSelectedTransaction(null);
          setMessage({
            type: "success",
            text,
          });
          await loadData(true);
        }}
      />

      {viewTransaction && (
        <TransactionViewModal
  transaction={viewTransaction}
  onClose={() => setViewTransaction(null)}
  onEdit={() => {
    setSelectedTransaction(viewTransaction);
    setViewTransaction(null);
  }}
  onEmail={() => setConfirmEmail(viewTransaction)}
/>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <h3 className="text-xl font-bold text-slate-900">
              Delete Transaction
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget.voucherNo}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-rose-500 disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
            {confirmEmail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <h3 className="text-xl font-bold text-slate-900">Send Email</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to send email for{" "}
              <span className="font-semibold text-slate-900">
                {confirmEmail.voucherNo}
              </span>
              ?
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmEmail(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  const target = confirmEmail;
                  setConfirmEmail(null);
                  if (target) {
                    await handleSingleEmail(target);
                  }
                }}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-blue-500"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkEmail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <h3 className="text-xl font-bold text-slate-900">
              Send Bulk Emails
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to send email for{" "}
              <span className="font-semibold text-slate-900">
                {selectedIds.length}
              </span>{" "}
              selected transaction(s)?
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmBulkEmail(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setConfirmBulkEmail(false);
                  await handleBulkEmail();
                }}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-blue-500"
              >
                Send Emails
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBulkDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <h3 className="text-xl font-bold text-rose-600">
              Delete Selected Transactions
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {selectedIds.length}
              </span>{" "}
              selected transaction(s)? This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setConfirmBulkDelete(false);
                  await handleBulkDelete();
                }}
                className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-rose-500"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RowActionMenu({
  onView,
  onEdit,
  onEmail,
  onDelete,
  onOpenAttachment,
  mobile = false,
}: {
  onView: () => void;
  onEdit: () => void;
  onEmail: () => void;
  onDelete: () => void;
  onOpenAttachment: () => void;
  mobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 190,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current || mobile) return;

    function updatePosition() {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 190;
      const viewportPadding = 12;

      let left = rect.right - menuWidth;
      if (left < viewportPadding) left = viewportPadding;
      if (left + menuWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - menuWidth - viewportPadding;
      }

      let top = rect.bottom + 8;
      const estimatedHeight = 220;

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
  }, [open, mobile]);

  useEffect(() => {
    if (!open || !mobile) return;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [open, mobile]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <MoreHorizontal size={18} />
      </button>

      {mounted &&
        open &&
        !mobile &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 200,
            }}
            className="rounded-[20px] border border-violet-100/80 bg-white p-2 shadow-[0_18px_40px_rgba(124,58,237,0.12)]"
          >
            <ActionMenuButton
              icon={<FileText size={16} />}
              label="Download"
              onClick={() => {
                setOpen(false);
                onOpenAttachment();
              }}
            />
            <ActionMenuButton
              icon={<Eye size={16} />}
              label="View"
              onClick={() => {
                setOpen(false);
                onView();
              }}
            />
            <ActionMenuButton
              icon={<PencilLine size={16} />}
              label="Edit"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            />
            <ActionMenuButton
              icon={<Mail size={16} />}
              label="Email"
              onClick={() => {
                setOpen(false);
                onEmail();
              }}
            />
            <ActionMenuButton
              icon={<Trash2 size={16} />}
              label="Delete"
              danger
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            />
          </div>,
          document.body,
        )}

      {mounted &&
        open &&
        mobile &&
        createPortal(
          <div className="fixed inset-0 z-[210] flex items-end bg-slate-900/30 px-3 py-3 backdrop-blur-[2px]">
            <div
              ref={menuRef}
              className="w-full rounded-[28px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] p-3 shadow-[0_24px_60px_rgba(124,58,237,0.16)]"
            >
              <div className="mb-2 flex justify-center">
                <div className="h-1.5 w-12 rounded-full bg-slate-200" />
              </div>

              <ActionMenuButton
                icon={<FileText size={16} />}
                label="Download"
                onClick={() => {
                  setOpen(false);
                  onOpenAttachment();
                }}
              />
              <ActionMenuButton
                icon={<Eye size={16} />}
                label="View"
                onClick={() => {
                  setOpen(false);
                  onView();
                }}
              />
              <ActionMenuButton
                icon={<PencilLine size={16} />}
                label="Edit"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              />
              <ActionMenuButton
                icon={<Mail size={16} />}
                label="Email"
                onClick={() => {
                  setOpen(false);
                  onEmail();
                }}
              />
              <ActionMenuButton
                icon={<Trash2 size={16} />}
                label="Delete"
                danger
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              />

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 flex w-full items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
function ActionMenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function TransactionViewModal({
  transaction,
  onClose,
  onEdit,
  onEmail,
}: {
  transaction: TransactionRecord;
  onClose: () => void;
  onEdit: () => void;
  onEmail: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Eye size={14} />
              Transaction Details
            </div>
            <h3 className="mt-2 text-xl font-bold text-slate-900">
              {transaction.voucherNo}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-80px)] overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ViewCard label="Voucher No." value={transaction.voucherNo} />
            <ViewCard
              label="Voucher Date"
              value={formatDate(transaction.voucherDate)}
            />
            <ViewCard
              label="Type"
              value={formatTypeLabel(transaction.type)}
            />
            <ViewCard
              label="Amount"
              value={`₹ ${formatCurrency(transaction.amount)} ${transaction.side}`}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Party</p>
              <p className="mt-2 text-sm text-slate-700">
                {transaction.party?.name || "—"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {transaction.party?.email || "—"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {transaction.party?.phone || "—"}
              </p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                Particulars
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {transaction.particulars || "—"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Bill Rows</p>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {transaction.billRows.length} rows
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    <th className="rounded-l-2xl px-4 py-3 font-semibold">
                      Type
                    </th>
                    <th className="px-4 py-3 font-semibold">Side</th>
                    <th className="px-4 py-3 font-semibold">Ref No.</th>
                    <th className="px-4 py-3 font-semibold">Against Ref</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="rounded-r-2xl px-4 py-3 font-semibold">
                      Against Voucher
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.billRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.allocationType
                          .toLowerCase()
                          .split("_")
                          .map(
                            (part) =>
                              part.charAt(0).toUpperCase() + part.slice(1),
                          )
                          .join(" ")}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.side}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.refNo || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.againstBillRow?.refNo || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        ₹ {formatCurrency(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.againstBillRow?.transaction?.voucherNo || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onEmail}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Email
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Edit Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}