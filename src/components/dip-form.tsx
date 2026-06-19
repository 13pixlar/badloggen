"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MapPin,
  Navigation,
  Loader2,
  Camera,
  X,
  Cloud,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { api, type Dip, type LocationSuggestion } from "@/lib/api/client";
import { processImageFiles, MAX_IMAGES } from "@/lib/images";

interface DipFormProps {
  mode: "create" | "edit";
  initialDip?: Dip;
  onSuccess: (dip: Dip) => void;
  onCancel?: () => void;
}

export function DipForm({ mode, initialDip, onSuccess, onCancel }: DipFormProps) {
  const [persons, setPersons] = useState<Awaited<ReturnType<typeof api.persons.list>>>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbySuggestions, setNearbySuggestions] = useState<LocationSuggestion[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<LocationSuggestion[]>([]);
  const [recentLocations, setRecentLocations] = useState<
    Array<{ name: string; latitude: number; longitude: number }>
  >([]);
  const [dippedAt, setDippedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [waterTemp, setWaterTemp] = useState("");
  const [airTemp, setAirTemp] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [weatherDescription, setWeatherDescription] = useState("");
  const [weatherIcon, setWeatherIcon] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [fetchingNearby, setFetchingNearby] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    setFetchingWeather(true);
    try {
      const data = await api.weather.get(lat, lon);
      if (data.weather) {
        setAirTemp(data.weather.airTemp.toString());
        setWeatherDescription(data.weather.description);
        setWeatherIcon(data.weather.icon);
        setWindSpeed(data.weather.windSpeed.toString());
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

  const selectLocation = useCallback(
    (loc: LocationSuggestion) => {
      setCoords({ lat: loc.latitude, lon: loc.longitude });
      setLocationName(loc.name);
      setLocationQuery(loc.name);
      setShowSearchSuggestions(false);
      fetchWeatherData(loc.latitude, loc.longitude);
    },
    [fetchWeatherData]
  );

  const loadNearbySuggestions = useCallback(async (lat: number, lon: number) => {
    setFetchingNearby(true);
    try {
      const nearby = await api.locations.nearby(lat, lon);
      setNearbySuggestions(nearby);
    } catch {
      setNearbySuggestions([]);
    } finally {
      setFetchingNearby(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([api.persons.list(), api.locations.recent()])
      .then(([personsList, recent]) => {
        setPersons(personsList);
        setRecentLocations(recent);

        if (initialDip) {
          setSelectedIds(initialDip.participants.map((p) => p.id));
          setLocationName(initialDip.locationName);
          setLocationQuery(initialDip.locationName);
          setCoords({ lat: initialDip.latitude, lon: initialDip.longitude });
          setDippedAt(format(new Date(initialDip.dippedAt), "yyyy-MM-dd'T'HH:mm"));
          setWaterTemp(initialDip.waterTemp?.toString() ?? "");
          setAirTemp(initialDip.airTemp?.toString() ?? "");
          setWindSpeed(initialDip.windSpeed?.toString() ?? "");
          setWeatherDescription(initialDip.weatherDescription ?? "");
          setWeatherIcon(initialDip.weatherIcon ?? "");
          setNotes(initialDip.notes ?? "");
          setImages(initialDip.images);
        }
      })
      .finally(() => setLoading(false));

    if (mode === "create" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lon: longitude });
          loadNearbySuggestions(latitude, longitude);
        },
        () => {
          // Geolocation denied – user can search manually
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [initialDip, mode, loadNearbySuggestions]);

  useEffect(() => {
    if (!locationQuery.trim() || locationQuery === locationName) return;

    const timer = setTimeout(() => {
      api.locations
        .search(locationQuery, coords?.lat, coords?.lon)
        .then((data) => {
          setSearchSuggestions(data);
          setShowSearchSuggestions(true);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [locationQuery, locationName, coords]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("log.geolocationUnsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lon: longitude });
        await loadNearbySuggestions(latitude, longitude);
      },
      () => toast.error(t("log.geolocationFailed"))
    );
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(t("log.maxImages", { count: MAX_IMAGES }));
      return;
    }

    try {
      const sliced = Array.from(files).slice(0, remaining);
      const dt = new DataTransfer();
      sliced.forEach((f) => dt.items.add(f));
      const compressed = await processImageFiles(dt.files);
      setImages((prev) => [...prev, ...compressed]);
    } catch {
      toast.error(t("log.imageError"));
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const togglePerson = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coords || !locationName.trim()) {
      toast.error(t("log.selectLocation"));
      return;
    }

    if (selectedIds.length === 0) {
      toast.error(t("log.selectParticipants"));
      return;
    }

    const payload = {
      locationName: locationName.trim(),
      latitude: coords.lat,
      longitude: coords.lon,
      waterTemp: waterTemp ? parseFloat(waterTemp) : null,
      airTemp: airTemp ? parseFloat(airTemp) : null,
      windSpeed: windSpeed ? parseFloat(windSpeed) : null,
      weatherDescription: weatherDescription || null,
      weatherIcon: weatherIcon || null,
      dippedAt: new Date(dippedAt).toISOString(),
      notes: notes || null,
      images,
      participantIds: selectedIds,
    };

    setSubmitting(true);
    try {
      const dip =
        mode === "edit" && initialDip
          ? await api.dips.update(initialDip.id, payload)
          : await api.dips.create(payload);
      onSuccess(dip);
    } catch {
      toast.error(mode === "edit" ? t("edit.error") : t("log.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("log.location")}
          </CardTitle>
          <CardDescription>{t("log.locationHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(fetchingNearby || nearbySuggestions.length > 0) && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                {t("log.nearbySuggestions")}
              </p>
              {fetchingNearby ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("log.fetchingNearby")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nearbySuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectLocation(s)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                        coords?.lat === s.latitude && coords?.lon === s.longitude
                          ? "bg-primary text-primary-foreground border-primary"
                          : ""
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {recentLocations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("log.recentLocations")}</p>
              <div className="flex flex-wrap gap-2">
                {recentLocations.map((loc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      selectLocation({
                        name: loc.name,
                        displayName: loc.name,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                      })
                    }
                    className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onFocus={() => searchSuggestions.length > 0 && setShowSearchSuggestions(true)}
                placeholder={t("log.locationPlaceholder")}
              />
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-48 overflow-auto">
                  {searchSuggestions.map((s, i) => (
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
              <span className="hidden sm:inline">{t("log.refreshLocation")}</span>
            </Button>
          </div>

          {coords && (
            <div className="space-y-2">
              <Label htmlFor="locationName">{t("log.locationName")}</Label>
              <Input
                id="locationName"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder={t("log.locationNamePlaceholder")}
                required
              />
              <p className="text-xs text-muted-foreground">
                {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
                {userCoords && (
                  <span>
                    {" "}
                    · {t("log.distanceAway", {
                      km: (
                        Math.round(
                          haversineKm(userCoords.lat, userCoords.lon, coords.lat, coords.lon) * 10
                        ) / 10
                      ).toString(),
                    })}
                  </span>
                )}
              </p>
            </div>
          )}

          {fetchingWeather && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("log.fetchingWeather")}
            </p>
          )}

          {weatherDescription && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                {weatherDescription}
              </Badge>
              {windSpeed && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  {windSpeed} m/s
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
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

      <Card>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t("log.images")}
          </CardTitle>
          <CardDescription>
            {t("log.imagesHint", { count: MAX_IMAGES })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt={`Bild ${i + 1}`}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1 shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < MAX_IMAGES && (
            <div>
              <input
                id="dip-images"
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button type="button" variant="outline" asChild>
                <label htmlFor="dip-images" className="cursor-pointer">
                  <Camera className="h-4 w-4" />
                  {t("log.addImages")}
                </label>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" size="lg" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          size="lg"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : mode === "edit" ? (
            t("edit.save")
          ) : (
            t("log.submit")
          )}
        </Button>
      </div>
    </form>
  );
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
