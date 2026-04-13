"use client";

import { Loader2 } from "lucide-react";

type GlobalPageLoaderProps = {
  title?: string;
  subtitle?: string;
};

export default function GlobalPageLoader({
  title = "Loading...",
  subtitle = "Please wait",
}: GlobalPageLoaderProps) {
  return (
    <div className="flex min-h-[calc(100vh-140px)] w-full items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100/80 text-violet-700">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>

        <p className="mt-4 text-lg font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}