const SWEDEN_BOUNDS = {
  minLat: 55.0,
  maxLat: 69.5,
  minLon: 10.5,
  maxLon: 24.5,
};

export function isInSweden(lat: number, lon: number): boolean {
  return (
    lat >= SWEDEN_BOUNDS.minLat &&
    lat <= SWEDEN_BOUNDS.maxLat &&
    lon >= SWEDEN_BOUNDS.minLon &&
    lon <= SWEDEN_BOUNDS.maxLon
  );
}

export interface LocationSuggestion {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export async function searchBathingSpots(
  query: string,
  lat?: number,
  lon?: number
): Promise<LocationSuggestion[]> {
  const searchTerm = query.trim() || "badplats";

  // Open-Meteo geocoding (CORS-friendly)
  try {
    const geoParams = new URLSearchParams({
      name: searchTerm,
      count: "10",
      language: "sv",
      format: "json",
      countryCode: "SE",
    });

    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${geoParams}`
    );

    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      const results = (geoData.results ?? []) as Array<{
        name: string;
        latitude: number;
        longitude: number;
        admin1?: string;
        country?: string;
      }>;

      let suggestions = results
        .filter((item) => isInSweden(item.latitude, item.longitude))
        .map((item) => ({
          name: item.name,
          displayName: [item.name, item.admin1, item.country].filter(Boolean).join(", "),
          latitude: item.latitude,
          longitude: item.longitude,
        }));

      if (lat !== undefined && lon !== undefined) {
        suggestions = suggestions.sort((a, b) => {
          const distA = haversineDistance(lat, lon, a.latitude, a.longitude);
          const distB = haversineDistance(lat, lon, b.latitude, b.longitude);
          return distA - distB;
        });
      }

      if (suggestions.length > 0) return suggestions.slice(0, 8);
    }
  } catch {
    // Fall through to Nominatim
  }

  const searchQuery = query.trim()
    ? `${query} badplats Sverige`
    : "badplats Sverige";

  const params = new URLSearchParams({
    q: searchQuery,
    format: "json",
    limit: "8",
    countrycodes: "se",
    addressdetails: "1",
  });

  if (lat !== undefined && lon !== undefined) {
    params.set("viewbox", `${lon - 0.5},${lat + 0.5},${lon + 0.5},${lat - 0.5}`);
    params.set("bounded", "1");
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: { "User-Agent": "Badloggen/1.0 (outdoor bathing log)" },
    }
  );

  if (!response.ok) return [];

  const data = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    name?: string;
    type?: string;
  }>;

  return data
    .filter((item) => {
      const itemLat = parseFloat(item.lat);
      const itemLon = parseFloat(item.lon);
      return isInSweden(itemLat, itemLon);
    })
    .map((item) => ({
      name: item.name ?? item.display_name.split(",")[0],
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
}

export async function searchNearbyBathingSpots(
  lat: number,
  lon: number
): Promise<LocationSuggestion[]> {
  const delta = 0.15;
  const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;

  const queries = ["badplats", "strand", "simstrand", "brygga"];

  const results = await Promise.all(
    queries.map(async (term) => {
      const params = new URLSearchParams({
        q: term,
        format: "json",
        limit: "6",
        countrycodes: "se",
        viewbox,
        bounded: "1",
      });

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "User-Agent": "Badloggen/1.0 (outdoor bathing log)" } }
        );
        if (!response.ok) return [];
        const data = (await response.json()) as Array<{
          display_name: string;
          lat: string;
          lon: string;
          name?: string;
        }>;
        return data
          .filter((item) => isInSweden(parseFloat(item.lat), parseFloat(item.lon)))
          .map((item) => ({
            name: item.name ?? item.display_name.split(",")[0],
            displayName: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          }));
      } catch {
        return [];
      }
    })
  );

  const seen = new Set<string>();
  const merged: LocationSuggestion[] = [];

  for (const batch of results) {
    for (const item of batch) {
      const key = `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
  }

  merged.sort(
    (a, b) =>
      haversineDistance(lat, lon, a.latitude, a.longitude) -
      haversineDistance(lat, lon, b.latitude, b.longitude)
  );

  if (merged.length > 0) return merged.slice(0, 8);

  const reverseName = await reverseGeocode(lat, lon);
  if (reverseName) {
    return [
      {
        name: reverseName.split(",")[0],
        displayName: reverseName,
        latitude: lat,
        longitude: lon,
      },
    ];
  }

  return [
    {
      name: "Min plats",
      displayName: `Min plats (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
      latitude: lat,
      longitude: lon,
    },
  ];
}

export interface WeatherData {
  airTemp: number;
  description: string;
  icon: string;
  windSpeed: number;
}

const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: "Klart", icon: "clear" },
  1: { description: "Mestadels klart", icon: "partly-cloudy" },
  2: { description: "Delvis molnigt", icon: "partly-cloudy" },
  3: { description: "Molnigt", icon: "cloudy" },
  45: { description: "Dimma", icon: "fog" },
  48: { description: "Rimfrost", icon: "fog" },
  51: { description: "Lätt duggregn", icon: "drizzle" },
  53: { description: "Duggregn", icon: "drizzle" },
  55: { description: "Kraftigt duggregn", icon: "drizzle" },
  61: { description: "Lätt regn", icon: "rain" },
  63: { description: "Regn", icon: "rain" },
  65: { description: "Kraftigt regn", icon: "rain" },
  71: { description: "Lätt snöfall", icon: "snow" },
  73: { description: "Snöfall", icon: "snow" },
  75: { description: "Kraftigt snöfall", icon: "snow" },
  80: { description: "Lätta regnskurar", icon: "rain" },
  81: { description: "Regnskurar", icon: "rain" },
  82: { description: "Kraftiga regnskurar", icon: "rain" },
  95: { description: "Åska", icon: "thunderstorm" },
  96: { description: "Åska med hagel", icon: "thunderstorm" },
  99: { description: "Åska med kraftigt hagel", icon: "thunderstorm" },
};

export async function fetchWeather(
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: "temperature_2m,weather_code,wind_speed_10m",
    timezone: "Europe/Stockholm",
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );

  if (!response.ok) return null;

  const data = await response.json();
  const current = data.current;
  const code = current.weather_code as number;
  const weather = WMO_CODES[code] ?? { description: "Okänt", icon: "cloudy" };

  return {
    airTemp: current.temperature_2m,
    description: weather.description,
    icon: weather.icon,
    windSpeed: current.wind_speed_10m,
  };
}

export async function fetchWaterTemperature(
  lat: number,
  lon: number
): Promise<number | null> {
  // Try Open-Meteo marine API for coastal areas
  try {
    const marineParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: "sea_surface_temperature",
      timezone: "Europe/Stockholm",
    });

    const marineResponse = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${marineParams}`
    );

    if (marineResponse.ok) {
      const marineData = await marineResponse.json();
      const seaTemp = marineData.current?.sea_surface_temperature;
      if (seaTemp !== null && seaTemp !== undefined) {
        return Math.round(seaTemp * 10) / 10;
      }
    }
  } catch {
    // Fall through to SMHI
  }

  // Fallback: SMHI nearest oceanographic station
  try {
    const smhiResponse = await fetch(
      "https://opendata-download-ocobs.smhi.se/api/version/latest/parameter/1/station-set/all/period/latest-months/data.json"
    );

    if (smhiResponse.ok) {
      const smhiData = await smhiResponse.json();
      const stations = smhiData.station as Array<{
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        value: Array<{ date: string; value: string }>;
      }>;

      let nearest: { temp: number; dist: number } | null = null;

      for (const station of stations) {
        if (!station.value?.length) continue;
        const latest = station.value[station.value.length - 1];
        const temp = parseFloat(latest.value);
        if (isNaN(temp)) continue;

        const dist = haversineDistance(lat, lon, station.latitude, station.longitude);
        if (!nearest || dist < nearest.dist) {
          nearest = { temp, dist };
        }
      }

      if (nearest && nearest.dist < 100) {
        return Math.round(nearest.temp * 10) / 10;
      }
    }
  } catch {
    // No water temp available
  }

  return null;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    format: "json",
    zoom: "14",
    addressdetails: "1",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
    {
      headers: { "User-Agent": "Badloggen/1.0 (outdoor bathing log)" },
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  return data.display_name ?? null;
}
