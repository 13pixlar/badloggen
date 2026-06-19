import {
  createDip,
  createPerson,
  deleteDip,
  deletePerson,
  getDip,
  getLeaderboard,
  getRecentLocations,
  listDips,
  listPersons,
  updateDip,
  type Dip,
  type DipInput,
  type LeaderboardEntry,
  type Person,
} from "@/lib/db/browser-db";
import {
  fetchWeather,
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
    recent: getRecentLocations,
  },
  weather: {
    get: async (lat: number, lon: number) => {
      const [weather, waterTemp] = await Promise.all([
        fetchWeather(lat, lon),
        fetchWaterTemperature(lat, lon),
      ]);
      return { weather, waterTemp };
    },
  },
};
