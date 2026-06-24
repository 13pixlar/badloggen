import type { GroupSyncPayload } from "@/lib/db/server-groups";
import type { Group, Dip, Person } from "@/lib/db/browser-db";
import {
  mergeGroupSync,
  exportGroupForUpload,
  updateGroup,
  getGroup,
} from "@/lib/db/browser-db";
import { ensureLocalUser } from "@/lib/auth/user";

function authHeaders(): HeadersInit {
  const user = ensureLocalUser();
  return {
    "Content-Type": "application/json",
    "X-User-Id": user.id,
  };
}

export async function syncGroupFromServer(groupId: string, since?: string): Promise<boolean> {
  const url = since
    ? `/api/groups/${groupId}?since=${encodeURIComponent(since)}`
    : `/api/groups/${groupId}`;

  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) return false;

  const data: GroupSyncPayload = await res.json();
  const group = data.group;

  await mergeGroupSync({
    group: {
      id: group.id,
      name: group.name,
      ownerUserId: group.ownerId,
      shareCode: group.shareCode,
      isShared: true,
      role: group.role,
      updatedAt: group.updatedAt,
      createdAt: group.createdAt,
    },
    persons: data.persons.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
    })),
    dips: data.dips.map(
      (d): Dip => ({
        id: d.id,
        groupId: d.groupId,
        locationName: d.locationName,
        latitude: d.latitude,
        longitude: d.longitude,
        waterTemp: d.waterTemp,
        airTemp: d.airTemp,
        weatherDescription: d.weatherDescription,
        weatherIcon: d.weatherIcon,
        windSpeed: d.windSpeed,
        dippedAt: d.dippedAt,
        notes: d.notes,
        images: d.images,
        createdByUserId: d.createdByUserId,
        createdAt: d.createdAt,
        participants: d.participantIds.map((pid) => {
          const person = data.persons.find((p) => p.id === pid);
          return { id: pid, name: person?.name ?? "?" };
        }),
      })
    ),
    personGroupLinks: data.personGroupLinks,
  });

  return true;
}

export async function shareGroup(groupId: string): Promise<string> {
  const user = ensureLocalUser();
  await fetch("/api/users", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ displayName: user.displayName }),
  });

  const snapshot = await exportGroupForUpload(groupId);

  await fetch(`/api/groups`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      id: groupId,
      name: snapshot.group.name,
    }),
  });

  await fetch(`/api/groups/${groupId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      action: "upload",
      payload: {
        name: snapshot.group.name,
        persons: snapshot.persons,
        dips: snapshot.dips.map((d) => ({
          ...d,
          participantIds: d.participants.map((p) => p.id),
        })),
        personGroupLinks: snapshot.personGroupLinks,
      },
    }),
  });

  const shareRes = await fetch(`/api/groups/${groupId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ action: "share" }),
  });

  if (!shareRes.ok) throw new Error("SHARE_FAILED");
  const { shareCode } = await shareRes.json();

  await updateGroup(groupId, {
    isShared: true,
    shareCode,
    ownerUserId: user.id,
  });

  return shareCode;
}

export async function joinGroup(shareCode: string): Promise<Group> {
  const user = ensureLocalUser();
  await fetch("/api/users", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ displayName: user.displayName }),
  });

  const res = await fetch("/api/groups", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ action: "join", shareCode }),
  });

  if (!res.ok) throw new Error("JOIN_FAILED");
  const serverGroup = await res.json();

  await syncGroupFromServer(serverGroup.id);

  const local = await getGroup(serverGroup.id);
  if (!local) throw new Error("SYNC_FAILED");
  return local;
}

export async function pushPersonToSharedGroup(
  groupId: string,
  person: Person
): Promise<void> {
  await fetch(`/api/groups/${groupId}/items`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ type: "person", person }),
  });
}

export async function pushDipToSharedGroup(
  groupId: string,
  dip: {
    locationName: string;
    latitude: number;
    longitude: number;
    waterTemp: number | null;
    airTemp: number | null;
    weatherDescription: string | null;
    weatherIcon: string | null;
    windSpeed: number | null;
    dippedAt: string;
    notes: string | null;
    images: string[];
    participants: Array<{ id: number; name: string }>;
    createdAt: string;
  }
): Promise<number> {
  const res = await fetch(`/api/groups/${groupId}/items`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      type: "dip",
      dip: {
        ...dip,
        participantIds: dip.participants.map((p) => p.id),
      },
    }),
  });
  if (!res.ok) throw new Error("PUSH_DIP_FAILED");
  const { dipId } = await res.json();
  return dipId;
}

export async function pushDipUpdateToSharedGroup(
  groupId: string,
  dipId: number,
  dip: {
    locationName: string;
    latitude: number;
    longitude: number;
    waterTemp: number | null;
    airTemp: number | null;
    weatherDescription: string | null;
    weatherIcon: string | null;
    windSpeed: number | null;
    dippedAt: string;
    notes: string | null;
    images: string[];
    participants: Array<{ id: number; name: string }>;
    createdAt: string;
  }
): Promise<void> {
  const res = await fetch(`/api/groups/${groupId}/items`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      type: "dip",
      dipId,
      dip: {
        ...dip,
        participantIds: dip.participants.map((p) => p.id),
      },
    }),
  });
  if (!res.ok) throw new Error("PUSH_DIP_UPDATE_FAILED");
}

export async function pushDipDeleteToSharedGroup(
  groupId: string,
  dipId: number
): Promise<void> {
  const res = await fetch(`/api/groups/${groupId}/items?type=dip&id=${dipId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("PUSH_DIP_DELETE_FAILED");
}

export async function pushPersonDeleteFromSharedGroup(
  groupId: string,
  personId: number
): Promise<void> {
  const res = await fetch(`/api/groups/${groupId}/items?type=person&id=${personId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("PUSH_PERSON_DELETE_FAILED");
}

export async function pushGroupNameUpdate(groupId: string, name: string): Promise<void> {
  const res = await fetch(`/api/groups/${groupId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("PUSH_GROUP_UPDATE_FAILED");
}

export async function pushGroupDelete(groupId: string): Promise<void> {
  const res = await fetch(`/api/groups/${groupId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("PUSH_GROUP_DELETE_FAILED");
}

export async function syncAllSharedGroups(groups: Group[]): Promise<void> {
  const shared = groups.filter((g) => g.isShared);
  await Promise.all(shared.map((g) => syncGroupFromServer(g.id, g.updatedAt)));
}
