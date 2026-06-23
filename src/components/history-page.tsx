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
import { ImageLightbox } from "@/components/image-lightbox";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api/client";
import { useGroups } from "@/components/group-provider";
import { ensureLocalUser } from "@/lib/auth/user";

export function HistoryPage() {
  const { activeGroupId, activeGroup } = useGroups();
  const [dips, setDips] = useState<Awaited<ReturnType<typeof api.dips.list>>>([]);
  const [editableDips, setEditableDips] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState("");

  const loadDips = useCallback(() => {
    if (!activeGroupId) return;
    const userId = ensureLocalUser().id;
    api.dips
      .list(activeGroupId)
      .then(async (dipList) => {
        setDips(dipList);
        const editable = new Set<number>();
        for (const dip of dipList) {
          if (await api.dips.canEdit(dip.id, userId)) {
            editable.add(dip.id);
          }
        }
        setEditableDips(editable);
      })
      .finally(() => setLoading(false));
  }, [activeGroupId]);

  useEffect(() => {
    loadDips();
  }, [loadDips]);

  useEffect(() => {
    if (loading) return;

    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("dip-")) return;

    const element = document.getElementById(hash);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "start" });
    element.classList.add("ring-2", "ring-primary");
    const timeout = window.setTimeout(() => {
      element.classList.remove("ring-2", "ring-primary");
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [loading, dips]);

  const handleDelete = async (id: number) => {
    if (!confirm(t("edit.deleteConfirm"))) return;
    try {
      await api.dips.delete(id);
      toast.success(t("edit.deleted"));
      loadDips();
    } catch {
      toast.error(t("edit.forbidden"));
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("history.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {activeGroup
            ? `${t("history.subtitle")} — ${activeGroup.name}`
            : t("history.subtitle")}
        </p>
      </div>

      {dips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("history.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dips.map((dip) => {
            const canEdit = editableDips.has(dip.id);
            return (
              <Card key={dip.id} id={`dip-${dip.id}`} className="scroll-mt-4">
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
                    {canEdit && (
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
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dip.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {dip.images.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setLightboxSrc(src);
                            setLightboxAlt(`${dip.locationName} ${i + 1}`);
                          }}
                          className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <img
                            src={src}
                            alt={`${dip.locationName} ${i + 1}`}
                            className="h-28 w-28 rounded-lg object-cover cursor-zoom-in"
                          />
                        </button>
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
            );
          })}
        </div>
      )}

      <ImageLightbox
        src={lightboxSrc}
        alt={lightboxAlt}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
