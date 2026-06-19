"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { sv as svLocale } from "date-fns/locale";
import { MapPin, Calendar, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeatherIcon } from "@/components/weather-icon";
import { t } from "@/lib/i18n";
import type { Dip } from "@/lib/api/client";

interface DipSuccessScreenProps {
  dip: Dip;
  message: { emoji: string; title: string; subtitle: string };
  onLogAnother: () => void;
}

export function DipSuccessScreen({ dip, message, onLogAnother }: DipSuccessScreenProps) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  return (
    <div className="flex flex-col items-center text-center space-y-5 py-4 animate-in fade-in duration-500">
      <div className="text-6xl sm:text-7xl animate-bounce">{message.emoji}</div>
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{message.title}</h1>
        <p className="text-muted-foreground text-base sm:text-lg">{message.subtitle}</p>
      </div>

      <div className="w-full space-y-3 text-left">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
              <MapPin className="h-4 w-4" />
              {t("success.location")}
            </p>
            <p className="font-semibold text-lg">{dip.locationName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4" />
              {t("success.when")}
            </p>
            <p className="font-medium">
              {format(new Date(dip.dippedAt), "EEEE d MMMM yyyy 'kl.' HH:mm", {
                locale: svLocale,
              })}
            </p>
          </CardContent>
        </Card>

        {(dip.waterTemp != null || dip.airTemp != null || dip.weatherDescription) && (
          <Card>
            <CardContent className="pt-5 pb-5 space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Cloud className="h-4 w-4" />
                {t("log.weather")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {dip.weatherDescription && (
                  <>
                    <WeatherIcon icon={dip.weatherIcon} size="sm" />
                    <span className="font-medium">{dip.weatherDescription}</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {dip.airTemp != null && <span>{dip.airTemp}°C luft</span>}
                {dip.waterTemp != null && <span>{dip.waterTemp}°C vatten</span>}
                {dip.windSpeed != null && <span>{dip.windSpeed} m/s vind</span>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              {dip.participants.map((p) => (
                <Badge key={p.id} variant="secondary">
                  {p.name}
                </Badge>
              ))}
            </div>
            {dip.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {dip.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Bad ${i + 1}`}
                    className="h-20 w-20 rounded-lg object-cover shrink-0"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center w-full pt-2">
        <Button onClick={onLogAnother} size="default" className="w-auto min-w-[10rem]">
          {t("success.logAnother")}
        </Button>
        <Button asChild variant="outline" size="default" className="w-auto min-w-[10rem]">
          <Link href="/historik">{t("success.viewHistory")}</Link>
        </Button>
      </div>
    </div>
  );
}
