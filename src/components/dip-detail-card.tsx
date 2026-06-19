"use client";

import { format } from "date-fns";
import { sv as svLocale } from "date-fns/locale";
import Link from "next/link";
import { MapPin, Thermometer, Wind, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherIcon } from "@/components/weather-icon";
import { t } from "@/lib/i18n";
import type { Dip } from "@/lib/api/client";

interface DipDetailCardProps {
  dip: Dip;
  onClose?: () => void;
}

export function DipDetailCard({ dip, onClose }: DipDetailCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {dip.weatherIcon && <WeatherIcon icon={dip.weatherIcon} size="lg" />}
            <div className="min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{dip.locationName}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(dip.dippedAt), "EEEE d MMMM yyyy 'kl.' HH:mm", {
                  locale: svLocale,
                })}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/logga?edit=${dip.id}`} onClick={onClose}>
              <Pencil className="h-4 w-4" />
              {t("edit.title")}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {dip.images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {dip.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${dip.locationName} ${i + 1}`}
                className="h-32 w-32 rounded-lg object-cover shrink-0"
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {dip.weatherDescription && (
            <span className="flex items-center gap-1">
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
        <p className="text-xs text-muted-foreground">
          {dip.latitude.toFixed(5)}, {dip.longitude.toFixed(5)}
        </p>
      </CardContent>
    </Card>
  );
}
