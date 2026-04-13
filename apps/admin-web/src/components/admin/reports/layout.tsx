import type { ReactNode } from "react";
import ReportsShell from "@/components/admin/reports/ReportsShell";

export default function ReportsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ReportsShell>{children}</ReportsShell>;
}