"use client";

import { useGroups } from "@/components/group-provider";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Users, ChevronDown } from "lucide-react";
import { useState } from "react";

export function GroupSelector({ className }: { className?: string }) {
  const { groups, activeGroup, setActiveGroup, loading } = useGroups();
  const [open, setOpen] = useState(false);

  if (loading || groups.length <= 1) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors w-full"
      >
        <Users className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate flex-1 text-left">
          {activeGroup?.name ?? t("groups.select")}
        </span>
        {activeGroup?.isShared && (
          <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">
            {t("groups.shared")}
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-background shadow-lg overflow-hidden">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroup(group.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors",
                    group.id === activeGroup?.id && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <span className="truncate flex-1 text-left">{group.name}</span>
                  {group.isShared && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {group.role === "owner" ? t("groups.owner") : t("groups.member")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
