"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LogDipPage } from "@/components/log-dip-page";
import { EditDipPage } from "@/components/edit-dip-page";
import { t } from "@/lib/i18n";

function LoggaContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  if (editId) {
    const id = parseInt(editId, 10);
    if (!isNaN(id)) {
      return <EditDipPage dipId={id} />;
    }
  }

  return <LogDipPage />;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>}>
      <LoggaContent />
    </Suspense>
  );
}
