"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useGroups } from "@/components/group-provider";
import { getShareCodeFromLocation, stripShareCodeFromUrl } from "@/lib/groups/share-link";
import { t } from "@/lib/i18n";

export function GroupInviteHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { refreshGroups, setActiveGroup } = useGroups();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const code = getShareCodeFromLocation(searchParams.toString());
    if (!code || handledRef.current === code) return;

    handledRef.current = code;

    (async () => {
      try {
        const group = await api.groups.join(code);
        await refreshGroups();
        setActiveGroup(group.id);
        stripShareCodeFromUrl();
        toast.success(t("groups.joined", { name: group.name }));
        if (pathname !== "/gang") {
          router.push("/gang");
        }
      } catch {
        stripShareCodeFromUrl();
        toast.error(t("groups.joinFailed"));
        if (pathname !== "/gang") {
          router.push("/gang");
        }
      }
    })();
  }, [searchParams, pathname, refreshGroups, setActiveGroup, router]);

  return null;
}
