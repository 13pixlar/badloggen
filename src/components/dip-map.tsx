"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { Dip } from "@/lib/api/client";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface DipMapProps {
  dips: Dip[];
  selectedDipId?: number | null;
  onDipSelect: (dip: Dip) => void;
}

interface LocationCluster {
  lat: number;
  lon: number;
  count: number;
  dips: Dip[];
}

function clusterDips(dips: Dip[]): LocationCluster[] {
  const clusters = new Map<string, LocationCluster>();

  for (const dip of dips) {
    const key = `${dip.latitude.toFixed(4)},${dip.longitude.toFixed(4)}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.count += 1;
      existing.dips.push(dip);
    } else {
      clusters.set(key, {
        lat: dip.latitude,
        lon: dip.longitude,
        count: 1,
        dips: [dip],
      });
    }
  }

  return Array.from(clusters.values());
}

function countIcon(count: number) {
  return L.divIcon({
    className: "badloggen-count-marker",
    html: `<div style="
      background: #38bdf8;
      color: white;
      border: 2px solid white;
      border-radius: 50%;
      width: ${count > 1 ? 32 : 28}px;
      height: ${count > 1 ? 32 : 28}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${count > 1 ? 13 : 0}px;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${count > 1 ? count : "💧"}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
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
      center: dips.length ? [dips[0].latitude, dips[0].longitude] : defaultCenter,
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

    const clusters = clusterDips(dips);

    const heatPoints: [number, number, number][] = clusters.map((c) => [
      c.lat,
      c.lon,
      c.count,
    ]);

    heatLayerRef.current = (
      L as typeof L & {
        heatLayer: (latlngs: [number, number, number][], options?: object) => L.Layer;
      }
    ).heatLayer(heatPoints, {
      radius: 30,
      blur: 20,
      maxZoom: 14,
      max: Math.max(...clusters.map((c) => c.count), 1),
      gradient: {
        0.2: "#7dd3fc",
        0.5: "#38bdf8",
        0.8: "#0284c7",
        1.0: "#0c4a6e",
      },
    });
    map.addLayer(heatLayerRef.current);

    clusters.forEach((cluster) => {
      const label =
        cluster.count > 1
          ? `${cluster.dips[0].locationName} (${cluster.count} bad)`
          : cluster.dips[0].locationName;

      const marker = L.marker([cluster.lat, cluster.lon], {
        icon: countIcon(cluster.count),
      });
      marker.bindTooltip(label, { direction: "top" });
      marker.on("click", () => {
        const selected =
          cluster.dips.find((d) => d.id === selectedDipId) ?? cluster.dips[0];
        onDipSelect(selected);
      });
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
