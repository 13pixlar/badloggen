import {
  createDip,
  createPerson,
  deleteDip,
  deletePerson,
  getDip,
  getLeaderboard,
  getSavedLocationsNear,
  listDips,
  listPersons,
  listSavedLocations,
  updateDip,
  type Dip,
  type DipInput,
  type LeaderboardEntry,
  type Person,
} from "@/lib/db/browser-db";
import {
  fetchWeather,
  fetchWeatherAtTime,
  fetchWaterTemperature,
  searchBathingSpots,
  searchNearbyBathingSpots,
  type LocationSuggestion,
  type WeatherData,
} from "@/lib/services/weather";

export type { Person, Dip, DipInput, LeaderboardEntry, LocationSuggestion, WeatherData };

export const api = {
  persons: {
    list: listPersons,
    create: createPerson,
    delete: deletePerson,
  },
  dips: {
    list: listDips,
    get: getDip,
    create: createDip,
    update: updateDip,
    delete: deleteDip,
  },
  leaderboard: {
    get: getLeaderboard,
  },
  locations: {
    search: searchBathingSpots,
    nearby: searchNearbyBathingSpots,
    saved: listSavedLocations,
    savedNear: getSavedLocationsNear,
  },
  weather: {
    get: async (lat: number, lon: number, datetime?: string) => {
      const weather = datetime
        ? await fetchWeatherAtTime(lat, lon, datetime)
        : await fetchWeather(lat, lon);
      const waterTemp = await fetchWaterTemperature(lat, lon);
      return { weather, waterTemp };
    },
  },
};
