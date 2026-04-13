"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type WebsiteMobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/shop", label: "Shop" }
];

export default function WebsiteMobileMenu({
  open,
  onClose,
}: WebsiteMobileMenuProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mmOverlay" onClick={onClose}>
      <div className="mmDrawer" onClick={(e) => e.stopPropagation()}>
        <div className="mmTop">
          <div className="brandText gradText">STAR ENGINEERING</div>
          <button
            type="button"
            className="mmClose"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="mmNav">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`mmLink ${isActive ? "active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mmBottom">
          <div className="muted">Secure • Premium • Mobile Ready</div>
        </div>
      </div>
    </div>
  );
}