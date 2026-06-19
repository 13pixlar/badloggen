"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { sv as svLocale } from "date-fns/locale";
import { MapPin, Thermometer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

import { api } from "@/lib/api/client";

export function HistoryPage() {
  const [dips, setDips] = useState<Awaited<ReturnType<typeof api.dips.list>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dips
      .list()
      .then(setDips)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("history.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("history.subtitle")}</p>
      </div>

      {dips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("history.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dips.map((dip) => (
            <Card key={dip.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {dip.locationName.split(",")[0]}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(dip.dippedAt), "EEEE d MMMM yyyy 'kl.' HH:mm", {
                        locale: svLocale,
                      })}
                    </CardDescription>
                  </div>
                  {dip.weatherDescription && (
                    <Badge variant="secondary">{dip.weatherDescription}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {dip.waterTemp != null && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-4 w-4" />
                      {t("history.water")}: {dip.waterTemp}°C
                    </span>
                  )}
                  {dip.airTemp != null && (
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-4 w-4" />
                      {t("history.air")}: {dip.airTemp}°C
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">{t("history.participants")}</p>
                  <div className="flex flex-wrap gap-1">
                    {dip.participants.map((p) => (
                      <Badge key={p.id} variant="outline">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                {dip.notes && (
                  <p className="text-sm text-muted-foreground italic">{dip.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
