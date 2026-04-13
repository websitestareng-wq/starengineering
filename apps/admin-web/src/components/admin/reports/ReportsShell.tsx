"use client";

import type { ReactNode } from "react";
import ReportsTabs from "./ReportsTabs";

export default function ReportsShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
          STAR Engineering
        </div>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Reports
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Party-wise ledger, bill-wise outstanding, on account, unraised and
          unreceived reports in structured pages.
        </p>
      </div>

      <ReportsTabs />

      {children}
    </div>
  );
}