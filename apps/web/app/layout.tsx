import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Øen prosjektstyring",
  description: "Prosjektstyring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nb"
      className={cn(geistSans.variable, geistMono.variable)}
    >
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
