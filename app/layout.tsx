import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavLinks from "./components/NavLinks";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI News Engine",
  description: "@productbykel content pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold tracking-tight text-white">@productbykel</span>
          <NavLinks />
        </header>
        <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">{children}</main>
      </body>
    </html>
  );
}
