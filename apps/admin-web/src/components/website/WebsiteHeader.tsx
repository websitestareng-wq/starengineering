"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import WebsiteMobileMenu from "./WebsiteMobileMenu";

export default function WebsiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const goLogin = () => {
    if (pathname === "/login") return;
    router.push("/login");
  };

  return (
    <>
      <header
        className="header"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          zIndex: 9999,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(15,23,42,.08)",
          boxShadow: "0 6px 18px rgba(2,6,23,.05)",
        }}
      >
        <div className="container headerRow">
          <div className="headerLeft">
            <button
              type="button"
              className="hamburger"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <span />
              <span />
              <span />
            </button>

            <Link href="/" className="brand brandWithLogo">
              <Image
                className="brandLogo"
                src="/logo/star-logo.png"
                alt="STAR Engineering"
                width={50}
                height={50}
                priority
              />
              <span className="brandWord gradText">STAR ENGINEERING</span>
            </Link>
          </div>

          <nav className="nav desktopOnly">
            <Link
              href="/"
              className={`navLink ${pathname === "/" ? "active" : ""}`}
            >
              Home
            </Link>
            <Link
              href="/about"
              className={`navLink ${pathname === "/about" ? "active" : ""}`}
            >
              About
            </Link>
            <Link
              href="/shop"
              className={`navLink ${pathname === "/shop" ? "active" : ""}`}
            >
              Shop
            </Link>
            <Link
              href="/contact"
              className={`navLink ${pathname === "/contact" ? "active" : ""}`}
            >
              Contact
            </Link>
          </nav>

          <div className="headerRight">
            <button
              type="button"
              className="btn btnAnim btnLogin"
              onClick={goLogin}
            >
              Login
            </button>
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        style={{
          width: "100%",
          flexShrink: 0,
        }}
      />

      <WebsiteMobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}