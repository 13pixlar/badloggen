"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DipForm } from "@/components/dip-form";
import { DipSuccessScreen } from "@/components/dip-success-screen";
import { t } from "@/lib/i18n";
import { api, type Dip } from "@/lib/api/client";
import { getRandomSuccessMessage } from "@/lib/success-messages";
import { useGroups } from "@/components/group-provider";

export function LogDipPage() {
  const { activeGroupId, activeGroup } = useGroups();
  const [persons, setPersons] = useState<Awaited<ReturnType<typeof api.persons.list>>>([]);
  const [loading, setLoading] = useState(true);
  const [savedDip, setSavedDip] = useState<Dip | null>(null);
  const [successMessage, setSuccessMessage] = useState(getRandomSuccessMessage());

  useEffect(() => {
    if (!activeGroupId) return;
    api.persons
      .list(activeGroupId)
      .then(setPersons)
      .finally(() => setLoading(false));
  }, [activeGroupId]);

  const handleSuccess = (dip: Dip) => {
    setSuccessMessage(getRandomSuccessMessage());
    setSavedDip(dip);
  };

  const handleLogAnother = () => {
    setSavedDip(null);
  };

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  }

  if (persons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">{t("log.noPersons")}</p>
          <Button asChild>
            <Link href="/personer">{t("log.goToPersons")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (savedDip) {
    return (
      <DipSuccessScreen
        dip={savedDip}
        message={successMessage}
        onLogAnother={handleLogAnother}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("log.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {activeGroup
            ? `${t("log.subtitle")} — ${activeGroup.name}`
            : t("log.subtitle")}
        </p>
      </div>
      <DipForm mode="create" onSuccess={handleSuccess} />
    </div>
  );
}
