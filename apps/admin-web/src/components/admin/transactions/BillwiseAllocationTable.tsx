"use client";

import { useEffect, useMemo, useRef } from "react";
import type {
  BillAllocationType,
  EntrySide,
  OpenRefRecord,
} from "@/lib/api/transactions-api";
import { Trash2 } from "lucide-react";

export type BillwiseRowForm = {
  id: string;
  allocationType: BillAllocationType;
  side: EntrySide;
  refNo: string;
  againstBillRowId: string;
  amount: string;
};

type Props = {
  rows: BillwiseRowForm[];
  openRefs: OpenRefRecord[];
  loadingOpenRefs?: boolean;
  voucherSide: EntrySide;
  voucherNo: string;
  voucherAmount: string;
  onChangeRow: (rowId: string, patch: Partial<BillwiseRowForm>) => void;
  onRemoveRow: (rowId: string) => void;
};

const allocationOptions: Array<{
  value: BillAllocationType;
  label: string;
}> = [
  { value: "NEW_REF", label: "New Ref" },
  { value: "AGAINST_REF", label: "Against Ref" },
  { value: "ADVANCE", label: "Advance" },
  { value: "ON_ACCOUNT", label: "On Account" },
];

function sanitizeDecimal(value: string) {
  let next = value.replace(/[^\d.,]/g, "").replace(/,/g, "");
  const firstDot = next.indexOf(".");

  if (firstDot !== -1) {
    next =
      next.slice(0, firstDot + 1) +
      next.slice(firstDot + 1).replace(/\./g, "");
  }

  return next;
}

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined) return 0;

  const cleaned = String(value)
    .replace(/,/g, "")
    .trim();

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function formatCurrency(value?: string | number | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTransactionType(value: string) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stopWheelChange(e: React.WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
  e.preventDefault();
}

function isEligibleAutoAllocation(type: BillAllocationType) {
  return type === "NEW_REF" || type === "ADVANCE";
}

function getOppositeSide(side: EntrySide): EntrySide {
  return side === "DR" ? "CR" : "DR";
}

function getRowSignedAmount(row: BillwiseRowForm) {
  const amount = toNumber(row.amount);
  return row.side === "DR" ? amount : -amount;
}

export default function BillwiseAllocationTable({
  rows,
  openRefs,
  loadingOpenRefs = false,
  voucherSide,
  voucherNo,
  voucherAmount,
  onChangeRow,
  onRemoveRow,
}: Props) {
  const safeVoucherNo = voucherNo.trim();
  const voucherAmountNumber = useMemo(
    () => toNumber(voucherAmount),
    [voucherAmount],
  );

  const manualAmountRef = useRef<Record<string, boolean>>({});
  const manualRefNoRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const validIds = new Set(rows.map((row) => row.id));

    Object.keys(manualAmountRef.current).forEach((id) => {
      if (!validIds.has(id)) delete manualAmountRef.current[id];
    });

    Object.keys(manualRefNoRef.current).forEach((id) => {
      if (!validIds.has(id)) delete manualRefNoRef.current[id];
    });
  }, [rows]);

  useEffect(() => {
    const eligibleRows = rows.filter((row) =>
      isEligibleAutoAllocation(row.allocationType),
    );

    if (eligibleRows.length === 0) return;

    for (const row of eligibleRows) {
      if (!manualRefNoRef.current[row.id] && safeVoucherNo && !row.refNo.trim()) {
        onChangeRow(row.id, {
          refNo: safeVoucherNo,
          side: voucherSide,
        });
      }
    }

    if (voucherAmountNumber <= 0) return;

    const untouchedEligibleRows = eligibleRows.filter(
      (row) => !manualAmountRef.current[row.id],
    );

    if (untouchedEligibleRows.length === 0) return;

    if (eligibleRows.length === 1) {
      const onlyRow = eligibleRows[0];
      const otherNet = rows
        .filter((row) => row.id !== onlyRow.id)
        .reduce((sum, row) => sum + getRowSignedAmount(row), 0);

      const desiredNet =
        voucherSide === "DR" ? voucherAmountNumber : -voucherAmountNumber;
      const neededSigned = Number((desiredNet - otherNet).toFixed(2));
      const nextAmount =
        Math.abs(neededSigned) > 0 ? Math.abs(neededSigned).toFixed(2) : "";

      if (
        !manualAmountRef.current[onlyRow.id] &&
        (onlyRow.amount !== nextAmount || onlyRow.side !== voucherSide)
      ) {
        onChangeRow(onlyRow.id, {
          amount: nextAmount,
          side: voucherSide,
        });
      }

      return;
    }

    if (untouchedEligibleRows.length === 1) {
      const target = untouchedEligibleRows[0];
      const otherNet = rows
        .filter((row) => row.id !== target.id)
        .reduce((sum, row) => sum + getRowSignedAmount(row), 0);

      const desiredNet =
        voucherSide === "DR" ? voucherAmountNumber : -voucherAmountNumber;
      const neededSigned = Number((desiredNet - otherNet).toFixed(2));
      const nextAmount =
        Math.abs(neededSigned) > 0 ? Math.abs(neededSigned).toFixed(2) : "";

      if (target.amount !== nextAmount || target.side !== voucherSide) {
        onChangeRow(target.id, {
          amount: nextAmount,
          side: voucherSide,
        });
      }

      return;
    }

    const emptyUntouchedRows = untouchedEligibleRows.filter(
      (row) => !row.amount.trim(),
    );

    if (emptyUntouchedRows.length === 1) {
      const target = emptyUntouchedRows[0];
      const otherNet = rows
        .filter((row) => row.id !== target.id)
        .reduce((sum, row) => sum + getRowSignedAmount(row), 0);

      const desiredNet =
        voucherSide === "DR" ? voucherAmountNumber : -voucherAmountNumber;
      const neededSigned = Number((desiredNet - otherNet).toFixed(2));
      const nextAmount =
        Math.abs(neededSigned) > 0 ? Math.abs(neededSigned).toFixed(2) : "";

      if (target.amount !== nextAmount || target.side !== voucherSide) {
        onChangeRow(target.id, {
          amount: nextAmount,
          side: voucherSide,
        });
      }
    }
  }, [rows, safeVoucherNo, voucherAmountNumber, voucherSide, onChangeRow]);

  const totals = useMemo(() => {
    const drTotal = rows
      .filter((row) => row.side === "DR")
      .reduce((sum, row) => sum + toNumber(row.amount), 0);

    const crTotal = rows
      .filter((row) => row.side === "CR")
      .reduce((sum, row) => sum + toNumber(row.amount), 0);

    const voucherAmountValue = toNumber(voucherAmount);
    const net = voucherSide === "DR" ? drTotal - crTotal : crTotal - drTotal;
    const remaining = Number((voucherAmountValue - net).toFixed(2));
    const matched = Number(remaining.toFixed(2)) === 0;

    return {
      drTotal,
      crTotal,
      voucherAmountValue,
      remaining,
      matched,
      net,
    };
  }, [rows, voucherAmount, voucherSide]);

  function handleAllocationTypeChange(
    row: BillwiseRowForm,
    nextType: BillAllocationType,
  ) {
    const patch: Partial<BillwiseRowForm> = {
      allocationType: nextType,
    };

    if (isEligibleAutoAllocation(nextType)) {
      patch.side = voucherSide;
      patch.refNo =
        manualRefNoRef.current[row.id] && row.refNo.trim()
          ? row.refNo
          : safeVoucherNo;
      patch.againstBillRowId = "";
    } else if (nextType === "AGAINST_REF") {
      patch.refNo = "";
      patch.againstBillRowId = row.againstBillRowId || "";
      patch.side = row.side || getOppositeSide(voucherSide);
    } else {
      patch.refNo = "";
      patch.againstBillRowId = "";
      patch.side = voucherSide;
    }

    onChangeRow(row.id, patch);
  }

  function handleReferenceInputChange(rowId: string, value: string) {
    manualRefNoRef.current[rowId] = true;
    onChangeRow(rowId, { refNo: value });
  }

  function handleAmountInputChange(rowId: string, value: string) {
    manualAmountRef.current[rowId] = true;
    onChangeRow(rowId, { amount: sanitizeDecimal(value) });
  }

  function handleAgainstRefChange(row: BillwiseRowForm, nextId: string) {
    const selectedRef = openRefs.find((ref) => ref.id === nextId) || null;

    if (!selectedRef) {
      onChangeRow(row.id, {
        againstBillRowId: "",
        amount: "",
      });
      return;
    }

    const nextSide = getOppositeSide(selectedRef.side as EntrySide);
    const otherNet = rows
      .filter((item) => item.id !== row.id)
      .reduce((sum, item) => sum + getRowSignedAmount(item), 0);

    const desiredNet =
      voucherSide === "DR" ? voucherAmountNumber : -voucherAmountNumber;
    const neededSigned = Number((desiredNet - otherNet).toFixed(2));

    let neededForThisRow = 0;

    if (nextSide === "DR") {
      neededForThisRow = neededSigned > 0 ? neededSigned : 0;
    } else {
      neededForThisRow = neededSigned < 0 ? Math.abs(neededSigned) : 0;
    }

    const autoAmount = Math.min(
      neededForThisRow,
      Number(selectedRef.pendingAmount || 0),
    );

    manualAmountRef.current[row.id] = false;

    onChangeRow(row.id, {
      againstBillRowId: nextId,
      side: nextSide,
      amount: autoAmount > 0 ? autoAmount.toFixed(2) : "",
    });
  }

  return (
    <div className="rounded-[18px] border border-slate-200 bg-[#fcfcfd]">
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[12px] font-semibold text-slate-600">
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Reference</th>
              <th className="px-3 py-3 text-right">Opening Amount</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3">Dr / Cr</th>
              <th className="px-3 py-3 text-center">X</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const selectedOpenRef =
                row.allocationType === "AGAINST_REF"
                  ? openRefs.find((item) => item.id === row.againstBillRowId)
                  : null;

              return (
                <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-2.5 align-middle">
                    <select
                      value={row.allocationType}
                      onChange={(e) =>
                        handleAllocationTypeChange(
                          row,
                          e.target.value as BillAllocationType,
                        )
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400"
                    >
                      {allocationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-2.5 align-middle">
                    {(row.allocationType === "NEW_REF" ||
                      row.allocationType === "ADVANCE") && (
                      <input
                        type="text"
                        value={row.refNo}
                        onChange={(e) =>
                          handleReferenceInputChange(row.id, e.target.value)
                        }
                        placeholder={
                          row.allocationType === "ADVANCE"
                            ? "Advance ref no."
                            : "Enter new ref no."
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400"
                      />
                    )}

                    {row.allocationType === "AGAINST_REF" && (
                      <select
                        value={row.againstBillRowId}
                        onChange={(e) =>
                          handleAgainstRefChange(row, e.target.value)
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400"
                      >
                        <option value="">
                          {loadingOpenRefs
                            ? "Loading open refs..."
                            : "Select open ref"}
                        </option>

                        {openRefs.map((ref) => (
                          <option key={ref.id} value={ref.id}>
                            {`${ref.refNo || ref.voucherNo} • ${formatTransactionType(
                              ref.transactionType,
                            )} • Pending ₹${formatCurrency(ref.pendingAmount)}`}
                          </option>
                        ))}
                      </select>
                    )}

                    {row.allocationType === "ON_ACCOUNT" && (
                      <div className="inline-flex h-10 w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">
                        On Account
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2.5 align-middle text-right">
                    <div className="inline-flex h-10 w-full items-center justify-end rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                      {selectedOpenRef
                        ? formatCurrency(selectedOpenRef.pendingAmount)
                        : "0"}
                    </div>
                  </td>

                  <td className="px-3 py-2.5 align-middle text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.amount}
                      onWheel={stopWheelChange}
                      onChange={(e) =>
                        handleAmountInputChange(row.id, e.target.value)
                      }
                      placeholder="0"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400"
                    />
                  </td>

                  <td className="px-3 py-2.5 align-middle">
                    <select
                      value={row.side}
                      onChange={(e) =>
                        onChangeRow(row.id, {
                          side: e.target.value as EntrySide,
                        })
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400"
                    >
                      <option value="DR">DR</option>
                      <option value="CR">CR</option>
                    </select>
                  </td>

                  <td className="px-3 py-2.5 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-3 py-3">
        <SummaryChip label={`DR Total: ${formatCurrency(totals.drTotal) || "0"}`} />
        <SummaryChip label={`CR Total: ${formatCurrency(totals.crTotal) || "0"}`} />
        <SummaryChip
          label={`Remaining: ${formatCurrency(Math.abs(totals.remaining)) || "0"}`}
        />
        <SummaryChip
          label={`Net ${voucherSide} = ${formatCurrency(Math.abs(totals.net))} / Voucher = ${formatCurrency(totals.voucherAmountValue)}`}
          ok={totals.matched}
        />
      </div>

      <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[11px] text-slate-500">
        New Ref / Advance auto-prefers voucher no. Against Ref amount auto-fills
        from pending balance where possible.
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  ok = false,
}: {
  label: string;
  ok?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-800"
      }`}
    >
      {label}
    </div>
  );
}