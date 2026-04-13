import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STAR Engineering",
  description: "STAR Engineering Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}