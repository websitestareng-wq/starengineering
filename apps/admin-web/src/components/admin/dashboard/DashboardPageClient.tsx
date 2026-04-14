"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import GlobalPageLoader from "@/components/admin/GlobalPageLoader";
import {
  BadgeIndianRupee,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Loader2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Filter,
Layers3,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  getDashboardOverview,
  type DashboardOverviewResponse,
} from "@/lib/dashboard";

type RangeKey = "this_month" | "last_30_days" | "current_fy" | "lifetime" | "custom";
type RankingType = "sales" | "purchase" | "receipt" | "payment";

type FilterState = {
  rangeKey: RangeKey;
  from: string;
  to: string;
  partyId: string;
};
type DashboardFilterDraft = {
  rangeKey: RangeKey;
  from: string;
  to: string;
  partyId: string;
};
type TrendPoint = {
  monthLabel: string;
  sales: number;
  purchase: number;
  receipt: number;
  payment: number;
};

const PIE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#ec4899",
  "#ef4444",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#0ea5e9",
];

const DONUT_COLORS = ["#2563eb", "#ef4444"];

const TREND_META = {
  sales: { label: "Sales", dot: "bg-blue-500", text: "text-blue-600" },
  purchase: { label: "Purchase", dot: "bg-violet-500", text: "text-violet-600" },
  receipt: { label: "Receipt", dot: "bg-emerald-500", text: "text-emerald-600" },
  payment: { label: "Payment", dot: "bg-rose-500", text: "text-rose-600" },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toLocalIso(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayIso() {
  return toLocalIso(new Date());
}
function formatDashboardCardAmount(value: number) {
  const num = Math.floor(Number(value || 0));
  const abs = Math.abs(num);

  if (abs <= 9999999) {
    return `₹${num.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })}`;
  }

  return `₹${(num / 10000000).toFixed(2)} Cr`;
}

function useCountUp(target: number, duration = 3000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const finalValue = Number(target || 0);
    let frameId = 0;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
  const nextValue = Math.floor(finalValue * eased);

setCount(nextValue);

if (progress < 1) {
  frameId = window.requestAnimationFrame(step);
} else {
  setCount(Math.floor(finalValue));
}
    };

    setCount(0);
    frameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frameId);
  }, [target, duration]);

  return count;
}

function AnimatedCurrencyValue({
  value,
  suffix,
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const animatedValue = useCountUp(value, 3000);

  return (
    <span className={className}>
      {formatDashboardCardAmount(animatedValue)}
      {suffix ? <span className="ml-1">{suffix}</span> : null}
    </span>
  );
}
function formatCurrency(value: number) {
  const num = Number(value || 0);
  return `₹${num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

function formatCompactCurrency(value: number) {
  const num = Number(value || 0);

  if (Math.abs(num) >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)}Cr`;
  }

  if (Math.abs(num) >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }

  if (Math.abs(num) >= 1000) {
    return `₹${(num / 1000).toFixed(1)}K`;
  }

  return `₹${num.toLocaleString("en-IN")}`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getThisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: toLocalIso(from),
    to: toLocalIso(to),
  };
}

function getLast30DaysRange() {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - 29);

  return {
    from: toLocalIso(from),
    to: toLocalIso(to),
  };
}

function getCurrentFinancialYearRange() {
  const now = new Date();
  const startYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const from = new Date(startYear, 3, 1);
  const to = new Date(startYear + 1, 2, 31);

  return {
    from: toLocalIso(from),
    to: toLocalIso(to),
  };
}
function getLifetimeRange() {
  return {
    from: "2000-01-01",
    to: getTodayIso(),
  };
}
function getRangeFromKey(rangeKey: RangeKey) {
  switch (rangeKey) {
    case "this_month":
      return getThisMonthRange();
    case "last_30_days":
      return getLast30DaysRange();
    case "current_fy":
      return getCurrentFinancialYearRange();
    case "lifetime":
      return getLifetimeRange();
    case "custom":
    default:
      return getThisMonthRange();
  }
}

function normalizeMonthlyTrend(
  trend: DashboardOverviewResponse["charts"]["monthlyTrend"] | undefined,
): TrendPoint[] {
  const rows = (trend || []).map((item) => ({
    monthLabel: String(item.monthLabel || ""),
    sales: Number(item.sales || 0),
    purchase: Number(item.purchase || 0),
    receipt: Number(item.receipt || 0),
    payment: Number(item.payment || 0),
  }));

  if (rows.length <= 1) {
    const only = rows[0] || {
      monthLabel: "Current",
      sales: 0,
      purchase: 0,
      receipt: 0,
      payment: 0,
    };

    return [
      {
        monthLabel: "",
        sales: 0,
        purchase: 0,
        receipt: 0,
        payment: 0,
      },
      only,
    ];
  }

  return rows;
}

function SmallStatCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = "blue",
  suffix,
}: {
  title: string;
  value: number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "blue" | "emerald" | "violet" | "rose" | "amber";
  suffix?: string;
}) {
  const toneClasses: Record<string, string> = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-[20px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.92))] p-3.5 shadow-[0_14px_30px_rgba(124,58,237,0.06)] transition-all duration-300 hover:border-violet-200 hover:shadow-[0_18px_36px_rgba(124,58,237,0.09)] sm:p-4"
    >
      <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(90deg,rgba(168,85,247,0.06),rgba(236,72,153,0.04),rgba(59,130,246,0.05))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 rounded-[18px] border p-2.5 shadow-sm transition-transform duration-300 group-hover:scale-[1.04]",
            toneClasses[tone],
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] leading-4 text-slate-500 sm:text-[11px] sm:tracking-[0.14em]">
            {title}
          </p>

          <h3 className="mt-1.5 break-words text-[15px] font-bold leading-[1.28] tracking-tight text-slate-900 sm:text-[20px]">
            <AnimatedCurrencyValue value={value} suffix={suffix} />
          </h3>

          <p className="mt-1.5 text-[10px] leading-4 text-slate-400 sm:text-[11px] sm:leading-5">
            {hint}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function Panel({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
       "relative overflow-hidden rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.94))] p-4 shadow-[0_18px_46px_rgba(124,58,237,0.08)] backdrop-blur-xl sm:p-5",
        className,
      )}
    >
     <div className="absolute left-0 top-0 h-24 w-24 rounded-full bg-fuchsia-100/30 blur-3xl" />
<div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-100/30 blur-3xl" />

      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-[1.2rem] font-bold tracking-tight text-slate-900 sm:text-[1.45rem]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        {right ? <div className="shrink-0 lg:pl-4">{right}</div> : null}
      </div>

      <div className="relative mt-4">{children}</div>
    </section>
  );
}

function ChartEmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {label}
    </div>
  );
}

function LoadingShell() {
  return (
    <GlobalPageLoader
      title="Loading dashboard data..."
      subtitle="Please wait while we prepare charts, cards, summaries and analytics."
    />
  );
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

 const rows = payload
  .filter((item) => {
    const key = String(item.dataKey || "");
    return key in TREND_META && Number(item.value || 0) > 0;
  })
  .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

  if (!rows.length) return null;

  return (
    <div className="min-w-[200px] rounded-[18px] border border-slate-200 bg-white px-3.5 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <p className="mb-2 text-sm font-bold text-slate-900">{label || "—"}</p>

      <div className="space-y-1.5">
        {rows.map((item) => {
          const key = String(item.dataKey || "") as keyof typeof TREND_META;
          const meta = TREND_META[key];

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                <span className="truncate text-slate-600">{meta.label}</span>
              </div>
              <span className={cn("font-bold", meta.text)}>
                {formatCurrency(Number(item.value || 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPageClient() {
  const initialRange = getCurrentFinancialYearRange();

  const [filters, setFilters] = useState<FilterState>({
  rangeKey: "current_fy",
  from: initialRange.from,
  to: initialRange.to,
  partyId: "all",
});
const [draftFilters, setDraftFilters] = useState<DashboardFilterDraft>({
  rangeKey: "current_fy",
  from: initialRange.from,
  to: initialRange.to,
  partyId: "all",
});
const [filterOpen, setFilterOpen] = useState(false);
const [mounted, setMounted] = useState(false);

  const [rankingType, setRankingType] = useState<RankingType>("sales");
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async (showSkeleton = false) => {
    try {
      setError("");

      if (showSkeleton) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await getDashboardOverview({
        from: filters.from,
        to: filters.to,
        partyId: filters.partyId,
      });

      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
useEffect(() => {
  setMounted(true);
}, []);

useEffect(() => {
  if (!filterOpen) {
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
}, [filterOpen]);
  useEffect(() => {
    void loadDashboard(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      void loadDashboard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.partyId]);

  const selectedPartyLabel = useMemo(() => {
    if (!data?.parties?.length || filters.partyId === "all") return "All Parties";
    return (
      data.parties.find((party) => party.id === filters.partyId)?.name ||
      "Selected Party"
    );
  }, [data?.parties, filters.partyId]);

  const trendData = useMemo(
    () => normalizeMonthlyTrend(data?.charts.monthlyTrend),
    [data?.charts.monthlyTrend],
  );
const finalClosingTone = useMemo(() => {
  if (data?.summary.finalClosingSide === "Cr") {
    return {
      card: "border-red-200 bg-red-50/70",
      value: "text-red-600",
      badge: "text-red-600",
    };
  }

  if (data?.summary.finalClosingSide === "Dr") {
    return {
      card: "border-emerald-200 bg-emerald-50/70",
      value: "text-emerald-600",
      badge: "text-emerald-600",
    };
  }

  return {
    card: "border-slate-200 bg-white",
    value: "text-slate-900",
    badge: "text-slate-600",
  };
}, [data?.summary.finalClosingSide]);
  const compactTopSummary = useMemo(
    () => [
      {
        label: "Range",
        value:
          filters.rangeKey === "this_month"
  ? "This Month"
  : filters.rangeKey === "last_30_days"
    ? "Last 30 Days"
    : filters.rangeKey === "current_fy"
      ? "Current FY"
      : filters.rangeKey === "lifetime"
        ? "Lifetime"
        : "Custom",
        note: `${formatDate(filters.from)} to ${formatDate(filters.to)}`,
      },
      {
        label: "Party",
        value: selectedPartyLabel,
        note:
          filters.partyId === "all" ? "All parties combined" : "Specific party view",
      },
    ],
    [filters.from, filters.partyId, filters.rangeKey, filters.to, selectedPartyLabel],
  );

 const filteredTopParties = useMemo(() => {
  if (!data?.charts) return [];

  if (rankingType === "sales") return data.charts.topPartiesByType?.sales || [];
  if (rankingType === "purchase") return data.charts.topPartiesByType?.purchase || [];
  if (rankingType === "receipt") return data.charts.topPartiesByType?.receipt || [];
  if (rankingType === "payment") return data.charts.topPartiesByType?.payment || [];

  return data.charts.topParties || [];
}, [data?.charts, rankingType]);

  const applyRangeKey = (rangeKey: RangeKey) => {
    const range = getRangeFromKey(rangeKey);

    setFilters((prev) => ({
      ...prev,
      rangeKey,
      ...(rangeKey === "custom"
        ? {}
        : {
            from: range.from,
            to: range.to,
          }),
    }));
  };
const openFilterModal = () => {
  setDraftFilters({
    rangeKey: filters.rangeKey,
    from: filters.from,
    to: filters.to,
    partyId: filters.partyId,
  });
  setFilterOpen(true);
};

const applyDraftRange = (rangeKey: RangeKey) => {
  const range = getRangeFromKey(rangeKey);

  setDraftFilters((prev) => ({
    ...prev,
    rangeKey,
    ...(rangeKey === "custom"
      ? {}
      : {
          from: range.from,
          to: range.to,
        }),
  }));
};

const applyFilters = () => {
  setFilters({
    rangeKey: draftFilters.rangeKey,
    from: draftFilters.from,
    to: draftFilters.to,
    partyId: draftFilters.partyId,
  });
  setFilterOpen(false);
};
const rankingTabs = [
  { key: "sales", label: "Sales" },
  { key: "purchase", label: "Purchase" },
  { key: "receipt", label: "Receipt" },
  { key: "payment", label: "Payment" },
] as const;
const filterModal =
  mounted && filterOpen
    ? createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => setFilterOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 top-1/2 w-[calc(100vw-24px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-violet-100 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.20)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                    Dashboard Filter
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                    Apply Filter
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
  Select the range.
</p>
                </div>

                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { key: "this_month", label: "This Month" },
                  { key: "current_fy", label: "Current FY" },
                  { key: "lifetime", label: "Lifetime" },
                  { key: "custom", label: "Custom" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => applyDraftRange(item.key as RangeKey)}
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                      draftFilters.rangeKey === item.key
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_18px_rgba(124,58,237,0.22)]"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

            {draftFilters.rangeKey === "custom" ? (
  <div className="mt-4 grid grid-cols-2 gap-3">
    <div className="space-y-2">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        From
      </span>
      <input
        type="date"
        value={draftFilters.from}
        onChange={(e) =>
          setDraftFilters((prev) => ({
            ...prev,
            rangeKey: "custom",
            from: e.target.value,
          }))
        }
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>

    <div className="space-y-2">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        To
      </span>
      <input
        type="date"
        value={draftFilters.to}
        max={getTodayIso()}
        onChange={(e) =>
          setDraftFilters((prev) => ({
            ...prev,
            rangeKey: "custom",
            to: e.target.value,
          }))
        }
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>
  </div>
) : null}

              <div className="mt-4 space-y-2">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Party
                </span>
                <div className="relative">
                  <select
                    value={draftFilters.partyId}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        partyId: e.target.value,
                      }))
                    }
                    className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="all">All Parties</option>
                    {(data?.parties || []).map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)]"
                >
                  Apply Filter
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )
    : null;
  if (loading) {
    return <LoadingShell />;
  }
if (error) {
  return (
    <div className="rounded-[26px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))] p-6 shadow-[0_18px_45px_rgba(244,63,94,0.08)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Loader2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-600">
            Dashboard Error
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Data load failed
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
        </div>
      </div>
    </div>
  );
}
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.96))] p-4 shadow-[0_24px_70px_rgba(124,58,237,0.10)] backdrop-blur-xl sm:p-5">
     <div className="absolute left-0 top-0 h-36 w-36 rounded-full bg-fuchsia-100/30 blur-3xl" />
<div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-violet-100/30 blur-3xl" />

       <motion.div
  initial={{ opacity: 0, y: 18 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.32, ease: "easeOut" }}
  className="relative space-y-5"
>
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
    <div className="min-w-0">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)]">
  <BarChart3 className="h-5 w-5" />
</div>

      <span className="mt-4 inline-flex items-center rounded-full border border-violet-100 bg-white/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">
        STAR ENGINEERING DASHBOARD
      </span>

      <h1 className="mt-4 text-[2rem] font-bold tracking-tight text-slate-900 sm:text-[2.6rem] sm:leading-[1.06]">
        Business Dashboard
      </h1>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
        Monitor total sales, purchase, receipts, payments, outstanding balances,
        journal movements, and party-wise business in one premium control center.
      </p>
    </div>

    <div className="hidden grid-cols-1 gap-3 sm:grid-cols-2 xl:grid xl:max-w-[390px]">
      {compactTopSummary.map((item) => (
        <div
          key={item.label}
        className="min-w-0 rounded-[24px] border border-[#e5dceb] bg-white/80 px-4 py-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {item.label}
          </p>

          <p className="mt-2 text-[17px] font-bold leading-6 text-slate-900 sm:text-[18px]">
            {item.value}
          </p>

          <p className="mt-2 text-[13px] leading-5 text-slate-500">
            {item.note}
          </p>
        </div>
      ))}
    </div>
  </div>


  <div className="flex flex-wrap items-center justify-between gap-3">
    

    <button
      type="button"
      onClick={openFilterModal}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[20px] bg-gradient-to-r from-fuchsia-600 via-violet-600 to-violet-700 px-4 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(147,51,234,0.24)] transition-all duration-200 hover:-translate-y-[1px] hover:opacity-95"
    >
      <Filter className="h-4 w-4" />
      Apply Filter
    </button>
  </div>
</motion.div>
      </section>
{filters.partyId !== "all" ? (
  <section className="rounded-[26px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.96))] p-4 shadow-[0_24px_70px_rgba(124,58,237,0.10)] sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="inline-flex rounded-full border border-violet-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
          Lifetime Closing Summary
        </div>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[32px]">
          Final Closing Balance
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Voucher-wise totals and bill-wise closing result.
        </p>
      </div>

     <div
  className={cn(
    "rounded-[26px] border px-4 py-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)] sm:px-5",
    finalClosingTone.card,
  )}
>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {data?.summary.finalClosingLabel || "Final Closing"}
        </p>
      <p className={cn("mt-2 text-[28px] font-bold tracking-tight sm:text-[34px]", finalClosingTone.value)}>
  <AnimatedCurrencyValue
    value={Number(data?.summary.finalClosingAmount || 0)}
  />
  {data?.summary.finalClosingSide ? ` ${data.summary.finalClosingSide}` : ""}
</p>
        <p className="mt-2 text-sm text-slate-500">
          Bills receivable/payable, unraised, unreceived and on-account closing basis.
        </p>
      </div>
    </div>
  </section>
) : null}
<section className="grid grid-cols-2 gap-3 [&>*]:min-w-0 sm:grid-cols-3 xl:grid-cols-4">
  {[
    {
      title: "Total Sales",
      value: Number(data?.summary.totalSales || 0),
      hint: "Selected period sales",
      icon: BadgeIndianRupee,
      tone: "blue" as const,
    },
    {
      title: "Total Purchase",
      value: Number(data?.summary.totalPurchase || 0),
      hint: "Selected period purchase",
      icon: WalletCards,
      tone: "violet" as const,
    },
    {
      title: "Total Receipts",
      value: Number(data?.summary.totalReceipts || 0),
      hint: "Money received",
      icon: TrendingUp,
      tone: "emerald" as const,
    },
    {
      title: "Total Payments",
      value: Number(data?.summary.totalPayments || 0),
      hint: "Money paid",
      icon: TrendingDown,
      tone: "rose" as const,
    },
    {
      title: "Debit Note",
      value: Number(data?.summary.totalDebitNote || 0),
      hint: "Selected period debit notes",
      icon: FileText,
      tone: "amber" as const,
    },
    {
      title: "Credit Note",
      value: Number(data?.summary.totalCreditNote || 0),
      hint: "Selected period credit notes",
      icon: FileText,
      tone: "violet" as const,
    },
    {
      title: "Journal Dr",
      value: Number(data?.summary.totalJournalDr || 0),
      hint: "Selected period journal debit",
      icon: TrendingDown,
      tone: "rose" as const,
    },
    {
      title: "Journal Cr",
      value: Number(data?.summary.totalJournalCr || 0),
      hint: "Selected period journal credit",
      icon: TrendingUp,
      tone: "emerald" as const,
    },
    {
      title: "Bills Receivable",
      value: Number(data?.summary.billsReceivableClosing || 0),
      hint: "Lifetime pending bill-wise DR",
      icon: CircleDollarSign,
      tone: "blue" as const,
    },
    {
      title: "Bills Payable",
      value: Number(data?.summary.billsPayableClosing || 0),
      hint: "Lifetime pending bill-wise CR",
      icon: CircleDollarSign,
      tone: "rose" as const,
    },
    {
      title: "Unraised Invoice",
      value: Number(data?.summary.unraisedInvoiceClosing || 0),
      hint: "Advance received pending invoice",
      icon: Layers3,
      tone: "violet" as const,
    },
    {
      title: "Unreceived Invoice",
      value: Number(data?.summary.unreceivedInvoiceClosing || 0),
      hint: "Advance issued pending invoice",
      icon: Layers3,
      tone: "amber" as const,
    },
    {
      title: "On Account",
      value: Number(data?.summary.onAccountClosing || 0),
      hint: `Lifetime on-account closing${
        data?.summary.onAccountClosingSide ? ` ${data.summary.onAccountClosingSide}` : ""
      }`,
      icon: WalletCards,
      tone: "blue" as const,
      suffix: data?.summary.onAccountClosingSide ? ` ${data.summary.onAccountClosingSide}` : "",
    },
  ]
    .filter((item) => item.value > 0)
    .map((item) => (
      <SmallStatCard
  key={item.title}
  title={item.title}
  value={item.value}
  suffix={"suffix" in item ? item.suffix : undefined}
  hint={item.hint}
  icon={item.icon}
  tone={item.tone}
/>
    ))}
</section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel
          title="Business flow"
          subtitle="Wave-style trend for sales, purchase, receipts and payments"
          right={
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
              <BarChart3 className="h-4 w-4" />
              Live analytics
            </div>
          }
        >
          {trendData.length ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  { key: "sales", label: "Sales", dot: "bg-blue-500" },
                  { key: "purchase", label: "Purchase", dot: "bg-violet-500" },
                  { key: "receipt", label: "Receipt", dot: "bg-emerald-500" },
                  { key: "payment", label: "Payment", dot: "bg-rose-500" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full", item.dot)} />
                    {item.label}
                  </div>
                ))}
              </div>

              <div className="h-[300px] w-full sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ left: 10, right: 10, top: 6, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="receiptGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="paymentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="monthLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(value) =>
  Number(value || 0).toLocaleString("en-IN")
}
                    />
                    <Tooltip content={<TrendTooltip />} />

                    <Area
                      type="natural"
                      dataKey="sales"
                      name="Sales"
                      stroke="#2563eb"
                      fill="url(#salesGradient)"
                      strokeWidth={2.6}
                    />
                    <Area
                      type="natural"
                      dataKey="purchase"
                      name="Purchase"
                      stroke="#7c3aed"
                      fill="url(#purchaseGradient)"
                      strokeWidth={2.4}
                    />
                    <Area
                      type="natural"
                      dataKey="receipt"
                      name="Receipt"
                      stroke="#10b981"
                      fill="url(#receiptGradient)"
                      strokeWidth={2.2}
                    />
                    <Area
                      type="natural"
                      dataKey="payment"
                      name="Payment"
                      stroke="#ef4444"
                      fill="url(#paymentGradient)"
                      strokeWidth={2.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

<div className="mt-4 grid grid-cols-1 gap-2.5">
  {[
    {
      label: "Sales",
      rawValue: Number(data?.summary.totalSales || 0),
      color: "bg-blue-500",
    },
    {
      label: "Purchase",
      rawValue: Number(data?.summary.totalPurchase || 0),
      color: "bg-violet-500",
    },
    {
      label: "Receipt",
      rawValue: Number(data?.summary.totalReceipts || 0),
      color: "bg-emerald-500",
    },
    {
      label: "Payment",
      rawValue: Number(data?.summary.totalPayments || 0),
      color: "bg-rose-500",
    },
  ]
    .filter((item) => item.rawValue > 0)
    .map((item) => (
      <div
        key={item.label}
        className="rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
      >
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {item.label}
          </span>
        </div>
        <p className="mt-1.5 truncate text-sm font-bold text-slate-900">
          {formatCurrency(item.rawValue)}
        </p>
      </div>
    ))}
</div>
            </>
          ) : (
            <ChartEmptyState label="No wave trend available for the selected filters." />
          )}
        </Panel>

        <Panel
          title="Voucher mix"
          subtitle="Sales, purchase, receipt, payment, debit/credit note, journal split"
        >
          {data?.charts.voucherTypeDistribution?.length ? (
            <>
             <div className="h-[220px] w-full sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
  data={data.charts.voucherTypeDistribution.filter((item) => Number(item.value || 0) > 0)}
  dataKey="value"
  nameKey="name"
  innerRadius={46}
  outerRadius={74}
  paddingAngle={2}
  stroke="none"
>
                      {data.charts.voucherTypeDistribution.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(Number(value || 0)),
                        String(name),
                      ]}
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
<div className="grid grid-cols-1 gap-2.5">
  {data.charts.voucherTypeDistribution
    .filter((item) => Number(item.value || 0) > 0)
    .map((item, index) => (
                  <div
                    key={item.name}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.03)]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                      <span className="truncate text-[12px] font-medium text-slate-700">
                        {item.name}
                      </span>
                    </div>
                    <span className="ml-2 shrink-0 text-[12px] font-semibold text-slate-900">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ChartEmptyState label="No voucher mix available for the selected filters." />
          )}
        </Panel>
      </section>
{filters.partyId === "all" ? (
      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
  <Panel
  title="Top parties by business"
  subtitle="Highest value contributors in selected period"
>
  <div className="mb-4 flex flex-wrap gap-2">
    {rankingTabs.map((item) => (
      <button
        key={item.key}
        type="button"
        onClick={() => setRankingType(item.key)}
        className={cn(
          "cursor-pointer rounded-xl px-3 py-1.5 text-[11px] font-semibold transition",
          rankingType === item.key
            ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
          {filteredTopParties.length ? (
            <div className="space-y-3">
              {filteredTopParties.map((party, index) => {
                const maxAmount = Math.max(
                  ...filteredTopParties.map((item) => item.amount || 0),
                  1,
                );
                const width = Math.max(10, (party.amount / maxAmount) * 100);

                return (
                  <motion.div
                    key={party.partyId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: index * 0.05 }}
                   className="rounded-[20px] border border-violet-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.92))] p-3 shadow-[0_10px_24px_rgba(124,58,237,0.05)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Rank #{index + 1}
                        </p>
                        <h3 className="truncate text-base font-bold text-slate-900">
                          {party.partyName}
                        </h3>
                      </div>

                      <div className="shrink-0 text-right">
                       <p className="text-[15px] font-bold text-slate-900 sm:text-base">
                          {formatCurrency(party.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.7, delay: 0.08 * index }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-500 to-pink-500"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <ChartEmptyState label="No party contribution available for the selected filters." />
          )}
        </Panel>

        <Panel
          title="Compact business summary"
          subtitle="Pie-summary only, clean and minimal"
        >
          {data?.charts.receivableVsPayable?.some(
            (item) => Number(item.value || 0) > 0,
          ) ? (
            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.receivableVsPayable}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {data.charts.receivableVsPayable.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(Number(value || 0)),
                        String(name),
                      ]}
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-3 self-center">
                {data.charts.receivableVsPayable
  .filter((item) => Number(item.value || 0) > 0)
  .map((item, index) => (
                  <div
                    key={item.name}
                    className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length],
                        }}
                      />
                      <span className="text-sm font-semibold text-slate-700">
                        {item.name}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No outstanding receivable/payable for current filters.
            </div>
          )}
        </Panel>
      </section>
      ) : null}
      {filterModal}

    </div>
  );
}