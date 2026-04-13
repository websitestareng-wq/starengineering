"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  LayoutDashboard,
  WalletCards,
  ReceiptText,
  ChevronDown,
  FileText,
  BarChart3,
  UserCircle2,
  X,
} from "lucide-react";

type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
};

type NavChildItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  matchPrefix?: boolean;
  children?: NavChildItem[];
};

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: boolean;
  children?: NavChildItem[];
};

const primaryNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/user/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Reports",
    href: "/user/reports",
    icon: ReceiptText,
    matchPrefix: true,
    children: [
      {
        title: "Ledger",
        href: "/user/reports/ledger",
        icon: FileText,
      },
      {
        title: "Bill-wise",
        href: "/user/reports/bill-wise/receivable",
        icon: ReceiptText,
        matchPrefix: true,
        children: [
          {
            title: "Bills Receivable",
            href: "/user/reports/bill-wise/receivable",
          },
          {
            title: "Bills Payable",
            href: "/user/reports/bill-wise/payable",
          },
          {
            title: "Unraised Invoices",
            href: "/user/reports/bill-wise/unraised",
          },
          {
            title: "Unreceived Invoices",
            href: "/user/reports/bill-wise/unreceived",
          },
          {
            title: "On Account",
            href: "/user/reports/bill-wise/on-account",
          },
        ],
      },
    ],
  },
];

const secondaryNavItems: NavItem[] = [
  {
    title: "Payment Centre",
    href: "/user/payment-centre",
    icon: WalletCards,
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: "Profile",
    href: "/user/profile",
    icon: UserCircle2,
  },
];

function readUserRole(): string | null {
  if (typeof window === "undefined") return null;

  const keys = ["currentUser", "auth_user", "user"];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as { role?: string };
      if (parsed?.role) return parsed.role;
    } catch {
      // ignore invalid storage value
    }
  }

  return null;
}

function isPathActive(pathname: string, href: string, matchPrefix?: boolean) {
  return matchPrefix ? pathname.startsWith(href) : pathname === href;
}

function isAnyChildActive({
  pathname,
  items,
}: {
  pathname: string;
  items?: NavChildItem[];
}): boolean {
  if (!items?.length) return false;

  return items.some((item) => {
    const currentActive = isPathActive(pathname, item.href, item.matchPrefix);
    const childActive = item.children
      ? isAnyChildActive({ pathname, items: item.children })
      : false;

    return currentActive || childActive;
  });
}

function MobileSubmenu({
  pathname,
  items,
  onClose,
}: {
  pathname: string;
  items: NavChildItem[];
  onClose: () => void;
}) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nextState: Record<string, boolean> = {};

    items.forEach((item) => {
      if (item.children?.length) {
        nextState[item.href] =
          isPathActive(pathname, item.href, item.matchPrefix) ||
          isAnyChildActive({ pathname, items: item.children });
      }
    });

    setOpenMap(nextState);
  }, [items, pathname]);

  const toggleItem = (href: string) => {
    setOpenMap((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  return (
    <div className="ml-4 mt-2 space-y-2 border-l border-slate-200/80 pl-3">
      {items.map((child) => {
        const ChildIcon = child.icon;
        const childActive = isPathActive(pathname, child.href, child.matchPrefix);
        const nestedActive = child.children
          ? isAnyChildActive({ pathname, items: child.children })
          : false;

        if (!child.children) {
          return (
            <motion.div
              key={child.href}
              whileTap={{ scale: 0.99 }}
              whileHover={{ x: 3 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={child.href}
                onClick={onClose}
                className={`group relative flex items-center gap-2 overflow-hidden rounded-[16px] px-3 py-2 text-sm font-medium transition-all duration-300 ${
                  childActive
                    ? "sidebar-item-gradient text-white shadow-[0_14px_30px_rgba(99,102,241,0.24)]"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                }`}
              >
                {!childActive ? (
                  <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-700 via-purple-700 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                ) : null}

                {ChildIcon ? <ChildIcon className="h-4 w-4 shrink-0" /> : null}
                <span className="truncate">{child.title}</span>
              </Link>
            </motion.div>
          );
        }

        const isExpanded = openMap[child.href] ?? (childActive || nestedActive);

        return (
          <div key={child.href} className="space-y-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              whileHover={{ x: 3 }}
              transition={{ duration: 0.2 }}
              onClick={() => toggleItem(child.href)}
              className={`group relative flex w-full items-center gap-2 overflow-hidden rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-300 ${
                childActive || nestedActive
                  ? "bg-gradient-to-r from-rose-50 via-violet-50 to-blue-50 text-slate-900 shadow-[0_10px_24px_rgba(99,102,241,0.10)]"
                  : "text-slate-700 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
              }`}
            >
              <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-700 via-purple-700 to-blue-700" />
              {ChildIcon ? <ChildIcon className="h-4 w-4 shrink-0" /> : null}
              <span className="truncate">{child.title}</span>
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="ml-auto"
              >
                <ChevronDown className="h-4 w-4 opacity-70" />
              </motion.span>
            </motion.button>

            <AnimatePresence initial={false}>
              {isExpanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="ml-3 space-y-2 border-l border-slate-200/80 pl-3 pt-1">
                    {child.children.map((sub) => {
                      const subActive = pathname === sub.href;

                      return (
                        <motion.div
                          key={sub.href}
                          whileTap={{ scale: 0.99 }}
                          whileHover={{ x: 3 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Link
                            href={sub.href}
                            onClick={onClose}
                            className={`group relative flex items-center rounded-2xl px-3 py-2.5 text-sm transition-all duration-300 ${
                              subActive
                                ? "sidebar-item-gradient font-semibold text-white shadow-[0_14px_30px_rgba(99,102,241,0.24)]"
                                : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                            }`}
                          >
                            {!subActive ? (
                              <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-700 via-purple-700 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            ) : null}
                            <span className="truncate">{sub.title}</span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function UserMobileSidebar({
  open,
  onClose,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(readUserRole());
  }, []);

  const filteredNavItems = useMemo(() => primaryNavItems, []);
  const secondaryItems = useMemo(() => secondaryNavItems, []);
const bottomItems = useMemo(() => bottomNavItems, []);

  const initialOpenState = useMemo(() => {
    const state: Record<string, boolean> = {};

    filteredNavItems.forEach((item) => {
      if (item.children?.length) {
        state[item.href] =
          isPathActive(pathname, item.href, item.matchPrefix) ||
          isAnyChildActive({ pathname, items: item.children });
      }
    });

    return state;
  }, [filteredNavItems, pathname]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(initialOpenState);

  useEffect(() => {
    if (!open) return;

    const nextState: Record<string, boolean> = {};
    filteredNavItems.forEach((item) => {
      if (item.children?.length) {
        nextState[item.href] =
          isPathActive(pathname, item.href, item.matchPrefix) ||
          isAnyChildActive({ pathname, items: item.children });
      }
    });

    setOpenMap(nextState);
  }, [filteredNavItems, open, pathname]);

  const toggleItem = (href: string) => {
    setOpenMap((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-slate-950/30 backdrop-blur-md lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: "-100%", opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed left-0 top-0 z-[80] flex h-dvh w-[88%] max-w-[330px] flex-col overflow-hidden border-r border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.22)] lg:hidden"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="sidebar-ambient absolute -left-16 top-0 h-52 w-52 rounded-full blur-3xl" />
              <div className="sidebar-ambient absolute right-[-70px] top-1/3 h-52 w-52 rounded-full blur-3xl [animation-delay:-5s]" />
              <div className="sidebar-ambient absolute bottom-[-40px] left-8 h-40 w-40 rounded-full blur-3xl [animation-delay:-9s]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_52%)]" />
            </div>

            <div className="relative flex items-center justify-between border-b border-slate-200/80 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.06, rotate: -4 }}
                  transition={{ duration: 0.28 }}
                  className="sidebar-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_14px_35px_rgba(91,33,182,0.28)]"
                >
                  <BarChart3 className="h-5 w-5" />
                </motion.div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    User Portal
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    STAR ENGINEERING
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    Account dashboard & payment access
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.04, rotate: 6 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <nav className="relative flex h-full flex-1 flex-col overflow-y-auto px-4 py-4">
            <div className="space-y-2">
  {filteredNavItems.map((item) => {
    const Icon = item.icon;
    const isActive = isPathActive(pathname, item.href, item.matchPrefix);
    const nestedActive = isAnyChildActive({ pathname, items: item.children });
    const isExpanded = openMap[item.href] ?? (isActive || nestedActive);

    if (!item.children) {
      return (
        <motion.div
          key={item.href}
          whileTap={{ scale: 0.99 }}
          whileHover={{ x: 3 }}
          transition={{ duration: 0.2 }}
        >
          <Link
            href={item.href}
            onClick={onClose}
            className={`group relative flex items-center gap-3 overflow-hidden rounded-[18px] px-3 py-2.5 transition-all duration-300 ${
              isActive
                ? "sidebar-item-gradient text-white shadow-[0_16px_34px_rgba(99,102,241,0.25)]"
                : "text-slate-700 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
            }`}
          >
            {!isActive ? (
              <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-700 via-purple-700 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            ) : null}

            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] transition-all duration-300 ${
                isActive
                  ? "bg-white/15 text-white shadow-inner"
                  : "bg-white text-slate-600 shadow-[0_10px_20px_rgba(15,23,42,0.06)] group-hover:scale-110 group-hover:text-slate-900"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>

            <span className="truncate text-sm font-semibold">{item.title}</span>
          </Link>
        </motion.div>
      );
    }

    return (
      <div key={item.href} className="space-y-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          whileHover={{ x: 3 }}
          transition={{ duration: 0.2 }}
          onClick={() => toggleItem(item.href)}
          className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] px-3 py-3 text-left transition-all duration-300 ${
            isActive || nestedActive
              ? "bg-gradient-to-r from-rose-50 via-violet-50 to-blue-50 text-slate-900 shadow-[0_12px_30px_rgba(99,102,241,0.10)]"
              : "text-slate-700 hover:bg-white hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
          }`}
        >
          <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-700 via-purple-700 to-blue-700" />

          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] transition-all duration-300 ${
              isActive || nestedActive
                ? "sidebar-gradient text-white shadow-[0_12px_28px_rgba(91,33,182,0.25)]"
                : "bg-white text-slate-600 shadow-[0_10px_20px_rgba(15,23,42,0.06)] group-hover:scale-110 group-hover:text-slate-900"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>

          <span className="truncate text-sm font-semibold">{item.title}</span>

          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="ml-auto"
          >
            <ChevronDown className="h-4 w-4 opacity-70" />
          </motion.span>
        </motion.button>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <MobileSubmenu
                pathname={pathname}
                items={item.children}
                onClose={onClose}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  })}

  {secondaryItems.map((item) => {
    const Icon = item.icon;
    const isActive = isPathActive(pathname, item.href, item.matchPrefix);

    return (
      <motion.div
        key={item.href}
        whileTap={{ scale: 0.99 }}
        whileHover={{ x: 3 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          href={item.href}
          onClick={onClose}
          className={`group relative flex items-center gap-3 overflow-hidden rounded-[18px] px-3 py-2.5 transition-all duration-300 ${
            isActive
              ? "sidebar-item-gradient text-white shadow-[0_16px_34px_rgba(99,102,241,0.25)]"
              : "text-slate-700 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
          }`}
        >
          {!isActive ? (
            <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-700 via-purple-700 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          ) : null}

          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] transition-all duration-300 ${
              isActive
                ? "bg-white/15 text-white shadow-inner"
                : "bg-white text-slate-600 shadow-[0_10px_20px_rgba(15,23,42,0.06)] group-hover:scale-110 group-hover:text-slate-900"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>

          <span className="truncate text-sm font-semibold">{item.title}</span>
        </Link>
      </motion.div>
    );
  })}
</div>

              <div className="mt-auto pt-4">
                <div className="border-t border-slate-200/80 pt-4">
                  <div className="mb-2 px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Account
                    </p>
                  </div>

                  <div className="space-y-2">
                    {bottomItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isPathActive(pathname, item.href, item.matchPrefix);

                      return (
                        <motion.div
                          key={item.href}
                          whileTap={{ scale: 0.99 }}
                          whileHover={{ x: 3 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={`group relative flex items-center gap-3 overflow-hidden rounded-[18px] px-3 py-2.5 transition-all duration-300 ${
                              isActive
                                ? "sidebar-item-gradient text-white shadow-[0_16px_34px_rgba(99,102,241,0.25)]"
                                : "text-slate-700 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                            }`}
                          >
                            {!isActive ? (
                              <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-700 via-purple-700 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            ) : null}

                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] transition-all duration-300 ${
                                isActive
                                  ? "bg-white/15 text-white shadow-inner"
                                  : "bg-white text-slate-600 shadow-[0_10px_20px_rgba(15,23,42,0.06)] group-hover:scale-110 group-hover:text-slate-900"
                              }`}
                            >
                              <Icon className="h-[18px] w-[18px]" />
                            </span>

                            <span className="truncate text-sm font-semibold">{item.title}</span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </nav>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}