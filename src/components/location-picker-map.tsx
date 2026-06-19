"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerMapProps {
  initialLat?: number;
  initialLon?: number;
  onConfirm: (lat: number, lon: number, name: string) => void;
  onCancel?: () => void;
}

export function LocationPickerMap({
  initialLat,
  initialLon,
  onConfirm,
  onCancel,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>(
    initialLat !== undefined && initialLon !== undefined
      ? { lat: initialLat, lon: initialLon }
      : null
  );
  const [name, setName] = useState("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] =
      initialLat !== undefined && initialLon !== undefined
        ? [initialLat, initialLon]
        : [62.0, 15.0];

    const map = L.map(containerRef.current, { center, zoom: initialLat ? 14 : 5 });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const placeMarker = (lat: number, lon: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      } else {
        markerRef.current = L.marker([lat, lon], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          setPicked({ lat: pos.lat, lon: pos.lng });
        });
      }
      setPicked({ lat, lon });
    };

    map.on("click", (e) => placeMarker(e.latlng.lat, e.latlng.lng));

    if (initialLat !== undefined && initialLon !== undefined) {
      placeMarker(initialLat, initialLon);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 14);
          placeMarker(latitude, longitude);
        },
        () => {}
      );
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialLat, initialLon]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("log.mapPickerHint")}</p>
      <div ref={containerRef} className="h-64 w-full rounded-xl border z-0" />
      {picked && (
        <p className="text-xs text-muted-foreground">
          {picked.lat.toFixed(5)}, {picked.lon.toFixed(5)}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="mapLocationName">{t("log.locationName")}</Label>
        <Input
          id="mapLocationName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("log.locationNamePlaceholder")}
        />
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
        <Button
          type="button"
          className="flex-1"
          disabled={!picked || !name.trim()}
          onClick={() => picked && onConfirm(picked.lat, picked.lon, name.trim())}
        >
          {t("log.confirmLocation")}
        </Button>
      </div>
    </div>
  );
}
