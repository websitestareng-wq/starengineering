"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Paperclip,
  Plus,
  Receipt,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type { PortalUser } from "@/types/user";
import {
  createTransaction,
  getOpenRefs,
  parseTransactionDocument,
  updateTransaction,
  type BillAllocationType,
  type CreateTransactionPayload,
  type EntrySide,
  type OpenRefRecord,
  type TransactionRecord,
  type TransactionType,
  type UpdateTransactionPayload,
} from "@/lib/api/transactions-api";
import BillwiseAllocationTable, {
  type BillwiseRowForm,
} from "./BillwiseAllocationTable";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  users: PortalUser[];
  transaction?: TransactionRecord | null;
  onClose: () => void;
  onSuccess: (message: string) => void | Promise<void>;
};

type FormState = {
  voucherNo: string;
  voucherDate: string;
  type: TransactionType;
  side: EntrySide;
  amount: string;
  particulars: string;
  sendEmail: boolean;
  partyId: string;
  billRows: BillwiseRowForm[];
};

type ActionMessage =
  | {
      type: "success" | "error" | "info";
      text: string;
    }
  | null;

const transactionOptions: Array<{
  value: TransactionType;
  label: string;
  side: EntrySide;
}> = [
  { value: "SALES", label: "Sales", side: "DR" },
  { value: "PURCHASE", label: "Purchase", side: "CR" },
  { value: "PAYMENT", label: "Payment", side: "DR" },
  { value: "RECEIPT", label: "Receipt", side: "CR" },
  { value: "DEBIT_NOTE", label: "Debit Note", side: "DR" },
  { value: "CREDIT_NOTE", label: "Credit Note", side: "CR" },
  { value: "JOURNAL_DR", label: "Journal Dr.", side: "DR" },
  { value: "JOURNAL_CR", label: "Journal Cr.", side: "CR" },
];

function getDefaultSide(type: TransactionType): EntrySide {
  return transactionOptions.find((item) => item.value === type)?.side || "DR";
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeDecimal(value: string) {
  let next = value.replace(/[^\d.]/g, "");
  const firstDot = next.indexOf(".");
  if (firstDot !== -1) {
    next =
      next.slice(0, firstDot + 1) +
      next.slice(firstDot + 1).replace(/\./g, "");
  }
  return next;
}

function makeRow(
  allocationType: BillAllocationType = "NEW_REF",
  side: EntrySide = "DR",
  extra?: Partial<BillwiseRowForm>,
): BillwiseRowForm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    allocationType,
    side,
    refNo: "",
    againstBillRowId: "",
    amount: "",
    ...extra,
  };
}

function formatCurrency(value?: string | number | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatFileSize(size?: number | null) {
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeName(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(m\/s|mrs|mr|ms|shri|smt)\.?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeName(value: string) {
  return normalizeName(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

function findPartyIdByName(users: PortalUser[], partyName: string) {
  const target = normalizeName(partyName);
  if (!target) return "";

  const exact = users.find((user) => normalizeName(user.name) === target);
  if (exact) return exact.id;

  const fuzzy = users.find((user) => {
    const current = normalizeName(user.name);
    return current && (target.includes(current) || current.includes(target));
  });
  if (fuzzy) return fuzzy.id;

  const targetTokens = tokenizeName(target);

  const scored = users
    .map((user) => {
      const current = normalizeName(user.name);
      const currentTokens = tokenizeName(current);

      const common = targetTokens.filter((token) =>
        currentTokens.includes(token),
      ).length;

      return {
        id: user.id,
        score: common,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score >= 2 ? scored[0].id : "";
}

function buildInitialForm(transaction?: TransactionRecord | null): FormState {
  if (!transaction) {
    return {
      voucherNo: "",
      voucherDate: getToday(),
      type: "SALES",
      side: "DR",
      amount: "",
      particulars: "",
      sendEmail: false,
      partyId: "",
      billRows: [makeRow("NEW_REF", "DR")],
    };
  }

  return {
    voucherNo: transaction.voucherNo,
    voucherDate: transaction.voucherDate.slice(0, 10),
    type: transaction.type,
    side: transaction.side,
    amount: String(transaction.amount ?? ""),
    particulars: transaction.particulars,
    sendEmail: transaction.sendEmail,
    partyId: transaction.partyId,
   billRows:
  transaction.billRows.length > 0
    ? transaction.billRows.map((row) =>
        makeRow(row.allocationType, row.side, {
          refNo: row.refNo || "",
          againstBillRowId: row.againstBillRowId || "",
          amount: String(row.amount ?? ""),
        }),
      )
    : [makeRow("NEW_REF", transaction.side)],
  };
}

export default function TransactionFormModal({
  open,
  mode,
  users,
  transaction,
  onClose,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<FormState>(buildInitialForm(transaction));
  const [openRefs, setOpenRefs] = useState<OpenRefRecord[]>([]);
  const [loadingOpenRefs, setLoadingOpenRefs] = useState(false);
  const [message, setMessage] = useState<ActionMessage>(null);
  const [saving, setSaving] = useState(false);
const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [attachmentPanelOpen, setAttachmentPanelOpen] = useState(false);
  const [parsingMainPdf, setParsingMainPdf] = useState(false);

  const [mainPdfFile, setMainPdfFile] = useState<File | null>(null);
const [extraAttachments, setExtraAttachments] = useState<File[]>([]);
const [removeExistingAttachmentIds, setRemoveExistingAttachmentIds] = useState<string[]>([]);
  const [particularSuggestions, setParticularSuggestions] = useState<string[]>([]);
  const mainPdfInputRef = useRef<HTMLInputElement | null>(null);
  const extraAttachmentsInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentPanelRef = useRef<HTMLDivElement | null>(null);
  const narrationMemory = useRef<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(transaction));
    setMessage(null);
    setMainPdfFile(null);
setExtraAttachments([]);
setRemoveExistingAttachmentIds([]);
setAttachmentPanelOpen(false);
setParsingMainPdf(false);
  }, [open, transaction]);
  useEffect(() => {
  if (!open) return;

  try {
    const raw = localStorage.getItem("star-transaction-particulars");
    const parsed = raw ? JSON.parse(raw) : [];
    setParticularSuggestions(Array.isArray(parsed) ? parsed : []);
  } catch {
    setParticularSuggestions([]);
  }
}, [open]);

  useEffect(() => {
    if (!attachmentPanelOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        attachmentPanelRef.current &&
        !attachmentPanelRef.current.contains(event.target as Node)
      ) {
        setAttachmentPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [attachmentPanelOpen]);

  useEffect(() => {
    if (!open) return;

    if (!form.partyId || !form.voucherDate) {
      setOpenRefs([]);
      return;
    }

    const hasAgainstRef = form.billRows.some(
      (row) => row.allocationType === "AGAINST_REF",
    );

    if (!hasAgainstRef) {
      setOpenRefs([]);
      return;
    }

    let cancelled = false;

async function loadRefs() {
  try {
    setLoadingOpenRefs(true);

    const data = await getOpenRefs(form.partyId, form.voucherDate);
    const refs: OpenRefRecord[] = [...(data || [])];

    form.billRows.forEach((row) => {
      if (
        row.allocationType === "AGAINST_REF" &&
        row.againstBillRowId &&
        !refs.some((ref) => ref.id === row.againstBillRowId)
      ) {
        refs.push({
          id: row.againstBillRowId,
          refNo: row.refNo || "Previously selected ref",
          voucherNo: row.refNo || "Previously selected ref",
          transactionType: "SALES",
          pendingAmount: Number(row.amount || 0),
          side: row.side,
        } as OpenRefRecord);
      }
    });

    if (!cancelled) {
      setOpenRefs(refs);
    }
  } catch (error) {
    if (!cancelled) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load open references.",
      });
    }
  } finally {
    if (!cancelled) {
      setLoadingOpenRefs(false);
    }
  }
}

    loadRefs();

    return () => {
      cancelled = true;
    };
  }, [open, form.partyId, form.voucherDate, form.billRows]);

  const selectedParty = useMemo(
    () => users.find((user) => user.id === form.partyId) || null,
    [users, form.partyId],
  );

  const totals = useMemo(() => {
    const drTotal = form.billRows
      .filter((row) => row.side === "DR")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const crTotal = form.billRows
      .filter((row) => row.side === "CR")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const voucherAmount = Number(form.amount || 0);

    const balance =
      form.side === "DR"
        ? Number((drTotal - crTotal - voucherAmount).toFixed(2))
        : Number((crTotal - drTotal - voucherAmount).toFixed(2));

    return {
      drTotal,
      crTotal,
      voucherAmount,
      balance,
    };
  }, [form.billRows, form.amount, form.side]);

  const existingAttachments = useMemo(() => {
  return (transaction?.attachments || []).filter(
    (item) => !removeExistingAttachmentIds.includes(item.id),
  );
}, [transaction, removeExistingAttachmentIds]);

  function setType(nextType: TransactionType) {
    const nextSide = getDefaultSide(nextType);
    setForm((prev) => ({
      ...prev,
      type: nextType,
      side: nextSide,
      billRows: prev.billRows.map((row) => ({
        ...row,
        side:
          row.allocationType === "NEW_REF" ||
          row.allocationType === "ADVANCE" ||
          row.allocationType === "ON_ACCOUNT"
            ? nextSide
            : row.side,
      })),
    }));
  }

  function updateRow(rowId: string, patch: Partial<BillwiseRowForm>) {
    setForm((prev) => ({
      ...prev,
      billRows: prev.billRows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    }));
  }

  function addRow() {
    setForm((prev) => ({
      ...prev,
      billRows: [...prev.billRows, makeRow("NEW_REF", prev.side)],
    }));
  }

  function removeRow(rowId: string) {
    setForm((prev) => ({
      ...prev,
      billRows:
        prev.billRows.length === 1
          ? prev.billRows
          : prev.billRows.filter((row) => row.id !== rowId),
    }));
  }

  async function handleSelectMainPdf(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setMessage({
        type: "error",
        text: "Main PDF must be a PDF file.",
      });
      return;
    }

    setMainPdfFile(file);
    setAttachmentPanelOpen(true);
    setParsingMainPdf(true);
    setMessage({
      type: "info",
      text: "PDF selected. Parsing document...",
    });

    try {
      const parsed = await parseTransactionDocument(file);
      const data = parsed?.data;

      if (!data) {
        setMessage({
          type: "error",
          text: "PDF parsed, but no document data was returned.",
        });
        return;
      }

      const detectedType = data.detectedType || form.type || "SALES";
      const detectedSide = data.detectedSide || getDefaultSide(detectedType);
      let matchedPartyId =
  data.matchedParty?.id || findPartyIdByName(users, data.partyName);

if (!matchedPartyId && data.partyName) {
  const lower = data.partyName.toLowerCase();
  const fuzzy = users.find(
    (user) =>
      user.name.toLowerCase().includes(lower) ||
      lower.includes(user.name.toLowerCase()),
  );
  matchedPartyId = fuzzy?.id || "";
}

      setForm((prev) => {
        const nextVoucherNo = data.voucherNo?.trim() || prev.voucherNo;
        const nextAmount =
          data.amount !== null && data.amount !== undefined
            ? String(data.amount)
            : prev.amount;

        return {
          ...prev,
          type: detectedType,
          side: detectedSide,
          voucherNo: nextVoucherNo,
          voucherDate: data.voucherDate || prev.voucherDate,
          amount: nextAmount,
          particulars: prev.particulars,
          partyId: matchedPartyId || prev.partyId,
          billRows:
            prev.billRows.length === 1 &&
            prev.billRows[0].allocationType === "NEW_REF" &&
            !prev.billRows[0].againstBillRowId
              ? [
                  {
                    ...prev.billRows[0],
                    side: detectedSide,
                    refNo: nextVoucherNo || prev.billRows[0].refNo,
                    amount: nextAmount || prev.billRows[0].amount,
                  },
                ]
              : prev.billRows.map((row) => ({
                  ...row,
                  side:
                    row.allocationType === "NEW_REF" ||
                    row.allocationType === "ADVANCE" ||
                    row.allocationType === "ON_ACCOUNT"
                      ? detectedSide
                      : row.side,
                  refNo:
                    (row.allocationType === "NEW_REF" ||
                      row.allocationType === "ADVANCE") &&
                    !row.refNo.trim()
                      ? nextVoucherNo
                      : row.refNo,
                })),
        };
      });

      setMessage({
        type: "success",
        text: matchedPartyId
          ? "PDF parsed successfully and form updated."
          : data.partyName
            ? `PDF parsed successfully. Party "${data.partyName}" was not matched automatically.`
            : "PDF parsed successfully and form updated.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to parse the selected PDF.",
      });
    } finally {
      setParsingMainPdf(false);
    }
  }

  function handleSelectExtraAttachments(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setExtraAttachments((prev) => {
      const seen = new Set(
        prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );
      const next = [...prev];

      for (const file of files) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push(file);
        }
      }

      return next;
    });

    setMessage(null);
    setAttachmentPanelOpen(true);
  }

  function removeExtraAttachment(index: number) {
    setExtraAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function removeMainPdf() {
  setMainPdfFile(null);
  setMessage(null);
}

function removeExistingAttachment(id: string) {
  setRemoveExistingAttachmentIds((prev) =>
    prev.includes(id) ? prev : [...prev, id],
  );
}
function rememberParticular(value: string) {
  const clean = String(value || "").trim();
  if (!clean) return;

  try {
    const raw = localStorage.getItem("star-transaction-particulars");
    const parsed = raw ? JSON.parse(raw) : [];
    const next = Array.from(
      new Set([clean, ...(Array.isArray(parsed) ? parsed : [])]),
    ).slice(0, 50);

    localStorage.setItem("star-transaction-particulars", JSON.stringify(next));
    setParticularSuggestions(next);
  } catch {
    // ignore local storage errors
  }
}
  async function handleSubmit() {
    setMessage(null);

    if (!form.partyId) {
      setMessage({ type: "error", text: "Party is required." });
      return;
    }

    if (!form.voucherNo.trim()) {
      setMessage({ type: "error", text: "Voucher no. is required." });
      return;
    }

    if (!form.voucherDate) {
      setMessage({ type: "error", text: "Voucher date is required." });
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than 0." });
      return;
    }

    if (!form.particulars.trim()) {
      setMessage({ type: "error", text: "Particulars are required." });
      return;
    }

    if (form.billRows.length === 0) {
      setMessage({ type: "error", text: "At least one bill row is required." });
      return;
    }

   const cleanedRows = form.billRows
  .map((row) => ({
    allocationType: row.allocationType,
    side: row.side,
    refNo: row.refNo || "",
    againstBillRowId: row.againstBillRowId || "",
    amount: Number(
      String(row.amount ?? "0")
        .replace(/,/g, "")
        .trim(),
    ),
  }))
  .filter((row) => row.amount > 0);

if (cleanedRows.length === 0) {
  setMessage({
    type: "error",
    text: "At least one bill row with amount greater than 0 is required.",
  });
  return;
}

for (let i = 0; i < cleanedRows.length; i++) {
  const row = cleanedRows[i];

      if (
        (row.allocationType === "NEW_REF" || row.allocationType === "ADVANCE") &&
        !row.refNo.trim()
      ) {
        setMessage({
          type: "error",
          text: `Bill row ${i + 1} reference no. is required.`,
        });
        return;
      }

      if (
        row.allocationType === "AGAINST_REF" &&
        !row.againstBillRowId.trim()
      ) {
        setMessage({
          type: "error",
          text: `Bill row ${i + 1} must select an open reference.`,
        });
        return;
      }
    }

    if (totals.balance !== 0) {
      setMessage({
        type: "error",
        text:
          form.side === "DR"
            ? "Bill rows mismatch. Net DR must equal voucher amount."
            : "Bill rows mismatch. Net CR must equal voucher amount.",
      });
      return;
    }

    const payload: CreateTransactionPayload = {
      voucherNo: form.voucherNo.trim(),
      voucherDate: form.voucherDate,
      type: form.type,
      side: form.side,
      amount: Number(form.amount),
      particulars: form.particulars.trim(),
      sendEmail: !!form.sendEmail,
      partyId: form.partyId,
      billRows: cleanedRows,
    };

    try {
      setSaving(true);

      if (mode === "create") {
        await createTransaction(payload, {
  mainDocument: mainPdfFile,
  attachments: extraAttachments,
});
rememberParticular(form.particulars);
await onSuccess("Transaction created successfully.");
        return;
      }

      if (!transaction?.id) {
        setMessage({
          type: "error",
          text: "Transaction not found for update.",
        });
        return;
      }

      const updatePayload: UpdateTransactionPayload = {
        ...payload,
      };

      await updateTransaction(transaction.id, updatePayload, {
  mainDocument: mainPdfFile,
  attachments: extraAttachments,
  removeAttachmentIds: removeExistingAttachmentIds,
});
rememberParticular(form.particulars);
await onSuccess("Transaction updated successfully.");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to save transaction.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/25 px-2 py-3 backdrop-blur-[1px]">
     <div className="max-h-[94vh] w-full max-w-[1020px] overflow-hidden rounded-[28px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(250,245,255,0.98))] shadow-[0_26px_70px_rgba(124,58,237,0.16)]">
        <div className="flex items-center justify-between border-b border-violet-100 bg-[linear-gradient(135deg,rgba(168,85,247,0.08),rgba(124,58,237,0.06),rgba(236,72,153,0.05))] px-4 py-3">
          <div>
            <h2 className="text-[18px] font-bold text-slate-900">
              {mode === "create"
                ? "New Transaction"
                : `Edit ${transaction?.voucherNo || "Transaction"}`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
           className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="max-h-[calc(94vh-72px)] overflow-y-auto px-4 py-4">
          {message && (
            <div
              className={`mb-3 rounded-2xl border px-3 py-2.5 text-sm font-medium ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                 : message.type === "info"
  ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="rounded-[18px] border border-violet-100/80 bg-white/95">
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 p-3 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Transaction Type">
                <select
                  value={form.type}
                  onChange={(e) => setType(e.target.value as TransactionType)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400"
                >
                  {transactionOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Party Name">
                <select
                  value={form.partyId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      partyId: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-400"
                >
                  <option value="">Select party</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Date of Transaction">
                <input
                  type="date"
                  value={form.voucherDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      voucherDate: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-400"
                />
              </Field>

              <Field label="Voucher No. / Invoice No.">
                <input
                  value={form.voucherNo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      voucherNo: e.target.value,
                    }))
                  }
                  placeholder="Optional (but recommended)"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400"
                />
              </Field>

              <Field label="Total Amount">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      amount: sanitizeDecimal(e.target.value),
                    }))
                  }
                  placeholder="e.g. 5000"
                  className="hide-number-arrows h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400"
                />
              </Field>

              <Field label="Dr / Cr (Auto)">
                <div
                  className={`inline-flex h-10 w-full items-center rounded-xl border px-3 text-sm font-semibold ${
form.side === "DR"
  ? "border-violet-200 bg-violet-50 text-violet-700"
  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {form.side}
                </div>
              </Field>

              <div className="md:col-span-2 xl:col-span-3">
                <Field label="Narration / Particulars">
                  <input
  value={form.particulars}
  onChange={(e) =>
    setForm((prev) => ({
      ...prev,
      particulars: e.target.value,
    }))
  }
  onBlur={(e) => rememberParticular(e.target.value)}
  list="transaction-particular-suggestions"
  placeholder="e.g. Against refund issued for excess payment"
  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400"
/>
<datalist id="transaction-particular-suggestions">
  {particularSuggestions.map((item) => (
    <option key={item} value={item} />
  ))}
</datalist>
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-violet-100/80 bg-white/95 p-3">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={15} className="text-slate-500" />
                <h3 className="text-[15px] font-bold text-slate-900">
                  Bill-wise Details
                </h3>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={15} />
                Add Row
              </button>
            </div>

            <BillwiseAllocationTable
              rows={form.billRows}
              openRefs={openRefs}
              loadingOpenRefs={loadingOpenRefs}
              voucherSide={form.side}
              voucherNo={form.voucherNo}
              voucherAmount={form.amount}
              onChangeRow={updateRow}
              onRemoveRow={removeRow}
            />

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <SummaryCard
                label="Voucher"
                value={`₹${formatCurrency(totals.voucherAmount)}`}
              />
              <SummaryCard
                label="DR Total"
                value={`₹${formatCurrency(totals.drTotal)}`}
              />
              <SummaryCard
                label="CR Total"
                value={`₹${formatCurrency(totals.crTotal)}`}
              />
              <SummaryCard
                label="Status"
                value={totals.balance === 0 ? "Matched" : "Mismatch"}
                danger={totals.balance !== 0}
              />
            </div>
          </div>

          {!!selectedParty && (
            <div className="mt-3 rounded-[18px] border border-violet-100/80 bg-white/95 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Selected Party
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedParty.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedParty.email || "—"}
                {selectedParty.phone ? ` • ${selectedParty.phone}` : ""}
              </p>
            </div>
          )}

         {mode === "edit" ? (
  <div className="mt-3 rounded-[18px] border border-violet-100/80 bg-white/95 p-3">
    <p className="text-sm font-semibold text-slate-900">
      Existing Attachments
    </p>

    {existingAttachments.length > 0 ? (
      <div className="mt-2 flex flex-wrap gap-2">
        {existingAttachments.map((item) => (
          <div
            key={item.id}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate hover:underline"
            >
              {item.fileName}
            </a>

            <span className="text-slate-400">
              {item.sizeInBytes
                ? formatFileSize(item.sizeInBytes)
                : item.mimeType || "file"}
            </span>

            <button
              type="button"
              onClick={() => removeExistingAttachment(item.id)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              title="Remove attachment"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
        No existing attachments
      </div>
    )}
  </div>
) : null}

          <div className="mt-3 rounded-[18px] border border-violet-100/80 bg-white/95 p-3">
  <div className="text-xs leading-5 text-slate-500">
    Main PDF can be parsed automatically from the footer paperclip.
    Extra attachments will go with the transaction save flow.
  </div>

  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative shrink-0" ref={attachmentPanelRef}>
        <button
          type="button"
          onClick={() => setAttachmentPanelOpen((prev) => !prev)}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
            mainPdfFile || extraAttachments.length > 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
          title="Attachments"
        >
          {parsingMainPdf ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Paperclip size={16} />
          )}
        </button>

        {attachmentPanelOpen && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[360px] rounded-[24px] border border-violet-100/80 bg-white p-3 shadow-[0_20px_45px_rgba(124,58,237,0.16)]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  Attachments
                </p>
                <button
                  type="button"
                  onClick={() => setAttachmentPanelOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mainPdfInputRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {parsingMainPdf ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Paperclip size={14} />
                      Main PDF
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => extraAttachmentsInputRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Plus size={14} />
                  Extra Files
                </button>
              </div>

              <input
                ref={mainPdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  void handleSelectMainPdf(e.target.files);
                  e.currentTarget.value = "";
                }}
                className="hidden"
              />

              <input
                ref={extraAttachmentsInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  handleSelectExtraAttachments(e.target.files);
                  e.currentTarget.value = "";
                }}
                className="hidden"
              />

              <div className="mt-3 space-y-2">
                {mainPdfFile ? (
                  <div className="flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-emerald-800">
                        {mainPdfFile.name}
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        Main PDF • {formatFileSize(mainPdfFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeMainPdf}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : null}

                {extraAttachments.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {file.name}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Extra attachment • {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExtraAttachment(index)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {!mainPdfFile && extraAttachments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    No files selected yet
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

     <label className="inline-flex h-10 min-w-[170px] shrink-0 items-center gap-2 rounded-xl border border-violet-100 bg-white px-3 shadow-sm">
        <span
          className={`relative inline-flex h-5 w-10 shrink-0 rounded-full transition ${
            form.sendEmail ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <input
            type="checkbox"
            checked={form.sendEmail}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                sendEmail: e.target.checked,
              }))
            }
            className="sr-only"
          />
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
              form.sendEmail ? "left-[20px]" : "left-[2px]"
            }`}
          />
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-slate-700">
          {form.sendEmail ? "Email On" : "Email Off"}
        </span>
      </label>
    </div>

    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Close
      </button>

      <button
        type="button"
        onClick={() => setConfirmSubmit(true)}
        disabled={saving || parsingMainPdf}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving
          ? mode === "create"
            ? "Saving..."
            : "Updating..."
          : mode === "create"
            ? "Save Transaction"
            : "Save Changes"}
      </button>
    </div>
  </div>
</div>
        </div>
            </div>

      {confirmSubmit && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
            <h3 className="text-xl font-bold text-slate-900">
              {mode === "create"
                ? "Create Transaction"
                : "Update Transaction"}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {mode === "create"
                ? "Are you sure you want to create this transaction?"
                : "Are you sure you want to update this transaction?"}
            </p>

            {form.sendEmail && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Email is enabled. Attachments will also be sent.
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setConfirmSubmit(false);
                  await handleSubmit();
                }}
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                {mode === "create" ? "Create" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        danger ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p
        className={`mt-0.5 text-sm font-bold ${
          danger ? "text-rose-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}