"use client";

import { useEffect, useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { format } from "date-fns";
import { sv as svLocale } from "date-fns/locale";

interface LeaderboardEntry {
  id: number;
  name: string;
  dipCount: number;
}

interface Dip {
  id: number;
  locationName: string;
  dippedAt: string;
  waterTemp: number | null;
  airTemp: number | null;
  weatherDescription: string | null;
  participants: Array<{ id: number; name: string }>;
}

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export function HomePage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentDips, setRecentDips] = useState<Dip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/leaderboard").then((r) => r.json()),
      fetch("/api/dips").then((r) => r.json()),
    ])
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

      <Card>
        <CardHeader>
          <CardTitle>{t("home.recentDips")}</CardTitle>
          <CardDescription>{t("app.tagline")}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentDips.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("home.noDips")}</p>
          ) : (
            <ul className="space-y-3">
              {recentDips.map((dip) => (
                <li key={dip.id} className="rounded-lg border p-4 space-y-2">
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
                  <div className="flex flex-wrap gap-1">
                    {dip.participants.map((p) => (
                      <Badge key={p.id} variant="outline">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
