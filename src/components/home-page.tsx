"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Medal, Trophy, Droplets, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { format } from "date-fns";
import { sv as svLocale } from "date-fns/locale";

import { api } from "@/lib/api/client";
import { useGroups } from "@/components/group-provider";

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

function LeaderboardList({
  entries,
  emptyText,
}: {
  entries: Awaited<ReturnType<typeof api.leaderboard.getGlobal>>;
  emptyText: string;
}) {
  if (entries.length === 0 || entries.every((e) => e.dipCount === 0)) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  }

  return (
    <ol className="space-y-3">
      {entries
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
  );
}

export function HomePage() {
  const { activeGroupId, activeGroup } = useGroups();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<
    Awaited<ReturnType<typeof api.leaderboard.getGlobal>>
  >([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState<
    Awaited<ReturnType<typeof api.leaderboard.get>>
  >([]);
  const [recentDips, setRecentDips] = useState<Awaited<ReturnType<typeof api.dips.list>>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!activeGroupId) return;
    setLoading(true);
    Promise.all([
      api.leaderboard.getGlobal(),
      api.leaderboard.get(activeGroupId),
      api.dips.list(activeGroupId),
    ])
      .then(([globalLb, groupLb, dips]) => {
        setGlobalLeaderboard(globalLb);
        setGroupLeaderboard(groupLb);
        setRecentDips(dips.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, [activeGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            <Globe className="h-5 w-5 text-primary" />
            {t("home.globalTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("home.globalSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <LeaderboardList
            entries={globalLeaderboard}
            emptyText={t("home.emptyLeaderboard")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {t("home.groupTitle")}
            {activeGroup && (
              <Badge variant="outline" className="font-normal">
                {activeGroup.name}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("home.groupSubtitle")}</p>
        </CardHeader>
        <CardContent>
          <LeaderboardList
            entries={groupLeaderboard}
            emptyText={t("home.emptyLeaderboard")}
          />
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
