"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Map } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DipDetailCard } from "@/components/dip-detail-card";
import { t } from "@/lib/i18n";
import { api, type Dip } from "@/lib/api/client";

const DipMap = dynamic(
  () => import("@/components/dip-map").then((m) => m.DipMap),
  { ssr: false, loading: () => <div className="h-[min(60vh,500px)] w-full rounded-xl border bg-muted animate-pulse" /> }
);

export function MapPage() {
  const [dips, setDips] = useState<Dip[]>([]);
  const [selectedDip, setSelectedDip] = useState<Dip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dips
      .list()
      .then(setDips)
      .finally(() => setLoading(false));
  }, []);

  const handleDipSelect = useCallback((dip: Dip) => {
    setSelectedDip(dip);
  }, []);

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Map className="h-8 w-8 text-primary" />
          {t("map.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("map.subtitle")}</p>
      </div>

      {dips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("map.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <DipMap
            dips={dips}
            selectedDipId={selectedDip?.id ?? null}
            onDipSelect={handleDipSelect}
          />
          <p className="text-sm text-muted-foreground text-center">
            {t("map.hint", { count: dips.length })}
          </p>
          {selectedDip && (
            <DipDetailCard dip={selectedDip} onClose={() => setSelectedDip(null)} />
          )}
        </>
      )}
    </div>
  );
}
