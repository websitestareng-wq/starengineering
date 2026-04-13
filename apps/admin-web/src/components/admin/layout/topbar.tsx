"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  FileText,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { logoutPortal } from "@/lib/auth";
function readAdminRole(): string | null {
  if (typeof window === "undefined") return null;

  const keys = ["currentUser", "auth_user", "user"];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as { role?: string };
      if (parsed?.role) return parsed.role;
    } catch {}
  }

  return null;
}
type TopbarProps = {
  onMenuClick: () => void;
};

const AUTH_STORAGE_KEYS = [
  "accessToken",
  "refreshToken",
  "token",
  "authToken",
  "adminToken",
  "user",
  "auth_user",
  "currentUser",
];
function readAdminUser() {
  if (typeof window === "undefined") return null;

  const keys = ["currentUser", "auth_user", "user"];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as {
        name?: string;
        role?: string;
      };

      if (parsed?.role) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  return null;
}
export default function Topbar({ onMenuClick }: TopbarProps) {
  const [role, setRole] = useState<string | null>(null);

useEffect(() => {
  setRole(readAdminRole());
}, []);
  useEffect(() => {
    setAdminUser(readAdminUser());
  }, []);
    const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{ name?: string; role?: string } | null>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);
  const displayRole =
  adminUser?.role === "SUPER_ADMIN"
    ? "Super Admin"
    : adminUser?.role === "ADMIN_VIEWER"
    ? "Admin Viewer"
    : adminUser?.role === "ADMIN"
    ? "Admin"
    : adminUser?.role === "PROPRIETOR"
    ? "Proprietor"
    : "Admin";

const displayInitials =
  adminUser?.role === "SUPER_ADMIN"
    ? "SA"
    : adminUser?.role === "ADMIN_VIEWER"
    ? "AV"
    : adminUser?.role === "ADMIN"
    ? "AD"
    : adminUser?.role === "PROPRIETOR"
    ? "PR"
    : "AD";
   const handleLogout = async () => {
    try {
      await logoutPortal();
    } catch {
      // backend logout fail ho tab bhi client cleanup continue kare
    }

    try {
      AUTH_STORAGE_KEYS.forEach((key) => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });
    } catch {
      // ignore cleanup failure
    }

    setMenuOpen(false);

    window.history.replaceState(null, "", "/login");
    window.location.replace("/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md lg:left-[290px]">
      <div className="flex h-[64px] w-full items-center gap-3 px-3 sm:px-4 lg:px-6 xl:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
            Admin Dashboard
          </h2>
          <p className="hidden truncate text-xs text-slate-500 sm:block">
            Professional business management workspace
          </p>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-fuchsia-200 hover:bg-fuchsia-50/40"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#d946ef_0%,#7c3aed_100%)] text-xs font-bold text-white shadow-[0_10px_24px_rgba(168,85,247,0.22)]">
              {displayInitials}
            </div>

            <div className="hidden min-w-0 text-left sm:block">
            <p className="truncate text-sm font-semibold text-slate-800">
  {displayRole}
</p>
              <p className="truncate text-[11px] text-slate-500">
                Secure control access
              </p>
            </div>

            <motion.span
              animate={{ rotate: menuOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="mr-1 hidden sm:block"
            >
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </motion.span>
          </button>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-[260px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
              >
                <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(192,132,252,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.10),transparent_30%),linear-gradient(180deg,#ffffff_0%,#fcf7ff_100%)] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d946ef_0%,#7c3aed_100%)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(168,85,247,0.22)]">
                      {displayInitials}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {displayRole}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        STAR ENGINEERING
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    href="/admin/reminders"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <ShieldCheck className="h-4 w-4 text-slate-500" />
                    Reminders
                  </Link>
<Link
  href="/admin/documents"
  onClick={() => setMenuOpen(false)}
  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
>
  <FileText className="h-4 w-4 text-slate-500" />
  Documents
</Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}