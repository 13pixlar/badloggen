import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Badloggen – Logga dina utomhusbad i Sverige",
  description:
    "Logga när du och dina vänner badar utomhus i Sverige. Håll koll på badplatser, väder och vattentemperatur.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
