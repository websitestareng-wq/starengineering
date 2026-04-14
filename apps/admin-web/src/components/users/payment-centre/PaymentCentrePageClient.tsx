"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Landmark,
  QrCode,
  WalletCards,
  ShieldCheck,
  X,
  ChevronRight,
  CircleDollarSign,
} from "lucide-react";
type PaymentMethod = "upi" | "qr" | "bank" | "cheque";

function formatIndianCurrency(value: string) {
  if (!value) return "0";
  const num = Number(value.replace(/,/g, ""));
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
}

function amountToWords(value: number) {
  if (!value || value <= 0) return "Zero Rupees Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const toWordsBelow1000 = (n: number): string => {
    let str = "";
    if (n >= 100) {
      str += `${ones[Math.floor(n / 100)]} Hundred `;
      n %= 100;
    }
    if (n >= 20) {
      str += `${tens[Math.floor(n / 10)]} `;
      n %= 10;
    }
    if (n > 0) {
      str += `${ones[n]} `;
    }
    return str.trim();
  };

  let n = Math.floor(value);
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundredPart = n;

  let result = "";
  if (crore) result += `${toWordsBelow1000(crore)} Crore `;
  if (lakh) result += `${toWordsBelow1000(lakh)} Lakh `;
  if (thousand) result += `${toWordsBelow1000(thousand)} Thousand `;
  if (hundredPart) result += `${toWordsBelow1000(hundredPart)} `;

  return `${result.trim()} Only.`;
}
function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-all text-sm font-semibold text-slate-900">
          {value}
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function PaymentCentrePageClient() {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");

  const [gatewayOpen, setGatewayOpen] = useState(false);
const [gatewayStep, setGatewayStep] = useState<1 | 2 | 3 | 4>(1);

const upiId = "9702485922@ptaxis";
const accountName = "STAR ENGINEERING";
const bankName = "Punjab National Bank";
const accountNumber = "05211011003149";
const ifscCode = "PUNB0052110";
const branchName = "Goregaon (E), Mumbai";

const numericAmount = Number(amount || 0);

const upiLink = useMemo(() => {
  const base = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(accountName)}&cu=INR`;
  return numericAmount > 0 ? `${base}&am=${numericAmount}` : base;
}, [upiId, accountName, numericAmount]);
const upiQrValue = useMemo(() => {
  const base = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(accountName)}&cu=INR`;
  return numericAmount > 0 ? `${base}&am=${numericAmount}` : base;
}, [upiId, accountName, numericAmount]);
const chequeAmountWords = useMemo(() => {
  return amountToWords(numericAmount);
}, [numericAmount]);
const openGateway = () => {
  setGatewayOpen(true);
  setGatewayStep(1);
};

const closeGateway = () => {
  setGatewayOpen(false);
  setGatewayStep(1);
};

const continueFromAmount = () => {
  setGatewayStep(2);
};

const continueToMethodSelection = () => {
  setGatewayStep(3);
};
const continueToMethodDetails = () => {
  setGatewayStep(4);
};
const changeAmountInsideModal = () => {
  setGatewayStep(1);
};

const selectMethodAndStayInModal = (method: PaymentMethod) => {
  setSelectedMethod(method);
};

const handleAmountWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
};

const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
  }
};
useEffect(() => {
  if (selectedMethod !== "cheque") {
    setStep(0);
    return;
  }

  let current = 0;
  setStep(0);

  const interval = window.setInterval(() => {
    current += 1;
    setStep(current);

    if (current >= 6) {
      window.clearInterval(interval);
    }
  }, 550);

  return () => window.clearInterval(interval);
}, [selectedMethod, amount]);
const today = useMemo(() => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  return `${dd}${mm}${yyyy}`;
}, []);

  return (
    <div className="space-y-6 pb-10">

      {/* HERO */}
{/* HERO */}
<div className="relative overflow-hidden rounded-[30px] border border-violet-100/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,245,255,0.98)_38%,rgba(239,246,255,0.96)_100%)] p-5 shadow-[0_30px_80px_rgba(99,102,241,0.12)] sm:p-7">
  <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-fuchsia-100/40 blur-3xl" />
  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-100/40 blur-3xl" />
  <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-sky-100/40 blur-3xl" />

<div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/85 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-700 shadow-sm">
        <ShieldCheck className="h-3.5 w-3.5" />
        Secure Payment Gateway
      </div>

      <h1 className="mt-4 text-[2rem] font-bold tracking-tight text-slate-900 sm:text-[2.7rem] sm:leading-[1.02]">
        Fast, Secure & Premium
        <span className="block bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_45%,#2563eb_100%)] bg-clip-text text-transparent">
          Payment Experience
        </span>
      </h1>

      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
        Pay with UPI, QR, bank transfer, or cheque through a guided premium flow. Enter amount, confirm, choose payment mode, and complete payment from a secure popup experience.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={openGateway}
         className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_50%,#2563eb_100%)] px-5 py-3.5 text-sm font-semibold text-white !text-white shadow-[0_18px_34px_rgba(79,70,229,0.28)] transition-all duration-300 hover:-translate-y-0.5"
        >
          Start Payment
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-white/80 px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Trusted Business Payment Flow
        </div>
      </div>
    </div>

<div className="hidden rounded-[28px] border border-violet-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] p-4 shadow-[0_20px_50px_rgba(99,102,241,0.08)] backdrop-blur sm:p-5 xl:block">
  <div className="rounded-[24px] border border-violet-100/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_42%,#eff6ff_100%)] p-5 shadow-[0_18px_40px_rgba(99,102,241,0.10)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-violet-500">
          Business Payee
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">{accountName}</h2>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe_0%,#dbeafe_100%)] shadow-sm">
        <CircleDollarSign className="h-6 w-6 text-violet-700" />
      </div>
    </div>

    <div className="mt-5 space-y-3">
      <div className="rounded-2xl border border-violet-100/70 bg-white/85 p-4 shadow-sm">
        <p className="text-xs text-slate-500">Current Amount</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {numericAmount > 0 ? `₹ ${formatIndianCurrency(amount)}` : "Open Amount"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm">
          <p className="text-xs text-slate-500">UPI ID</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{upiId}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-4 shadow-sm">
          <p className="text-xs text-slate-500">Methods</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">UPI · QR · Bank · Cheque</p>
        </div>
      </div>
    </div>
  </div>
</div>
  </div>
</div>
      <AnimatePresence>
        {gatewayOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.38)] p-3 sm:p-5"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
             className="relative flex max-h-[94vh] w-full max-w-[760px] flex-col overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:rounded-[30px]"
            >
              <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(135deg,rgba(237,233,254,0.75)_0%,rgba(219,234,254,0.58)_100%)]" />

             <div className="relative flex items-start justify-between gap-3 border-b border-slate-200/70 px-4 py-4 sm:px-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secure Payment Flow
                  </div>

                  <h2 className="mt-3 text-[1.85rem] font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Complete your payment
                  </h2>

                <p className="mt-1 text-[13px] text-slate-500 sm:text-sm">
  Amount → Confirm → Select → Details
</p>
                </div>

                <button
                  type="button"
                  onClick={closeGateway}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

          <div className="relative border-b border-slate-200/70 px-4 py-3 sm:px-6">
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
    {[
      { id: 1, label: "Amount" },
      { id: 2, label: "Confirm" },
      { id: 3, label: "Method" },
      { id: 4, label: "Details" },
    ].map((item) => {
      const active = gatewayStep >= (item.id as 1 | 2 | 3 | 4);

      return (
        <div
          key={item.id}
         className="flex min-w-0 items-center justify-center gap-1.5 rounded-[16px] border border-slate-200/70 bg-white/80 px-2 py-2 sm:gap-2 sm:rounded-[18px] sm:px-2 sm:py-2.5"
        >
          <div
           className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 sm:h-9 sm:w-9 sm:text-sm ${
              active
                ? "bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_55%,#2563eb_100%)] text-white shadow-[0_10px_20px_rgba(79,70,229,0.22)]"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {item.id}
          </div>

          <span
            className={`max-w-full truncate text-[10px] font-semibold leading-none sm:text-sm ${
              active ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {item.label}
          </span>
        </div>
      );
    })}
  </div>
</div>

             <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                {gatewayStep === 1 ? (
                  <div className="space-y-5">
                    <div className="rounded-[26px] border border-violet-100/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_48%,#eff6ff_100%)] p-5 shadow-[0_18px_40px_rgba(99,102,241,0.08)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                        Payment Amount
                      </p>

                      <div className="mt-4 rounded-[22px] border border-white/80 bg-white/92 px-4 py-4 shadow-inner">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          Enter payable amount
                        </p>

                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-[28px] font-bold text-slate-400">₹</span>

                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onWheel={handleAmountWheel}
                            onKeyDown={handleAmountKeyDown}
                            className="w-full bg-transparent text-[28px] font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>

                        <p className="mt-3 text-sm text-slate-500">
                          {numericAmount > 0
                            ? `You are about to pay ₹ ${formatIndianCurrency(amount)}`
                            : "You can continue with open amount for QR, UPI, bank, or cheque."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeGateway}
                        className="rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={continueFromAmount}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_55%,#2563eb_100%)] px-5 py-3 text-sm font-semibold text-white !text-white shadow-[0_16px_32px_rgba(79,70,229,0.24)] transition-all duration-200 hover:-translate-y-0.5"
                      >
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {gatewayStep === 2 ? (
                  <div className="space-y-5">
                    <div className="rounded-[26px] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Confirm Amount
                      </p>

                      <div className="mt-4 rounded-[22px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#f0fdf4_100%)] p-5">
                        <p className="text-xs text-emerald-700">Paying to</p>
                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                          {accountName}
                        </h3>

                        <p className="mt-4 text-xs text-slate-500">Amount</p>
                        <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                          {numericAmount > 0 ? `₹ ${formatIndianCurrency(amount)}` : "Open Amount"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={changeAmountInsideModal}
                        className="rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                      >
                        Change Amount
                      </button>

                      <button
                        type="button"
                        onClick={continueToMethodSelection}
                        className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_55%,#2563eb_100%)] px-5 py-3 text-sm font-semibold text-white !text-white shadow-[0_16px_32px_rgba(79,70,229,0.24)] transition-all duration-200 hover:-translate-y-0.5"
                      >
                        Select Payment Method
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

              {gatewayStep === 3 ? (
  <div className="space-y-5">
    <div className="rounded-[26px] border border-slate-200/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        Select Payment Method
      </p>

      <div className="mt-4 space-y-3">
        {[
          { key: "upi", label: "UPI Payment", sub: "Pay directly with your UPI app", icon: CreditCard },
          { key: "qr", label: "QR Payment", sub: "Scan and pay with supported apps", icon: QrCode },
          { key: "bank", label: "Bank Transfer", sub: "Use account details for transfer", icon: Landmark },
          { key: "cheque", label: "Cheque Payment", sub: "View premium cheque writing preview", icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const active = selectedMethod === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => selectMethodAndStayInModal(item.key as PaymentMethod)}
              className={`flex w-full items-center gap-4 rounded-[22px] border px-4 py-4 text-left transition-all duration-300 ${
                active
                  ? "border-violet-200 bg-[linear-gradient(135deg,#faf5ff_0%,#eff6ff_100%)] shadow-[0_18px_34px_rgba(99,102,241,0.12)]"
                  : "border-slate-200/70 bg-white hover:border-violet-100 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  active
                    ? "bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_55%,#2563eb_100%)] text-white !text-white shadow-[0_12px_24px_rgba(79,70,229,0.22)]"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{item.label}</p>
                  {active ? (
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
              </div>

              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  active
                    ? "border-violet-600 bg-violet-600 shadow-[0_0_0_4px_rgba(124,58,237,0.10)]"
                    : "border-slate-300 bg-white"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    active ? "bg-white" : "bg-transparent"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
      <button
        type="button"
        onClick={() => setGatewayStep(2)}
        className="rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
      >
        Back
      </button>

      <button
        type="button"
        onClick={continueToMethodDetails}
        className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_55%,#2563eb_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(79,70,229,0.24)] transition-all duration-200 hover:-translate-y-0.5"
      >
        Continue
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  </div>
) : null}
{gatewayStep === 4 ? (
  <div className="space-y-5">
   <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200/70 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Selected Method
        </p>
        <p className="mt-1 text-sm font-bold capitalize text-slate-900">
          {selectedMethod === "upi" && "UPI Payment"}
          {selectedMethod === "qr" && "QR Payment"}
          {selectedMethod === "bank" && "Bank Transfer"}
          {selectedMethod === "cheque" && "Cheque Payment"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setGatewayStep(3)}
        className="rounded-[14px] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
      >
        Change Method
      </button>
    </div>

    {selectedMethod === "upi" ? (
      <div className="rounded-[24px] border border-violet-100/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_52%,#eff6ff_100%)] p-5 shadow-sm">
        <div className="space-y-3">
          <CopyRow label="UPI ID" value={upiId} />
          <CopyRow label="Payee Name" value={accountName} />
        </div>

        <div className="mt-4 rounded-[20px] border border-white/80 bg-white/90 p-4">
          <p className="text-xs text-slate-500">Amount</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {numericAmount > 0 ? `₹ ${formatIndianCurrency(amount)}` : "Open Amount"}
          </p>

          <a
            href={upiLink}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_55%,#2563eb_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(79,70,229,0.24)] transition-all duration-200 hover:-translate-y-0.5"
          >
            Pay via UPI App
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    ) : null}

    {selectedMethod === "qr" ? (
      <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_50%,#eff6ff_100%)] p-5 shadow-sm">
        <div className="mx-auto flex w-full max-w-[260px] flex-col items-center rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_16px_30px_rgba(37,99,235,0.08)]">
          <QRCodeSVG
            value={upiQrValue}
            size={190}
            includeMargin
            className="rounded-xl"
          />

          <p className="mt-4 text-center text-sm font-semibold text-slate-900">
            {numericAmount > 0
              ? `Scan to pay ₹ ${formatIndianCurrency(amount)}`
              : "Scan to pay with editable amount"}
          </p>
        </div>

        <div className="mt-4">
          <CopyRow label="Linked UPI ID" value={upiId} />
        </div>
      </div>
    ) : null}

    {selectedMethod === "bank" ? (
      <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,#ffffff_0%,#f0fdf4_42%,#ecfeff_100%)] shadow-[0_18px_40px_rgba(16,185,129,0.08)]">
        <div className="border-b border-emerald-100/80 bg-[linear-gradient(135deg,rgba(16,185,129,0.10)_0%,rgba(6,182,212,0.08)_100%)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#10b981_0%,#06b6d4_100%)] text-white shadow-[0_12px_26px_rgba(16,185,129,0.24)]">
              <Landmark className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Bank Transfer Details
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">
                Premium business transfer
              </h3>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-sm sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Account Name
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-base font-bold text-slate-900">{accountName}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(accountName)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Bank Name
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">{bankName}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(bankName)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Branch Name
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">{branchName}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(branchName)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Account Number
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="break-all text-sm font-bold tracking-[0.08em] text-slate-900">
                  {accountNumber}
                </p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(accountNumber)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                IFSC Code
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold tracking-[0.08em] text-slate-900">{ifscCode}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(ifscCode)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#f0fdfa_100%)] p-4 shadow-sm sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Transfer Amount
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {numericAmount > 0 ? `₹ ${formatIndianCurrency(amount)}` : "Open Amount"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use NEFT, RTGS, IMPS, or internet banking. Mention your company or customer name in remarks where possible.
              </p>
            </div>
          </div>
        </div>
      </div>
    ) : null}

    {selectedMethod === "cheque" ? (
      <div className="rounded-[24px] border border-amber-100 bg-[linear-gradient(135deg,#ffffff_0%,#fffdf7_45%,#fff7ed_100%)] p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">
          Cheque Preview
        </p>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="relative mx-auto w-[760px] min-w-[760px] rounded-[18px] border border-slate-200 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.08)]">
            <img
              src="/images/payment-cheque-reference.png"
              alt="Cheque reference"
              className="block h-auto w-[760px] rounded-[18px]"
            />

            <div className="absolute right-[4.5%] top-[10.3%] flex gap-[2px]">
              {today.split("").map((digit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: step >= 1 ? 1 : 0.35, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex h-[26px] w-[16.5px] items-center justify-center text-[16px] font-bold text-slate-900"
                >
                  {digit}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: step >= 2 ? 1 : 0.25 }}
              className="absolute right-[30.8%] top-[13%] flex w-[90px] flex-col items-center"
            >
              <div className="h-[1.6px] w-full bg-slate-900" />
              <span className="mt-[3px] text-[10px] font-bold uppercase tracking-[0.12em] text-slate-900 leading-none">
                A/c Payee
              </span>
              <div className="mt-[3px] h-[1.6px] w-full bg-slate-900" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: step >= 2 ? 1 : 0.35 }}
              className="absolute left-[10%] top-[23%] w-[58%]"
            >
              <p className="truncate text-[18px] font-bold uppercase tracking-[0.03em] text-slate-900">
                STAR ENGINEERING
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: step >= 3 ? 1 : 0.35 }}
              className="absolute left-[16.2%] top-[32%] w-[59.5%]"
            >
              {numericAmount > 0 ? (() => {
                const words = chequeAmountWords.split(" ").filter(Boolean);

                const MAX_LINE_1 = 45;
                const MAX_LINE_2 = 34;

                let line1Words: string[] = [];
                let line2Words: string[] = [];

                for (const word of words) {
                  const tryLine1 = [...line1Words, word].join(" ");
                  if (tryLine1.length <= MAX_LINE_1 || line1Words.length === 0) {
                    line1Words.push(word);
                  } else {
                    line2Words.push(word);
                  }
                }

                const line1 = line1Words.join(" ");
                const line2 = line2Words.join(" ");

                const scaleFor = (text: string, maxChars: number) =>
                  Math.max(0.62, Math.min(1, maxChars / Math.max(text.length, 1)));

                return (
                  <>
                    <p
                      className="origin-left whitespace-nowrap text-[17px] font-semibold leading-[1.2] text-slate-900"
                      style={{
                        transform: `scaleX(${scaleFor(line1, MAX_LINE_1)})`,
                      }}
                    >
                      {line1}
                    </p>

                    <p
                      className="origin-left whitespace-nowrap text-[17px] font-semibold leading-[2.0] text-slate-900"
                      style={{
                        transform: `translateX(-80px) scaleX(${scaleFor(line2, MAX_LINE_2)})`,
                        marginTop: "4px",
                      }}
                    >
                      {line2}
                    </p>
                  </>
                );
              })() : null}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: step >= 4 ? 1 : 0.35 }}
              className="absolute right-[5%] top-[41%] w-[18.5%] overflow-hidden text-right"
            >
              <div className="flex justify-end overflow-hidden">
                <span
                  className="inline-block origin-right whitespace-nowrap text-[22px] font-bold leading-none text-slate-900"
                  style={{
                    transform:
                      numericAmount > 0
                        ? `scaleX(${Math.max(
                            0.58,
                            Math.min(1, 12 / `${formatIndianCurrency(amount)}/-`.length),
                          )})`
                        : "scaleX(1)",
                  }}
                >
                  {numericAmount > 0 ? `${formatIndianCurrency(amount)}/-` : ""}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    ) : null}
  </div>
) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
