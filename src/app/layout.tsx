import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "شركة غازي درويش | سجل الشركة",
  description: "سجلات الشركة اليومية والرسوم والصافي مع تقويم لعرض السجلات السابقة.",
  icons: { icon: [{ url: "/logo.jpg", type: "image/jpeg" }] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
