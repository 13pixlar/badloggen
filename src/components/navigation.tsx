"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, History, Home, Users, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { ThemeSwitcher } from "@/components/theme-switcher";

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  prominent?: boolean;
}> = [
  { href: "/", label: t("nav.home"), icon: Home },
  { href: "/personer", label: t("nav.persons"), icon: Users },
  { href: "/logga", label: t("nav.logShort"), icon: Droplets, prominent: true },
  { href: "/karta", label: t("nav.map"), icon: Map },
  { href: "/historik", label: t("nav.history"), icon: History },
];

function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-bold text-lg">
          <Droplets className="h-6 w-6 shrink-0 text-primary" />
          <span className="truncate">{t("app.name")}</span>
        </Link>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-16 max-w-4xl grid-cols-5 px-1">
        {navItems.map(({ href, label, icon: Icon, prominent }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[10px] font-medium transition-colors sm:text-xs",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                prominent && !isActive && "text-primary/80"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  isActive && "bg-primary/10",
                  prominent && "bg-primary text-primary-foreground shadow-sm",
                  prominent && isActive && "ring-2 ring-primary/20"
                )}
              >
                <Icon className={cn("h-5 w-5", prominent && "h-[1.35rem] w-[1.35rem]")} />
              </span>
              <span className="max-w-full truncate leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Navigation() {
  return (
    <>
      <AppHeader />
      <BottomNav />
    </>
  );
}
