import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/navigation";
import { GroupProvider } from "@/components/group-provider";
import { PwaProvider } from "@/components/pwa-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { THEME_STORAGE_KEY } from "@/lib/theme";
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
  applicationName: "Badloggen",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Badloggen",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#38bdf8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="summer"||t==="default"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col relative">
        <PwaProvider>
          <ThemeProvider>
            <GroupProvider>
              <Navigation />
              <main className="relative z-10 mx-auto flex-1 w-full max-w-4xl px-4 py-6 pb-24">
                {children}
              </main>
              <Toaster />
            </GroupProvider>
          </ThemeProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
