"use client";

import Link from "next/link";
import { format } from "date-fns";
import { sv as svLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import type { Dip } from "@/lib/api/client";

interface DipSuccessScreenProps {
  dip: Dip;
  message: { emoji: string; title: string; subtitle: string };
  onLogAnother: () => void;
}

export function DipSuccessScreen({ dip, message, onLogAnother }: DipSuccessScreenProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 animate-in fade-in duration-500">
      <div className="text-7xl animate-bounce">{message.emoji}</div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{message.title}</h1>
        <p className="text-muted-foreground text-lg">{message.subtitle}</p>
      </div>

      <Card className="w-full text-left">
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("success.location")}</p>
            <p className="font-semibold text-lg">{dip.locationName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("success.when")}</p>
            <p className="font-medium">
              {format(new Date(dip.dippedAt), "EEEE d MMMM yyyy 'kl.' HH:mm", {
                locale: svLocale,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dip.participants.map((p) => (
              <Badge key={p.id} variant="secondary">
                {p.name}
              </Badge>
            ))}
          </div>
          {(dip.waterTemp != null || dip.airTemp != null || dip.weatherDescription) && (
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {dip.weatherDescription && (
                <span>{dip.weatherDescription}</span>
              )}
              {dip.airTemp != null && <span>{dip.airTemp}°C luft</span>}
              {dip.waterTemp != null && <span>{dip.waterTemp}°C vatten</span>}
            </div>
          )}
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

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button onClick={onLogAnother} className="flex-1" size="lg">
          {t("success.logAnother")}
        </Button>
        <Button asChild variant="outline" className="flex-1" size="lg">
          <Link href="/historik">{t("success.viewHistory")}</Link>
        </Button>
      </div>
    </div>
  );
}
