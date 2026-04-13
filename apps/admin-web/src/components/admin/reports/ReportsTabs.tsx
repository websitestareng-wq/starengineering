"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Layers3, ReceiptText } from "lucide-react";

const topTabs = [
  {
    label: "Ledger",
    href: "/admin/reports/ledger",
    icon: FileText,
  },
  {
    label: "Bill-wise",
    href: "/admin/reports/bill-wise",
    icon: Layers3,
  },
];

const billwiseTabs = [
  {
    label: "Bills Receivable",
    href: "/admin/reports/bill-wise/receivable",
  },
  {
    label: "Bills Payable",
    href: "/admin/reports/bill-wise/payable",
  },
  {
    label: "Unraised Invoices",
    href: "/admin/reports/bill-wise/unraised",
  },
  {
    label: "Unreceived Invoices",
    href: "/admin/reports/bill-wise/unreceived",
  },
  {
    label: "On Account",
    href: "/admin/reports/bill-wise/on-account",
  },
];

export default function ReportsTabs() {
  const pathname = usePathname();
  const inBillwise = pathname.startsWith("/admin/reports/bill-wise");

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {topTabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {inBillwise ? (
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex flex-wrap gap-2">
            {billwiseTabs.map((tab) => {
              const active = pathname === tab.href;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex h-10 items-center rounded-2xl px-4 text-sm font-semibold transition ${
                    active
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}