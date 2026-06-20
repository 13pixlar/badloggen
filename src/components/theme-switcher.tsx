"use client";

import { Sun, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const isSummer = theme === "summer";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "shrink-0",
        isSummer && "text-amber-700 hover:bg-amber-100/80 hover:text-amber-900"
      )}
      aria-pressed={isSummer}
      aria-label={isSummer ? t("theme.switchToDefault") : t("theme.switchToSummer")}
      title={isSummer ? t("theme.switchToDefault") : t("theme.switchToSummer")}
    >
      {isSummer ? <Waves className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}
