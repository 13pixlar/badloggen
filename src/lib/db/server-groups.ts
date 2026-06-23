import { eq, and, inArray } from "drizzle-orm";
import { getDb, ensureMigrated } from "./index";
import * as schema from "./schema";

export type GroupRole = "owner" | "member";

export interface GroupRecord {
  id: string;
  name: string;
  ownerId: string;
  shareCode: string | null;
  updatedAt: string;
  createdAt: string;
  role: GroupRole;
}

export interface SyncPerson {
  id: number;
  name: string;
  createdAt: string;
  createdByUserId: string | null;
}

export interface SyncDip {
  id: number;
  groupId: string;
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
  createdByUserId: string | null;
  createdAt: string;
  participantIds: number[];
}

export interface GroupSyncPayload {
  group: GroupRecord;
  persons: SyncPerson[];
  dips: SyncDip[];
  personGroupLinks: Array<{ personId: number; groupId: string }>;
  updatedAt: string;
}

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function parseImages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function upsertUser(userId: string, displayName: string) {
  await ensureMigrated();
  const db = getDb();
  const now = new Date().toISOString();
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (existing.length) {
    await db
      .update(schema.users)
      .set({ displayName })
      .where(eq(schema.users.id, userId));
    return;
  }

  await db.insert(schema.users).values({ id: userId, displayName, createdAt: now });
}

export async function getUserGroups(userId: string): Promise<GroupRecord[]> {
  await ensureMigrated();
  const db = getDb();

  const rows = await db
    .select({
      id: schema.groups.id,
      name: schema.groups.name,
      ownerId: schema.groups.ownerId,
      shareCode: schema.groups.shareCode,
      updatedAt: schema.groups.updatedAt,
      createdAt: schema.groups.createdAt,
      role: schema.groupMembers.role,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.groups, eq(schema.groups.id, schema.groupMembers.groupId))
    .where(eq(schema.groupMembers.userId, userId));

  return rows.map((r) => ({
    ...r,
    role: r.role as GroupRole,
  }));
}

export async function getGroupMembership(
  groupId: string,
  userId: string
): Promise<GroupRole | null> {
  await ensureMigrated();
  const db = getDb();
  const row = await db
    .select({ role: schema.groupMembers.role })
    .from(schema.groupMembers)
    .where(
      and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId))
    )
    .limit(1);

  return row.length ? (row[0].role as GroupRole) : null;
}

export async function createSharedGroup(
  userId: string,
  name: string,
  groupId: string
): Promise<GroupRecord> {
  await ensureMigrated();
  const db = getDb();
  const now = new Date().toISOString();

  await db.insert(schema.groups).values({
    id: groupId,
    name,
    ownerId: userId,
    shareCode: null,
    updatedAt: now,
    createdAt: now,
  });

  await db.insert(schema.groupMembers).values({
    groupId,
    userId,
    role: "owner",
    joinedAt: now,
  });

  return {
    id: groupId,
    name,
    ownerId: userId,
    shareCode: null,
    updatedAt: now,
    createdAt: now,
    role: "owner",
  };
}

export async function enableGroupSharing(groupId: string, userId: string): Promise<string> {
  await ensureMigrated();
  const db = getDb();
  const role = await getGroupMembership(groupId, userId);
  if (role !== "owner") throw new Error("FORBIDDEN");

  const group = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId))
    .limit(1);

  if (!group.length) throw new Error("NOT_FOUND");
  if (group[0].shareCode) return group[0].shareCode;

  let shareCode = generateShareCode();
  let attempts = 0;
  while (attempts < 5) {
    try {
      await db
        .update(schema.groups)
        .set({
          shareCode,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.groups.id, groupId));
      return shareCode;
    } catch {
      shareCode = generateShareCode();
      attempts++;
    }
  }
  throw new Error("SHARE_CODE_FAILED");
}

export async function joinGroupByShareCode(
  shareCode: string,
  userId: string
): Promise<GroupRecord> {
  await ensureMigrated();
  const db = getDb();

  const group = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.shareCode, shareCode.toUpperCase()))
    .limit(1);

  if (!group.length) throw new Error("INVALID_CODE");

  const existing = await getGroupMembership(group[0].id, userId);
  if (existing) {
    return {
      id: group[0].id,
      name: group[0].name,
      ownerId: group[0].ownerId,
      shareCode: group[0].shareCode,
      updatedAt: group[0].updatedAt,
      createdAt: group[0].createdAt,
      role: existing,
    };
  }

  const now = new Date().toISOString();
  await db.insert(schema.groupMembers).values({
    groupId: group[0].id,
    userId,
    role: "member",
    joinedAt: now,
  });

  await db
    .update(schema.groups)
    .set({ updatedAt: now })
    .where(eq(schema.groups.id, group[0].id));

  return {
    id: group[0].id,
    name: group[0].name,
    ownerId: group[0].ownerId,
    shareCode: group[0].shareCode,
    updatedAt: now,
    createdAt: group[0].createdAt,
    role: "member",
  };
}

export async function getGroupSync(
  groupId: string,
  userId: string,
  since?: string
): Promise<GroupSyncPayload | null> {
  await ensureMigrated();
  const db = getDb();
  const role = await getGroupMembership(groupId, userId);
  if (!role) return null;

  const groupRows = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId))
    .limit(1);

  if (!groupRows.length) return null;
  const group = groupRows[0];

  if (since && group.updatedAt <= since) {
    return {
      group: {
        id: group.id,
        name: group.name,
        ownerId: group.ownerId,
        shareCode: group.shareCode,
        updatedAt: group.updatedAt,
        createdAt: group.createdAt,
        role,
      },
      persons: [],
      dips: [],
      personGroupLinks: [],
      updatedAt: group.updatedAt,
    };
  }

  const personLinks = await db
    .select()
    .from(schema.personGroups)
    .where(eq(schema.personGroups.groupId, groupId));

  const personIds = personLinks.map((l) => l.personId);
  let persons: SyncPerson[] = [];
  if (personIds.length) {
    persons = await db
      .select({
        id: schema.persons.id,
        name: schema.persons.name,
        createdAt: schema.persons.createdAt,
        createdByUserId: schema.persons.createdByUserId,
      })
      .from(schema.persons)
      .where(inArray(schema.persons.id, personIds));
  }

  const dipRows = await db
    .select()
    .from(schema.dips)
    .where(eq(schema.dips.groupId, groupId))
    .orderBy(schema.dips.dippedAt);

  const dips: SyncDip[] = [];
  for (const dip of dipRows) {
    const participants = await db
      .select({ personId: schema.dipParticipants.personId })
      .from(schema.dipParticipants)
      .where(eq(schema.dipParticipants.dipId, dip.id));

    dips.push({
      id: dip.id,
      groupId: dip.groupId,
      locationName: dip.locationName,
      latitude: dip.latitude,
      longitude: dip.longitude,
      waterTemp: dip.waterTemp,
      airTemp: dip.airTemp,
      weatherDescription: dip.weatherDescription,
      weatherIcon: dip.weatherIcon,
      windSpeed: dip.windSpeed ?? null,
      dippedAt: dip.dippedAt,
      notes: dip.notes,
      images: parseImages(dip.images),
      createdByUserId: dip.createdByUserId,
      createdAt: dip.createdAt,
      participantIds: participants.map((p) => p.personId),
    });
  }

  return {
    group: {
      id: group.id,
      name: group.name,
      ownerId: group.ownerId,
      shareCode: group.shareCode,
      updatedAt: group.updatedAt,
      createdAt: group.createdAt,
      role,
    },
    persons,
    dips,
    personGroupLinks: personLinks.map((l) => ({
      personId: l.personId,
      groupId: l.groupId,
    })),
    updatedAt: group.updatedAt,
  };
}

export async function uploadGroupSnapshot(
  groupId: string,
  userId: string,
  payload: {
    name: string;
    persons: Array<{ id: number; name: string; createdAt: string }>;
    dips: SyncDip[];
    personGroupLinks: Array<{ personId: number; groupId: string }>;
  }
): Promise<GroupRecord> {
  await ensureMigrated();
  const db = getDb();
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId))
    .limit(1);

  if (!existing.length) {
    await db.insert(schema.groups).values({
      id: groupId,
      name: payload.name,
      ownerId: userId,
      shareCode: null,
      updatedAt: now,
      createdAt: now,
    });
    await db.insert(schema.groupMembers).values({
      groupId,
      userId,
      role: "owner",
      joinedAt: now,
    });
  } else {
    const role = await getGroupMembership(groupId, userId);
    if (role !== "owner") throw new Error("FORBIDDEN");
    await db
      .update(schema.groups)
      .set({ name: payload.name, updatedAt: now })
      .where(eq(schema.groups.id, groupId));
  }

  for (const person of payload.persons) {
    const existingPerson = await db
      .select()
      .from(schema.persons)
      .where(eq(schema.persons.id, person.id))
      .limit(1);

    if (!existingPerson.length) {
      await db.insert(schema.persons).values({
        id: person.id,
        name: person.name,
        createdAt: person.createdAt,
        createdByUserId: userId,
      });
    }
  }

  for (const link of payload.personGroupLinks) {
    const linkExists = await db
      .select()
      .from(schema.personGroups)
      .where(
        and(
          eq(schema.personGroups.personId, link.personId),
          eq(schema.personGroups.groupId, link.groupId)
        )
      )
      .limit(1);
    if (!linkExists.length) {
      await db.insert(schema.personGroups).values(link);
    }
  }

  for (const dip of payload.dips) {
    const existingDip = await db
      .select()
      .from(schema.dips)
      .where(eq(schema.dips.id, dip.id))
      .limit(1);

    if (!existingDip.length) {
      await db.insert(schema.dips).values({
        id: dip.id,
        groupId: dip.groupId,
        locationName: dip.locationName,
        latitude: dip.latitude,
        longitude: dip.longitude,
        waterTemp: dip.waterTemp,
        airTemp: dip.airTemp,
        weatherDescription: dip.weatherDescription,
        weatherIcon: dip.weatherIcon,
        windSpeed: dip.windSpeed,
        dippedAt: dip.dippedAt,
        notes: dip.notes,
        images: JSON.stringify(dip.images),
        createdByUserId: dip.createdByUserId,
        createdAt: dip.createdAt,
      });

      for (const personId of dip.participantIds) {
        await db.insert(schema.dipParticipants).values({
          dipId: dip.id,
          personId,
        });
      }
    }
  }

  const group = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.id, groupId))
    .limit(1);

  return {
    id: group[0].id,
    name: group[0].name,
    ownerId: group[0].ownerId,
    shareCode: group[0].shareCode,
    updatedAt: group[0].updatedAt,
    createdAt: group[0].createdAt,
    role: "owner",
  };
}

export async function updateGroupName(groupId: string, userId: string, name: string) {
  await ensureMigrated();
  const role = await getGroupMembership(groupId, userId);
  if (role !== "owner") throw new Error("FORBIDDEN");

  const db = getDb();
  const now = new Date().toISOString();
  await db
    .update(schema.groups)
    .set({ name, updatedAt: now })
    .where(eq(schema.groups.id, groupId));
}

export async function deleteSharedGroup(groupId: string, userId: string) {
  await ensureMigrated();
  const role = await getGroupMembership(groupId, userId);
  if (role !== "owner") throw new Error("FORBIDDEN");

  const db = getDb();
  await db.delete(schema.groups).where(eq(schema.groups.id, groupId));
}

export async function addPersonToSharedGroup(
  groupId: string,
  userId: string,
  person: { id: number; name: string; createdAt: string }
) {
  await ensureMigrated();
  const role = await getGroupMembership(groupId, userId);
  if (!role) throw new Error("FORBIDDEN");

  const db = getDb();
  const now = new Date().toISOString();

  const existingByName = await db
    .select()
    .from(schema.persons)
    .where(eq(schema.persons.name, person.name))
    .limit(1);

  let personId = person.id;
  if (existingByName.length) {
    personId = existingByName[0].id;
  } else {
    await db.insert(schema.persons).values({
      id: person.id,
      name: person.name,
      createdAt: person.createdAt,
      createdByUserId: userId,
    });
  }

  const linkExists = await db
    .select()
    .from(schema.personGroups)
    .where(
      and(
        eq(schema.personGroups.personId, personId),
        eq(schema.personGroups.groupId, groupId)
      )
    )
    .limit(1);

  if (!linkExists.length) {
    await db.insert(schema.personGroups).values({ personId, groupId });
  }

  await db
    .update(schema.groups)
    .set({ updatedAt: now })
    .where(eq(schema.groups.id, groupId));

  return personId;
}

export async function createSharedDip(
  groupId: string,
  userId: string,
  dip: Omit<SyncDip, "id" | "groupId"> & { id?: number }
) {
  await ensureMigrated();
  const role = await getGroupMembership(groupId, userId);
  if (!role) throw new Error("FORBIDDEN");

  const db = getDb();
  const now = new Date().toISOString();

  const result = await db
    .insert(schema.dips)
    .values({
      groupId,
      locationName: dip.locationName,
      latitude: dip.latitude,
      longitude: dip.longitude,
      waterTemp: dip.waterTemp,
      airTemp: dip.airTemp,
      weatherDescription: dip.weatherDescription,
      weatherIcon: dip.weatherIcon,
      windSpeed: dip.windSpeed,
      dippedAt: dip.dippedAt,
      notes: dip.notes,
      images: JSON.stringify(dip.images),
      createdByUserId: userId,
      createdAt: dip.createdAt || now,
    })
    .returning({ id: schema.dips.id });

  const dipId = result[0].id;
  for (const personId of dip.participantIds) {
    await db.insert(schema.dipParticipants).values({ dipId, personId });
  }

  await db
    .update(schema.groups)
    .set({ updatedAt: now })
    .where(eq(schema.groups.id, groupId));

  return dipId;
}

export async function updateSharedDip(
  groupId: string,
  userId: string,
  dipId: number,
  dip: Omit<SyncDip, "id" | "groupId">
) {
  await ensureMigrated();
  const role = await getGroupMembership(groupId, userId);
  if (!role) throw new Error("FORBIDDEN");

  const db = getDb();
  const existing = await db
    .select()
    .from(schema.dips)
    .where(and(eq(schema.dips.id, dipId), eq(schema.dips.groupId, groupId)))
    .limit(1);

  if (!existing.length) throw new Error("NOT_FOUND");
  if (role === "member" && existing[0].createdByUserId !== userId) {
    throw new Error("FORBIDDEN");
  }

  const now = new Date().toISOString();
  await db
    .update(schema.dips)
    .set({
      locationName: dip.locationName,
      latitude: dip.latitude,
      longitude: dip.longitude,
      waterTemp: dip.waterTemp,
      airTemp: dip.airTemp,
      weatherDescription: dip.weatherDescription,
      weatherIcon: dip.weatherIcon,
      windSpeed: dip.windSpeed,
      dippedAt: dip.dippedAt,
      notes: dip.notes,
      images: JSON.stringify(dip.images),
    })
    .where(eq(schema.dips.id, dipId));

  await db.delete(schema.dipParticipants).where(eq(schema.dipParticipants.dipId, dipId));
  for (const personId of dip.participantIds) {
    await db.insert(schema.dipParticipants).values({ dipId, personId });
  }

  await db
    .update(schema.groups)
    .set({ updatedAt: now })
    .where(eq(schema.groups.id, groupId));
}

export async function deleteSharedDip(groupId: string, userId: string, dipId: number) {
  await ensureMigrated();
  const role = await getGroupMembership(groupId, userId);
  if (!role) throw new Error("FORBIDDEN");

  const db = getDb();
  const existing = await db
    .select()
    .from(schema.dips)
    .where(and(eq(schema.dips.id, dipId), eq(schema.dips.groupId, groupId)))
    .limit(1);

  if (!existing.length) throw new Error("NOT_FOUND");
  if (role === "member" && existing[0].createdByUserId !== userId) {
    throw new Error("FORBIDDEN");
  }

  const now = new Date().toISOString();
  await db.delete(schema.dips).where(eq(schema.dips.id, dipId));
  await db
    .update(schema.groups)
    .set({ updatedAt: now })
    .where(eq(schema.groups.id, groupId));
}

export async function removePersonFromSharedGroup(
  groupId: string,
  userId: string,
  personId: number
) {
  await ensureMigrated();
  const role = await getGroupMembership(groupId, userId);
  if (role !== "owner") throw new Error("FORBIDDEN");

  const db = getDb();
  const now = new Date().toISOString();
  await db
    .delete(schema.personGroups)
    .where(
      and(eq(schema.personGroups.groupId, groupId), eq(schema.personGroups.personId, personId))
    );
  await db
    .update(schema.groups)
    .set({ updatedAt: now })
    .where(eq(schema.groups.id, groupId));
}
