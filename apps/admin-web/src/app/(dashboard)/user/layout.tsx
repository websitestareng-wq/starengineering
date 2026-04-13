import type { ReactNode } from "react";
import UserPageShell from "@/components/layout/user-layout/user-page-shell";

type UserLayoutProps = {
  children: ReactNode;
};

export default function UserLayout({ children }: UserLayoutProps) {
  return <UserPageShell>{children}</UserPageShell>;
}