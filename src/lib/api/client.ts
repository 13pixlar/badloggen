import {
  createDip,
  createPerson,
  deletePerson,
  getLeaderboard,
  listDips,
  listPersons,
  type Dip,
  type LeaderboardEntry,
  type Person,
} from "@/lib/db/browser-db";
import {
  fetchWeather,
  fetchWaterTemperature,
  searchBathingSpots,
  type LocationSuggestion,
  type WeatherData,
} from "@/lib/services/weather";

export type { Person, Dip, LeaderboardEntry, LocationSuggestion, WeatherData };

export const api = {
  persons: {
    list: listPersons,
    create: createPerson,
    delete: deletePerson,
  },
  dips: {
    list: listDips,
    create: createDip,
  },
  leaderboard: {
    get: getLeaderboard,
  },
  locations: {
    search: searchBathingSpots,
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
