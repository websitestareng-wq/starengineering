"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BellRing,
  ChevronDown,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ReceiptText,
  Users,
  WalletCards,
} from "lucide-react";

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

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Transactions",
    href: "/admin/transactions",
    icon: WalletCards,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: ReceiptText,
    matchPrefix: true,
    children: [
      {
        title: "Ledger",
        href: "/admin/reports/ledger",
        icon: FileText,
      },
      {
        title: "Bill-wise",
        href: "/admin/reports/bill-wise/receivable",
        icon: ReceiptText,
        matchPrefix: true,
        children: [
          {
            title: "Bills Receivable",
            href: "/admin/reports/bill-wise/receivable",
          },
          {
            title: "Bills Payable",
            href: "/admin/reports/bill-wise/payable",
          },
          {
            title: "Unraised Invoices",
            href: "/admin/reports/bill-wise/unraised",
          },
          {
            title: "Unreceived Invoices",
            href: "/admin/reports/bill-wise/unreceived",
          },
          {
            title: "On Account",
            href: "/admin/reports/bill-wise/on-account",
          },
        ],
      },
    ],
  },
  {
    title: "Documents",
    href: "/admin/documents",
    icon: FolderKanban,
  },
  {
    title: "Reminders",
    href: "/admin/reminders",
    icon: BellRing,
  },
];
function readAdminRole(): string | null {
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

function isAnyChildActive({ pathname, items }: { pathname: string; items?: NavChildItem[]; }): any {
  if (!items?.length) return false;

  return items.some((item) => {
    const currentActive = isPathActive(pathname, item.href, item.matchPrefix);

    return currentActive || (item.children
      ? isAnyChildActive({ pathname, items: item.children })
      : false);
  });
}

function SidebarSubmenu({
  pathname,
  items,
  openMap,
  toggleItem,
}: {
  pathname: string;
  items: NavChildItem[];
  openMap: Record<string, boolean>;
  toggleItem: (href: string) => void;
}) {
  return (
    <div className="ml-4 mt-2 space-y-2 border-l border-slate-200/80 pl-3">
      {items.map((child) => {
        const ChildIcon = child.icon;
       const childActive = isPathActive(pathname, child.href, child.matchPrefix);
const nestedActive = child.children
  ? isAnyChildActive({ pathname, items: child.children })
  : false;
const isExpanded = openMap[child.href] ?? (childActive || nestedActive);

        if (!child.children) {
          return (
            <motion.div
              key={child.href}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Link
                href={child.href}
                className={`group relative flex items-center gap-2 overflow-hidden rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                  childActive
                    ? "sidebar-item-gradient text-white shadow-[0_12px_30px_rgba(99,102,241,0.22)]"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)]"
                }`}
              >
                {!childActive ? (
                  <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-600 via-violet-600 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                ) : null}

                {ChildIcon ? <ChildIcon className="h-4 w-4 shrink-0" /> : null}
                <span className="truncate">{child.title}</span>
              </Link>
            </motion.div>
          );
        }

        return (
          <div key={child.href} className="space-y-2">
<motion.button
  type="button"
  whileHover={{ x: 4 }}
  transition={{ duration: 0.2 }}
  onClick={() => toggleItem(child.href)}
  className={`group relative flex w-full items-center gap-2 overflow-hidden rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-300 ${
    childActive || nestedActive
      ? "bg-gradient-to-r from-fuchsia-50 via-violet-50 to-blue-50 text-slate-900 shadow-[0_10px_25px_rgba(99,102,241,0.10)]"
      : "text-slate-700 hover:bg-white hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)]"
  }`}
>
  <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-700 via-purple-700 to-blue-700 opacity-100" />
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
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <Link
                            href={sub.href}
                            className={`group relative flex items-center rounded-2xl px-3 py-2.5 text-sm transition-all duration-300 ${
                              subActive
                                ? "sidebar-item-gradient font-semibold text-white shadow-[0_12px_30px_rgba(99,102,241,0.22)]"
                                : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)]"
                            }`}
                          >
                            {!subActive ? (
                              <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-rose-600 via-violet-600 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(readAdminRole());
  }, []);
  const filteredNavItems = useMemo(() => {
    if (role === "ADMIN_VIEWER") {
      return navItems.filter(
        (item) =>
          item.href !== "/admin/users" &&
          item.href !== "/admin/transactions",
      );
    }

    return navItems;
  }, [role]);
  const initialOpenState = useMemo(() => {
    const state: Record<string, boolean> = {};

       filteredNavItems.forEach((item) => {
      if (item.children?.length) {
        state[item.href] =
          isPathActive(pathname, item.href, item.matchPrefix) ||
          isAnyChildActive({ pathname, items: item.children });

        item.children.forEach((child) => {
          if (child.children?.length) {
            state[child.href] =
              isPathActive(pathname, child.href, child.matchPrefix) ||
              isAnyChildActive({ pathname, items: child.children });
          }
        });
      }
    });

    return state;
   }, [filteredNavItems, pathname]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(initialOpenState);

  const toggleItem = (href: string) => {
    setOpenMap((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  return (
    <aside className="relative flex h-screen w-full flex-col overflow-hidden border-r border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="sidebar-ambient absolute -left-20 top-0 h-56 w-56 rounded-full blur-3xl" />
        <div className="sidebar-ambient absolute right-[-80px] top-1/3 h-56 w-56 rounded-full blur-3xl [animation-delay:-5s]" />
        <div className="sidebar-ambient absolute bottom-[-40px] left-10 h-44 w-44 rounded-full blur-3xl [animation-delay:-9s]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_52%)]" />
      </div>

      <div className="relative border-b border-slate-200/80 px-5 py-5">
        <div className="flex items-start gap-3">
          <motion.div
            whileHover={{ scale: 1.06, rotate: -4 }}
            transition={{ duration: 0.28 }}
            className="sidebar-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_14px_35px_rgba(91,33,182,0.28)]"
          >
            <BarChart3 className="h-5 w-5" />
          </motion.div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Control Panel
            </p>
            <h1 className="truncate text-lg font-bold text-slate-900">
              STAR Engineering
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Business administration portal
            </p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isPathActive(pathname, item.href, item.matchPrefix);
          const nestedActive = isAnyChildActive({ pathname, items: item.children });
          const isExpanded = openMap[item.href] ?? (isActive || nestedActive);

          if (!item.children) {
            return (
              <motion.div
                key={item.href}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <Link
                  href={item.href}
                  className={`group relative flex items-center gap-3 overflow-hidden rounded-[18px] px-3 py-2.5 transition-all duration-300 ${
                    isActive
                      ? "sidebar-item-gradient text-white shadow-[0_16px_35px_rgba(99,102,241,0.25)]"
                      : "text-slate-700 hover:bg-white hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
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
                whileHover={{ x: 4 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={() => toggleItem(item.href)}
                className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] px-3 py-2.5 text-left transition-all duration-300 ${
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
                    <SidebarSubmenu
  pathname={pathname}
  items={item.children}
  openMap={openMap}
  toggleItem={toggleItem}
/>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}