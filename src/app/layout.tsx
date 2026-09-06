import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSC 問卷",
  description: "CSC Signature System 問卷平台",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-HK" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
