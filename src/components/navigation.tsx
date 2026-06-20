"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, History, Home, Users, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { href: "/", label: t("nav.home"), icon: Home },
  { href: "/personer", label: t("nav.persons"), icon: Users },
  { href: "/logga", label: t("nav.log"), icon: Droplets },
  { href: "/karta", label: t("nav.map"), icon: Map },
  { href: "/historik", label: t("nav.history"), icon: History },
];

export function Navigation() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isSummer = theme === "summer";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Droplets className="h-6 w-6 text-primary" />
          <span>{t("app.name")}</span>
          {isSummer && <span className="text-base" aria-hidden>☀️🌊</span>}
        </Link>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  pathname === href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
