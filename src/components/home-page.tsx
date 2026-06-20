"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Medal, Trophy, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { format } from "date-fns";
import { sv as svLocale } from "date-fns/locale";

import { api } from "@/lib/api/client";

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export function HomePage() {
  const [leaderboard, setLeaderboard] = useState<Awaited<ReturnType<typeof api.leaderboard.get>>>([]);
  const [recentDips, setRecentDips] = useState<Awaited<ReturnType<typeof api.dips.list>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.leaderboard.get(), api.dips.list()])
      .then(([lb, dips]) => {
        setLeaderboard(lb);
        setRecentDips(dips.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("home.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("home.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {t("home.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 || leaderboard.every((e) => e.dipCount === 0) ? (
            <p className="text-muted-foreground text-sm">{t("home.emptyLeaderboard")}</p>
          ) : (
            <ol className="space-y-3">
              {leaderboard
                .filter((e) => e.dipCount > 0)
                .map((entry, index) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      {index < 3 ? (
                        <Medal className={`h-6 w-6 ${medalColors[index]}`} />
                      ) : (
                        <span className="w-6 text-center font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    <Badge variant="secondary">
                      {t("home.dipCount", { count: entry.dipCount })}
                    </Badge>
                  </li>
                ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Button asChild size="lg" className="w-full">
        <Link href="/logga">
          <Droplets className="h-5 w-5" />
          {t("home.logDip")}
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t("home.recentDips")}</h2>
        {recentDips.length === 0 ? (
          <p className="text-muted-foreground text-sm mt-3">{t("home.noDips")}</p>
        ) : (
          <ul className="space-y-3 mt-4">
            {recentDips.map((dip) => (
              <li key={dip.id}>
                <Link
                  href={`/historik#dip-${dip.id}`}
                  className="block rounded-lg border p-4 space-y-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{dip.locationName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(dip.dippedAt), "d MMMM yyyy HH:mm", {
                          locale: svLocale,
                        })}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {dip.waterTemp != null && <p>{dip.waterTemp}°C vatten</p>}
                      {dip.airTemp != null && <p>{dip.airTemp}°C luft</p>}
                    </div>
                  </div>
                  {dip.images.length > 0 && (
                    <div className="flex gap-2">
                      {dip.images.slice(0, 3).map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="h-12 w-12 rounded object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {dip.participants.map((p) => (
                      <Badge key={p.id} variant="outline">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
