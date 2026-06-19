"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

import { api, type LocationSuggestion } from "@/lib/api/client";

export function LogDipPage() {
  const [persons, setPersons] = useState<Awaited<ReturnType<typeof api.persons.list>>>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [dippedAt, setDippedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [waterTemp, setWaterTemp] = useState<string>("");
  const [airTemp, setAirTemp] = useState<string>("");
  const [weatherDescription, setWeatherDescription] = useState("");
  const [weatherIcon, setWeatherIcon] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    api.persons
      .list()
      .then(setPersons)
      .finally(() => setLoading(false));
  }, []);

  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    setFetchingWeather(true);
    try {
      const data = await api.weather.get(lat, lon);
      if (data.weather) {
        setAirTemp(data.weather.airTemp.toString());
        setWeatherDescription(data.weather.description);
        setWeatherIcon(data.weather.icon);
      }
      if (data.waterTemp != null) {
        setWaterTemp(data.waterTemp.toString());
      }
    } catch {
      // Weather is optional
    } finally {
      setFetchingWeather(false);
    }
  }, []);

  const selectLocation = (loc: LocationSuggestion) => {
    setSelectedLocation(loc);
    setLocationQuery(loc.name);
    setShowSuggestions(false);
    fetchWeatherData(loc.latitude, loc.longitude);
  };

  useEffect(() => {
    if (!locationQuery.trim() || selectedLocation?.name === locationQuery) return;

    const timer = setTimeout(() => {
      api.locations
        .search(locationQuery, selectedLocation?.latitude, selectedLocation?.longitude)
        .then((data) => {
          setSuggestions(data);
          setShowSuggestions(true);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [locationQuery, selectedLocation]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Plats stöds inte i din webbläsare");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const data = await api.locations.search("", latitude, longitude);

        if (data.length > 0) {
          selectLocation(data[0]);
        } else {
          const loc: LocationSuggestion = {
            name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            displayName: `Min plats (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            latitude,
            longitude,
          };
          selectLocation(loc);
        }
      },
      () => toast.error("Kunde inte hämta din plats")
    );
  };

  const togglePerson = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocation) {
      toast.error("Välj en badplats");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error(t("log.selectParticipants"));
      return;
    }

    setSubmitting(true);
    try {
      await api.dips.create({
        locationName: selectedLocation.displayName,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        waterTemp: waterTemp ? parseFloat(waterTemp) : null,
        airTemp: airTemp ? parseFloat(airTemp) : null,
        weatherDescription: weatherDescription || null,
        weatherIcon: weatherIcon || null,
        dippedAt: new Date(dippedAt).toISOString(),
        notes: notes || null,
        participantIds: selectedIds,
      });
      toast.success(t("log.success"));

      setSelectedIds([]);
      setLocationQuery("");
      setSelectedLocation(null);
      setWaterTemp("");
      setAirTemp("");
      setWeatherDescription("");
      setNotes("");
      setDippedAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    } catch {
      toast.error(t("log.error"));
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("log.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("log.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("log.location")}
            </CardTitle>
            <CardDescription>{t("log.suggestions")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    setSelectedLocation(null);
                  }}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder={t("log.locationPlaceholder")}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-auto">
                    {suggestions.map((s, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => selectLocation(s)}
                        >
                          <span className="font-medium">{s.name}</span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {s.displayName}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button type="button" variant="outline" onClick={handleUseMyLocation}>
                <Navigation className="h-4 w-4" />
                <span className="hidden sm:inline">{t("log.useMyLocation")}</span>
              </Button>
            </div>

            {selectedLocation && (
              <p className="text-sm text-muted-foreground">
                {selectedLocation.displayName}
              </p>
            )}

            {fetchingWeather && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("log.fetchingWeather")}
              </p>
            )}

            {weatherDescription && (
              <Badge variant="secondary">{weatherDescription}</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{t("log.participants")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {persons.map((person) => (
                <label
                  key={person.id}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50"
                >
                  <Checkbox
                    checked={selectedIds.includes(person.id)}
                    onCheckedChange={() => togglePerson(person.id)}
                  />
                  <span>{person.name}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dippedAt">{t("log.date")}</Label>
              <Input
                id="dippedAt"
                type="datetime-local"
                value={dippedAt}
                onChange={(e) => setDippedAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waterTemp">{t("log.waterTemp")}</Label>
              <Input
                id="waterTemp"
                type="number"
                step="0.1"
                value={waterTemp}
                onChange={(e) => setWaterTemp(e.target.value)}
                placeholder="t.ex. 18.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airTemp">{t("log.airTemp")}</Label>
              <Input
                id="airTemp"
                type="number"
                step="0.1"
                value={airTemp}
                onChange={(e) => setAirTemp(e.target.value)}
                placeholder="t.ex. 22"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">{t("log.notes")}</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("log.notesPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="mt-6 w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            t("log.submit")
          )}
        </Button>
      </form>
    </div>
  );
}
