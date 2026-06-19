"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

import { api } from "@/lib/api/client";

export function PersonsPage() {
  const [persons, setPersons] = useState<Awaited<ReturnType<typeof api.persons.list>>>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPersons = () => {
    api.persons
      .list()
      .then(setPersons)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPersons();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await api.persons.create(name);
      setName("");
      toast.success(t("persons.added"));
      loadPersons();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.persons.delete(id);
      toast.success(t("persons.deleted"));
      loadPersons();
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
        <h1 className="text-3xl font-bold tracking-tight">{t("persons.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("persons.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("persons.add")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("persons.namePlaceholder")}
              className="flex-1"
            />
            <Button type="submit" disabled={submitting || !name.trim()}>
              <Plus className="h-4 w-4" />
              {t("persons.add")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {persons.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              {t("persons.empty")}
            </p>
          ) : (
            <ul className="divide-y">
              {persons.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <span className="font-medium">{person.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(person.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t("persons.delete")}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
