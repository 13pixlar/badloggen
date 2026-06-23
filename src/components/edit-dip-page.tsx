"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DipForm } from "@/components/dip-form";
import { t } from "@/lib/i18n";
import { api, type Dip } from "@/lib/api/client";
import { ensureLocalUser } from "@/lib/auth/user";

interface EditDipPageProps {
  dipId: number;
}

export function EditDipPage({ dipId }: EditDipPageProps) {
  const router = useRouter();
  const [dip, setDip] = useState<Dip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = ensureLocalUser().id;
    api.dips
      .get(dipId)
      .then(async (found) => {
        if (!found) {
          toast.error(t("edit.notFound"));
          router.push("/historik");
          return;
        }
        const canEdit = await api.dips.canEdit(dipId, userId);
        if (!canEdit) {
          toast.error(t("edit.forbidden"));
          router.push("/historik");
          return;
        }
        setDip(found);
      })
      .finally(() => setLoading(false));
  }, [dipId, router]);

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  }

  if (!dip) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("edit.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("edit.subtitle")}</p>
      </div>
      <DipForm
        mode="edit"
        initialDip={dip}
        onSuccess={() => {
          toast.success(t("edit.success"));
          router.push("/historik");
        }}
        onCancel={() => router.push("/historik")}
      />
    </div>
  );
}
