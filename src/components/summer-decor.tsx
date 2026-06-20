"use client";

import { useTheme } from "@/components/theme-provider";

const decorations = [
  { emoji: "☀️", className: "top-20 right-[8%] text-3xl" },
  { emoji: "🌊", className: "top-36 left-[5%] text-2xl" },
  { emoji: "🏖️", className: "bottom-32 right-[12%] text-2xl" },
  { emoji: "🍦", className: "bottom-48 left-[10%] text-xl" },
  { emoji: "🌻", className: "top-1/2 right-[4%] text-xl" },
  { emoji: "🦋", className: "top-1/3 left-[3%] text-lg" },
];

export function SummerDecor() {
  const { theme } = useTheme();

  if (theme !== "summer") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {decorations.map(({ emoji, className }) => (
        <span
          key={emoji}
          className={`absolute opacity-25 select-none ${className}`}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}
