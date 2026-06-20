"use client";

import { CloudMoon, CloudSun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const isSummer = theme === "summer";
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(media.matches);

    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const isLightAppearance = isSummer || !prefersDark;

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
      {isLightAppearance ? (
        <CloudSun className="h-5 w-5" />
      ) : (
        <CloudMoon className="h-5 w-5" />
      )}
    </Button>
  );
}
