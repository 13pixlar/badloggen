import {
  createDip,
  createPerson,
  createGroup,
  deleteDip,
  deletePerson,
  deleteGroup,
  getDip,
  getLeaderboard,
  getSavedLocationsNear,
  listDips,
  listPersons,
  listGroups,
  listSavedLocations,
  getGroup,
  getDefaultGroupId,
  updateDip,
  updateGroup,
  canEditDip,
  canEditGroup,
  type Dip,
  type DipInput,
  type LeaderboardEntry,
  type Person,
  type Group,
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
import { ensureLocalUser } from "@/lib/auth/user";
import {
  pushDipDeleteToSharedGroup,
  pushDipToSharedGroup,
  pushDipUpdateToSharedGroup,
  pushGroupDelete,
  pushGroupNameUpdate,
  pushPersonDeleteFromSharedGroup,
  pushPersonToSharedGroup,
  shareGroup,
  joinGroup,
  syncGroupFromServer,
} from "@/lib/groups/sync";

export type { Person, Dip, DipInput, LeaderboardEntry, LocationSuggestion, WeatherData, Group };

async function getActiveGroupIdOrDefault(groupId?: string): Promise<string> {
  if (groupId) return groupId;
  return getDefaultGroupId();
}

async function maybeSyncSharedGroup(groupId: string): Promise<void> {
  const group = await getGroup(groupId);
  if (group?.isShared) {
    await syncGroupFromServer(groupId, group.updatedAt);
  }
}

export const api = {
  groups: {
    list: listGroups,
    get: getGroup,
    getDefaultId: getDefaultGroupId,
    create: async (name: string) => {
      const user = ensureLocalUser();
      return createGroup(name, user.id);
    },
    update: async (id: string, name: string) => {
      const canEdit = await canEditGroup(id);
      if (!canEdit) throw new Error("FORBIDDEN");
      const group = await getGroup(id);
      await updateGroup(id, { name });
      if (group?.isShared) {
        await pushGroupNameUpdate(id, name);
      }
    },
    delete: async (id: string) => {
      const canEdit = await canEditGroup(id);
      if (!canEdit) throw new Error("FORBIDDEN");
      const group = await getGroup(id);
      if (group?.isShared) {
        await pushGroupDelete(id);
      }
      await deleteGroup(id);
    },
    share: shareGroup,
    join: joinGroup,
    sync: syncGroupFromServer,
  },
  persons: {
    list: async (groupId?: string) => {
      const gid = await getActiveGroupIdOrDefault(groupId);
      await maybeSyncSharedGroup(gid);
      return listPersons(gid);
    },
    create: async (name: string, groupId?: string) => {
      const gid = await getActiveGroupIdOrDefault(groupId);
      const user = ensureLocalUser();
      const person = await createPerson(name, gid, user.id);
      const group = await getGroup(gid);
      if (group?.isShared) {
        await pushPersonToSharedGroup(gid, person);
        await syncGroupFromServer(gid);
      }
      return person;
    },
    delete: async (id: number, groupId?: string) => {
      const gid = await getActiveGroupIdOrDefault(groupId);
      const canEdit = await canEditGroup(gid);
      if (!canEdit) throw new Error("FORBIDDEN");
      const group = await getGroup(gid);
      if (group?.isShared) {
        await pushPersonDeleteFromSharedGroup(gid, id);
      }
      await deletePerson(id, gid);
      if (group?.isShared) {
        await syncGroupFromServer(gid);
      }
    },
  },
  dips: {
    list: async (groupId?: string) => {
      const gid = await getActiveGroupIdOrDefault(groupId);
      await maybeSyncSharedGroup(gid);
      return listDips(gid);
    },
    get: getDip,
    create: async (data: Omit<DipInput, "groupId" | "createdByUserId"> & { groupId?: string }) => {
      const gid = await getActiveGroupIdOrDefault(data.groupId);
      const user = ensureLocalUser();
      const group = await getGroup(gid);

      if (group?.isShared) {
        const serverDipId = await pushDipToSharedGroup(gid, {
          locationName: data.locationName,
          latitude: data.latitude,
          longitude: data.longitude,
          waterTemp: data.waterTemp ?? null,
          airTemp: data.airTemp ?? null,
          weatherDescription: data.weatherDescription ?? null,
          weatherIcon: data.weatherIcon ?? null,
          windSpeed: data.windSpeed ?? null,
          dippedAt: data.dippedAt,
          notes: data.notes ?? null,
          images: data.images ?? [],
          participantIds: data.participantIds,
          createdAt: new Date().toISOString(),
        });
        await syncGroupFromServer(gid);
        const synced = await getDip(serverDipId);
        if (synced) return synced;
      }

      return createDip({
        ...data,
        groupId: gid,
        createdByUserId: user.id,
      });
    },
    update: async (id: number, data: Omit<DipInput, "groupId" | "createdByUserId"> & { groupId?: string }) => {
      const user = ensureLocalUser();
      const existing = await getDip(id);
      if (!existing) throw new Error("NOT_FOUND");

      const canEdit = await canEditDip(id, user.id);
      if (!canEdit) throw new Error("FORBIDDEN");

      const gid = existing.groupId;
      const group = await getGroup(gid);

      if (group?.isShared) {
        await pushDipUpdateToSharedGroup(gid, id, {
          locationName: data.locationName,
          latitude: data.latitude,
          longitude: data.longitude,
          waterTemp: data.waterTemp ?? null,
          airTemp: data.airTemp ?? null,
          weatherDescription: data.weatherDescription ?? null,
          weatherIcon: data.weatherIcon ?? null,
          windSpeed: data.windSpeed ?? null,
          dippedAt: data.dippedAt,
          notes: data.notes ?? null,
          images: data.images ?? [],
          participantIds: data.participantIds,
          createdAt: existing.createdAt,
        });
        await syncGroupFromServer(gid);
        const synced = await getDip(id);
        if (synced) return synced;
      }

      return updateDip(id, {
        ...data,
        groupId: gid,
        createdByUserId: existing.createdByUserId,
      });
    },
    delete: async (id: number) => {
      const user = ensureLocalUser();
      const existing = await getDip(id);
      if (!existing) throw new Error("NOT_FOUND");

      const canEdit = await canEditDip(id, user.id);
      if (!canEdit) throw new Error("FORBIDDEN");

      const group = await getGroup(existing.groupId);
      if (group?.isShared) {
        await pushDipDeleteToSharedGroup(existing.groupId, id);
        await syncGroupFromServer(existing.groupId);
        return;
      }

      await deleteDip(id);
    },
    canEdit: canEditDip,
  },
  leaderboard: {
    getGlobal: () => getLeaderboard(),
    get: async (groupId?: string) => {
      const gid = await getActiveGroupIdOrDefault(groupId);
      await maybeSyncSharedGroup(gid);
      return getLeaderboard(gid);
    },
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
