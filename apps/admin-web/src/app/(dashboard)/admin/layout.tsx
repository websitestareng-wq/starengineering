import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import PageShell from "@/components/admin/layout/page-shell";

const AUTH_COOKIE_NAME = "access_token";

type JwtPayload = {
  role?: string;
};

function readJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length < 2) {
      return null;
    }

    const payload = parts[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const authCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!authCookie) {
    redirect("/login");
  }

  const payload = readJwtPayload(authCookie);
  const role = payload?.role ?? null;

  const pathname =
    headerStore.get("x-pathname") ||
    headerStore.get("next-url") ||
    "";

  const isBlockedForAdminViewer =
    role === "ADMIN_VIEWER" &&
    (pathname.startsWith("/admin/users") ||
      pathname.startsWith("/admin/transactions"));

  if (isBlockedForAdminViewer) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="admin-desktop-shell">
      <div className="admin-desktop-canvas">
        <PageShell>{children}</PageShell>
      </div>
    </div>
  );
}