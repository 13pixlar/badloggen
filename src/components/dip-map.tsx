"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { Dip } from "@/lib/api/client";

// Fix Leaflet default icon paths in bundlers
const iconRetina = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const icon = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadow = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: icon,
  shadowUrl: shadow,
});

interface DipMapProps {
  dips: Dip[];
  selectedDipId?: number | null;
  onDipSelect: (dip: Dip) => void;
}

export function DipMap({ dips, selectedDipId, onDipSelect }: DipMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = [62.0, 15.0];
    const map = L.map(containerRef.current, {
      center: dips.length
        ? [dips[0].latitude, dips[0].longitude]
        : defaultCenter,
      zoom: dips.length ? 8 : 5,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (dips.length === 0) return;

    const heatPoints: [number, number, number][] = dips.map((d) => [
      d.latitude,
      d.longitude,
      1,
    ]);

    heatLayerRef.current = (
    L as typeof L & {
      heatLayer: (
        latlngs: [number, number, number][],
        options?: object
      ) => L.Layer;
    }
  ).heatLayer(heatPoints, {
      radius: 28,
      blur: 22,
      maxZoom: 12,
      gradient: {
        0.2: "#7dd3fc",
        0.5: "#38bdf8",
        0.8: "#0284c7",
        1.0: "#0c4a6e",
      },
    });
    map.addLayer(heatLayerRef.current);

    dips.forEach((dip) => {
      const marker = L.marker([dip.latitude, dip.longitude], {
        opacity: selectedDipId === dip.id ? 1 : 0.85,
      });
      marker.bindTooltip(dip.locationName, { direction: "top" });
      marker.on("click", () => onDipSelect(dip));
      markers.addLayer(marker);
    });

    const bounds = L.latLngBounds(dips.map((d) => [d.latitude, d.longitude]));
    map.fitBounds(bounds.pad(0.2));
  }, [dips, selectedDipId, onDipSelect]);

  return (
    <div
      ref={containerRef}
      className="h-[min(60vh,500px)] w-full rounded-xl border z-0"
    />
  );
}
