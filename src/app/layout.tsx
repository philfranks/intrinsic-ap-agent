import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";
import "./ap.css";

const inter = localFont({
  src: "../fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const azeretMono = localFont({
  src: "../fonts/AzeretMono-Variable.woff2",
  variable: "--font-azeret",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Invoice Intake · Intrinsic Labs",
  description: "Intrinsic Labs AP agent: drop an invoice, watch it get coded, checked, and drafted.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9F7F4" },
    { media: "(prefers-color-scheme: dark)", color: "#131210" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${azeretMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
