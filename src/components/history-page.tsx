"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { sv as svLocale } from "date-fns/locale";
import { MapPin, Thermometer, Pencil, Trash2, Wind } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WeatherIcon } from "@/components/weather-icon";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api/client";

export function HistoryPage() {
  const [dips, setDips] = useState<Awaited<ReturnType<typeof api.dips.list>>>([]);
  const [loading, setLoading] = useState(true);

  const loadDips = useCallback(() => {
    api.dips
      .list()
      .then(setDips)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDips();
  }, [loadDips]);

  const handleDelete = async (id: number) => {
    if (!confirm(t("edit.deleteConfirm"))) return;
    try {
      await api.dips.delete(id);
      toast.success(t("edit.deleted"));
      loadDips();
    } catch {
      toast.error(t("common.error"));
    }
  };

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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{dip.locationName}</span>
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(dip.dippedAt), "EEEE d MMMM yyyy 'kl.' HH:mm", {
                        locale: svLocale,
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {dip.weatherDescription && (
                      <Badge variant="secondary" className="hidden sm:inline-flex items-center gap-1">
                        <WeatherIcon icon={dip.weatherIcon} size="sm" />
                        {dip.weatherDescription}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/logga?edit=${dip.id}`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">{t("edit.title")}</span>
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(dip.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{t("edit.delete")}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {dip.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {dip.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`${dip.locationName} ${i + 1}`}
                        className="h-28 w-28 rounded-lg object-cover shrink-0"
                      />
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {dip.weatherDescription && (
                    <span className="sm:hidden flex items-center gap-1">
                      <WeatherIcon icon={dip.weatherIcon} size="sm" />
                      {dip.weatherDescription}
                    </span>
                  )}
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
                  {dip.windSpeed != null && (
                    <span className="flex items-center gap-1">
                      <Wind className="h-4 w-4" />
                      {dip.windSpeed} m/s
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
