import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Scholarship Portal",
  description: "Scholarship application and management portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      {/* suppressHydrationWarning: browser extensions (Grammarly, etc.) inject attributes
          like data-gr-ext-installed onto <body> before React hydrates — a real mismatch,
          but not one caused by this app, and not one worth a scary console error over. This
          only suppresses warnings for body's own attributes, not for anything inside it. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
