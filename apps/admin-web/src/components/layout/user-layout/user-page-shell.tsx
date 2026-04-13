"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "./user-sidebar";
import Topbar from "./user-topbar";
import MobileSidebar from "./user-mobile-sidebar";

type PageShellProps = {
  children: ReactNode;
};

export default function PageShell({ children }: PageShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ff_0%,#f7f8fc_42%,#f5f7fb_100%)] text-slate-900">
      <div className="min-h-screen">
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[290px]">
          <Sidebar />
        </div>

        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        <div className="min-h-screen lg:pl-[290px]">
          <Topbar onMenuClick={() => setMobileOpen(true)} />

          <main className="px-2 pb-5 pt-[76px] sm:px-3 sm:pb-6 sm:pt-[80px] lg:px-6 lg:pb-8 lg:pt-[88px] xl:px-8">
  <div className="mx-auto w-full max-w-[100%] lg:max-w-[1560px]">
    {children}
  </div>
</main>
        </div>
      </div>
    </div>
  );
}