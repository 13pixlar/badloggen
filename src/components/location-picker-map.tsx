"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { t } from "@/lib/i18n";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerMapProps {
  lat?: number | null;
  lon?: number | null;
  onCoordsChange: (lat: number, lon: number) => void;
  defaultCenterLat?: number;
  defaultCenterLon?: number;
}

export function LocationPickerMap({
  lat,
  lon,
  onCoordsChange,
  defaultCenterLat,
  defaultCenterLon,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onCoordsChangeRef = useRef(onCoordsChange);

  useEffect(() => {
    onCoordsChangeRef.current = onCoordsChange;
  }, [onCoordsChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const hasCenter = defaultCenterLat !== undefined && defaultCenterLon !== undefined;
    const center: [number, number] =
      lat != null && lon != null
        ? [lat, lon]
        : hasCenter
          ? [defaultCenterLat, defaultCenterLon]
          : [62.0, 15.0];

    const map = L.map(containerRef.current, {
      center,
      zoom: lat != null && lon != null ? 14 : hasCenter ? 14 : 5,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const placeMarker = (markerLat: number, markerLon: number, notify = true) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([markerLat, markerLon]);
      } else {
        markerRef.current = L.marker([markerLat, markerLon], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onCoordsChangeRef.current(pos.lat, pos.lng);
        });
      }
      if (notify) {
        onCoordsChangeRef.current(markerLat, markerLon);
      }
    };

    const removeMarker = () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };

    map.on("click", (e) => placeMarker(e.latlng.lat, e.latlng.lng));

    if (lat != null && lon != null) {
      placeMarker(lat, lon, false);
    } else if (hasCenter) {
      map.setView([defaultCenterLat, defaultCenterLon], 14);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 14);
        },
        () => {}
      );
    }

    mapRef.current = map;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lat != null && lon != null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      } else {
        markerRef.current = L.marker([lat, lon], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onCoordsChangeRef.current(pos.lat, pos.lng);
        });
      }
      map.setView([lat, lon], Math.max(map.getZoom(), 13), { animate: true });
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat, lon]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t("log.mapPickerHint")}</p>
      <div ref={containerRef} className="h-64 w-full rounded-xl border z-0" />
      {lat != null && lon != null && (
        <p className="text-xs text-muted-foreground">
          {lat.toFixed(5)}, {lon.toFixed(5)}
        </p>
      )}
    </div>
  );
}
