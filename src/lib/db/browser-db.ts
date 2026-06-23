import initSqlJs, { type Database, type SqlValue } from "sql.js";

const DB_STORAGE_KEY = "badloggen-sqlite";
const IDB_NAME = "badloggen";
const IDB_STORE = "kv";
const SCHEMA_VERSION = 4;
const WASM_PATH = process.env.NEXT_PUBLIC_BASE_PATH
  ? `${process.env.NEXT_PUBLIC_BASE_PATH}/sql-wasm.wasm`
  : "/sql-wasm.wasm";

let dbPromise: Promise<Database> | null = null;

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getSchemaVersion(db: Database): number {
  try {
    const rows = db.exec("SELECT version FROM schema_version LIMIT 1");
    if (rows.length && rows[0].values.length) {
      return rows[0].values[0][0] as number;
    }
  } catch {
    // Table doesn't exist yet
  }
  return 0;
}

function setSchemaVersion(db: Database, version: number) {
  db.run("DELETE FROM schema_version");
  db.run("INSERT INTO schema_version (version) VALUES (?)", [version]);
}

function ensureDipColumns(db: Database) {
  const info = db.exec("PRAGMA table_info(dips)");
  if (!info.length) return;

  const cols = new Set(info[0].values.map((row) => row[1] as string));
  if (!cols.has("images")) {
    db.run("ALTER TABLE dips ADD COLUMN images TEXT");
  }
  if (!cols.has("wind_speed")) {
    db.run("ALTER TABLE dips ADD COLUMN wind_speed REAL");
  }
  if (!cols.has("group_id")) {
    db.run("ALTER TABLE dips ADD COLUMN group_id TEXT");
  }
  if (!cols.has("created_by_user_id")) {
    db.run("ALTER TABLE dips ADD COLUMN created_by_user_id TEXT");
  }
}

function migrateToGroups(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT,
      share_code TEXT UNIQUE,
      is_shared INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'owner',
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS person_groups (
      person_id INTEGER NOT NULL,
      group_id TEXT NOT NULL,
      PRIMARY KEY (person_id, group_id),
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
  `);

  const defaultGroupId = generateId();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO groups (id, name, owner_user_id, is_shared, role, updated_at, created_at)
     VALUES (?, ?, NULL, 0, 'owner', ?, ?)`,
    [defaultGroupId, "Mitt gäng", now, now]
  );

  const persons = db.exec("SELECT id FROM persons");
  if (persons.length && persons[0].values.length) {
    for (const row of persons[0].values) {
      db.run("INSERT OR IGNORE INTO person_groups (person_id, group_id) VALUES (?, ?)", [
        row[0],
        defaultGroupId,
      ]);
    }
  }

  ensureDipColumns(db);
  db.run("UPDATE dips SET group_id = ? WHERE group_id IS NULL", [defaultGroupId]);

  try {
    db.run(
      "CREATE UNIQUE INDEX IF NOT EXISTS persons_name_unique ON persons (name COLLATE NOCASE)"
    );
  } catch {
    // Handle duplicate names by suffixing
    const dupes = db.exec(
      `SELECT name FROM persons GROUP BY name COLLATE NOCASE HAVING COUNT(*) > 1`
    );
    if (dupes.length && dupes[0].values.length) {
      for (const row of dupes[0].values) {
        const name = row[0] as string;
        const matches = queryAll<{ id: number; name: string }>(
          db,
          "SELECT id, name FROM persons WHERE name = ? COLLATE NOCASE",
          [name]
        );
        matches.slice(1).forEach((m, i) => {
          db.run("UPDATE persons SET name = ? WHERE id = ?", [`${m.name} (${i + 2})`, m.id]);
        });
      }
      db.run(
        "CREATE UNIQUE INDEX IF NOT EXISTS persons_name_unique ON persons (name COLLATE NOCASE)"
      );
    }
  }
}

function runMigrations(db: Database) {
  db.run(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`);

  const version = getSchemaVersion(db);

  if (version === 0) {
    db.run(`
      CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS dips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        water_temp REAL,
        air_temp REAL,
        weather_description TEXT,
        weather_icon TEXT,
        wind_speed REAL,
        dipped_at TEXT NOT NULL,
        notes TEXT,
        images TEXT,
        created_at TEXT NOT NULL
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS dip_participants (
        dip_id INTEGER NOT NULL,
        person_id INTEGER NOT NULL,
        PRIMARY KEY (dip_id, person_id),
        FOREIGN KEY (dip_id) REFERENCES dips(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS saved_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        last_used_at TEXT NOT NULL
      );
    `);
    migrateToGroups(db);
    setSchemaVersion(db, SCHEMA_VERSION);
    return;
  }

  if (version < 2) {
    try {
      db.run("ALTER TABLE dips ADD COLUMN images TEXT");
    } catch {
      // Column may already exist
    }
    try {
      db.run("ALTER TABLE dips ADD COLUMN wind_speed REAL");
    } catch {
      // Column may already exist
    }
    setSchemaVersion(db, 2);
  }

  if (version < 3) {
    db.run(`
      CREATE TABLE IF NOT EXISTS saved_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        last_used_at TEXT NOT NULL
      );
    `);
    const existing = db.exec(
      `SELECT location_name, latitude, longitude, MAX(dipped_at) as last_used
       FROM dips GROUP BY location_name, latitude, longitude`
    );
    if (existing.length && existing[0].values.length) {
      for (const row of existing[0].values) {
        db.run(
          "INSERT INTO saved_locations (name, latitude, longitude, last_used_at) VALUES (?, ?, ?, ?)",
          [row[0], row[1], row[2], row[3]]
        );
      }
    }
    setSchemaVersion(db, 3);
  }

  if (version < 4) {
    migrateToGroups(db);
    setSchemaVersion(db, SCHEMA_VERSION);
  }

  ensureDipColumns(db);

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      last_used_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT,
      share_code TEXT UNIQUE,
      is_shared INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'owner',
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS person_groups (
      person_id INTEGER NOT NULL,
      group_id TEXT NOT NULL,
      PRIMARY KEY (person_id, group_id),
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
  `);

  if (getSchemaVersion(db) < SCHEMA_VERSION) {
    setSchemaVersion(db, SCHEMA_VERSION);
  }
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<Uint8Array | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => {
      const value = req.result;
      resolve(value instanceof Uint8Array ? value : null);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: Uint8Array): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadPersistedDb(): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;

  const fromIdb = await idbGet(DB_STORAGE_KEY);
  if (fromIdb) return fromIdb;

  const legacy = localStorage.getItem(DB_STORAGE_KEY);
  if (!legacy) return null;

  const bytes = decodeBase64ToBytes(legacy);
  try {
    await idbSet(DB_STORAGE_KEY, bytes);
    localStorage.removeItem(DB_STORAGE_KEY);
  } catch {
    // Keep legacy copy if IndexedDB write fails
  }
  return bytes;
}

async function persistDb(db: Database) {
  if (typeof window === "undefined") return;

  const data = db.export();
  try {
    await idbSet(DB_STORAGE_KEY, data);
    localStorage.removeItem(DB_STORAGE_KEY);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22)
    ) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw error;
  }
}

export async function withDb<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getBrowserDb();
  try {
    const result = fn(db);
    await persistDb(db);
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "QUOTA_EXCEEDED") {
      throw error;
    }
    if (error instanceof Error && error.message === "DUPLICATE_NAME") {
      throw error;
    }
    console.error("Database error:", error);
    throw new Error("DB_ERROR");
  }
}

export async function getBrowserDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => WASM_PATH });
      const saved = await loadPersistedDb();

      let db: Database;
      if (saved) {
        db = new SQL.Database(saved);
        runMigrations(db);
        await persistDb(db);
      } else {
        db = new SQL.Database();
        runMigrations(db);
        await persistDb(db);
      }

      return db;
    })();
  }

  return dbPromise;
}

export type GroupRole = "owner" | "member";

export interface Group {
  id: string;
  name: string;
  ownerUserId: string | null;
  shareCode: string | null;
  isShared: boolean;
  role: GroupRole;
  updatedAt: string;
  createdAt: string;
}

export interface Person {
  id: number;
  name: string;
  createdAt: string;
}

export interface Dip {
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
  participants: Array<{ id: number; name: string }>;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  dipCount: number;
}

export interface DipInput {
  locationName: string;
  latitude: number;
  longitude: number;
  waterTemp?: number | null;
  airTemp?: number | null;
  weatherDescription?: string | null;
  weatherIcon?: string | null;
  windSpeed?: number | null;
  dippedAt: string;
  notes?: string | null;
  images?: string[];
  participantIds: number[];
  groupId: string;
  createdByUserId?: string | null;
}

type DipRow = {
  id: number;
  group_id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  water_temp: number | null;
  air_temp: number | null;
  weather_description: string | null;
  weather_icon: string | null;
  wind_speed: number | null;
  dipped_at: string;
  notes: string | null;
  images: string | null;
  created_by_user_id: string | null;
  created_at: string;
};

function parseImages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function queryAll<T>(db: Database, sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

function mapGroupRow(row: {
  id: string;
  name: string;
  owner_user_id: string | null;
  share_code: string | null;
  is_shared: number;
  role: string;
  updated_at: string;
  created_at: string;
}): Group {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    shareCode: row.share_code,
    isShared: row.is_shared === 1,
    role: row.role as GroupRole,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function mapDipRow(db: Database, dip: DipRow): Dip {
  const participants = queryAll<{ id: number; name: string }>(
    db,
    `SELECT p.id, p.name FROM dip_participants dp
     JOIN persons p ON p.id = dp.person_id
     WHERE dp.dip_id = ?`,
    [dip.id]
  );

  return {
    id: dip.id,
    groupId: dip.group_id,
    locationName: dip.location_name,
    latitude: dip.latitude,
    longitude: dip.longitude,
    waterTemp: dip.water_temp,
    airTemp: dip.air_temp,
    weatherDescription: dip.weather_description,
    weatherIcon: dip.weather_icon,
    windSpeed: dip.wind_speed,
    dippedAt: dip.dipped_at,
    notes: dip.notes,
    images: parseImages(dip.images),
    createdByUserId: dip.created_by_user_id,
    createdAt: dip.created_at,
    participants,
  };
}

export async function listGroups(): Promise<Group[]> {
  return withDb((db) => {
    const rows = queryAll<{
      id: string;
      name: string;
      owner_user_id: string | null;
      share_code: string | null;
      is_shared: number;
      role: string;
      updated_at: string;
      created_at: string;
    }>(db, "SELECT * FROM groups ORDER BY name");
    return rows.map(mapGroupRow);
  });
}

export async function getGroup(id: string): Promise<Group | null> {
  return withDb((db) => {
    const row = queryAll<{
      id: string;
      name: string;
      owner_user_id: string | null;
      share_code: string | null;
      is_shared: number;
      role: string;
      updated_at: string;
      created_at: string;
    }>(db, "SELECT * FROM groups WHERE id = ?", [id])[0];
    return row ? mapGroupRow(row) : null;
  });
}

export async function getDefaultGroupId(): Promise<string> {
  return withDb((db) => {
    const row = queryAll<{ id: string }>(db, "SELECT id FROM groups ORDER BY created_at LIMIT 1")[0];
    if (row) return row.id;
    const id = generateId();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO groups (id, name, owner_user_id, is_shared, role, updated_at, created_at)
       VALUES (?, ?, NULL, 0, 'owner', ?, ?)`,
      [id, "Mitt gäng", now, now]
    );
    return id;
  });
}

export async function createGroup(name: string, ownerUserId?: string): Promise<Group> {
  return withDb((db) => {
    const id = generateId();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO groups (id, name, owner_user_id, is_shared, role, updated_at, created_at)
       VALUES (?, ?, ?, 0, 'owner', ?, ?)`,
      [id, name, ownerUserId ?? null, now, now]
    );
    return mapGroupRow(
      queryAll<{
        id: string;
        name: string;
        owner_user_id: string | null;
        share_code: string | null;
        is_shared: number;
        role: string;
        updated_at: string;
        created_at: string;
      }>(db, "SELECT * FROM groups WHERE id = ?", [id])[0]
    );
  });
}

export async function updateGroup(
  id: string,
  updates: Partial<Pick<Group, "name" | "shareCode" | "isShared" | "role" | "ownerUserId">>
): Promise<Group> {
  return withDb((db) => {
    const existing = getGroupSync(db, id);
    if (!existing) throw new Error("NOT_FOUND");

    const now = new Date().toISOString();
    db.run(
      `UPDATE groups SET name = ?, share_code = ?, is_shared = ?, role = ?, owner_user_id = ?, updated_at = ?
       WHERE id = ?`,
      [
        updates.name ?? existing.name,
        updates.shareCode !== undefined ? updates.shareCode : existing.shareCode,
        updates.isShared !== undefined ? (updates.isShared ? 1 : 0) : existing.isShared ? 1 : 0,
        updates.role ?? existing.role,
        updates.ownerUserId !== undefined ? updates.ownerUserId : existing.ownerUserId,
        now,
        id,
      ]
    );
    return mapGroupRow(
      queryAll<{
        id: string;
        name: string;
        owner_user_id: string | null;
        share_code: string | null;
        is_shared: number;
        role: string;
        updated_at: string;
        created_at: string;
      }>(db, "SELECT * FROM groups WHERE id = ?", [id])[0]
    );
  });
}

function getGroupSync(db: Database, id: string): Group | null {
  const row = queryAll<{
    id: string;
    name: string;
    owner_user_id: string | null;
    share_code: string | null;
    is_shared: number;
    role: string;
    updated_at: string;
    created_at: string;
  }>(db, "SELECT * FROM groups WHERE id = ?", [id])[0];
  return row ? mapGroupRow(row) : null;
}

export async function deleteGroup(id: string): Promise<void> {
  return withDb((db) => {
    const group = getGroupSync(db, id);
    if (!group) throw new Error("NOT_FOUND");
    if (group.isShared && group.role !== "owner") throw new Error("FORBIDDEN");

    db.run("DELETE FROM dip_participants WHERE dip_id IN (SELECT id FROM dips WHERE group_id = ?)", [
      id,
    ]);
    db.run("DELETE FROM dips WHERE group_id = ?", [id]);
    db.run("DELETE FROM person_groups WHERE group_id = ?", [id]);
    db.run("DELETE FROM groups WHERE id = ?", [id]);
  });
}

export async function listPersons(groupId?: string): Promise<Person[]> {
  return withDb((db) => {
    if (groupId) {
      const rows = queryAll<{ id: number; name: string; created_at: string }>(
        db,
        `SELECT p.id, p.name, p.created_at FROM persons p
         JOIN person_groups pg ON pg.person_id = p.id
         WHERE pg.group_id = ?
         ORDER BY p.name`,
        [groupId]
      );
      return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
    }

    const rows = queryAll<{ id: number; name: string; created_at: string }>(
      db,
      "SELECT id, name, created_at FROM persons ORDER BY name"
    );
    return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
  });
}

export async function createPerson(
  name: string,
  groupId: string,
  createdByUserId?: string
): Promise<Person> {
  return withDb((db) => {
    const trimmed = name.trim();
    const existing = queryAll<{ id: number; name: string; created_at: string }>(
      db,
      "SELECT id, name, created_at FROM persons WHERE name = ? COLLATE NOCASE",
      [trimmed]
    );

    let person: Person;
    if (existing.length) {
      person = {
        id: existing[0].id,
        name: existing[0].name,
        createdAt: existing[0].created_at,
      };
    } else {
      const now = new Date().toISOString();
      db.run("INSERT INTO persons (name, created_at) VALUES (?, ?)", [trimmed, now]);
      const row = queryAll<{ id: number; name: string; created_at: string }>(
        db,
        "SELECT id, name, created_at FROM persons WHERE id = last_insert_rowid()"
      )[0];
      person = { id: row.id, name: row.name, createdAt: row.created_at };
    }

    db.run("INSERT OR IGNORE INTO person_groups (person_id, group_id) VALUES (?, ?)", [
      person.id,
      groupId,
    ]);

    if (createdByUserId) {
      // Track creator in metadata if we extend schema later
    }

    return person;
  });
}

export async function addPersonToGroup(personId: number, groupId: string): Promise<void> {
  return withDb((db) => {
    db.run("INSERT OR IGNORE INTO person_groups (person_id, group_id) VALUES (?, ?)", [
      personId,
      groupId,
    ]);
  });
}

export async function deletePerson(id: number, groupId: string): Promise<void> {
  return withDb((db) => {
    db.run("DELETE FROM person_groups WHERE person_id = ? AND group_id = ?", [id, groupId]);
    const remaining = queryAll<{ cnt: number }>(
      db,
      "SELECT COUNT(*) as cnt FROM person_groups WHERE person_id = ?",
      [id]
    );
    if (remaining[0]?.cnt === 0) {
      db.run("DELETE FROM dip_participants WHERE person_id = ?", [id]);
      db.run("DELETE FROM persons WHERE id = ?", [id]);
    }
  });
}

export async function listDips(groupId?: string): Promise<Dip[]> {
  return withDb((db) => {
    const dips = groupId
      ? queryAll<DipRow>(
          db,
          "SELECT * FROM dips WHERE group_id = ? ORDER BY dipped_at DESC",
          [groupId]
        )
      : queryAll<DipRow>(db, "SELECT * FROM dips ORDER BY dipped_at DESC");
    return dips.map((dip) => mapDipRow(db, dip));
  });
}

export async function getDip(id: number): Promise<Dip | null> {
  return withDb((db) => {
    const dip = queryAll<DipRow>(db, "SELECT * FROM dips WHERE id = ?", [id])[0];
    return dip ? mapDipRow(db, dip) : null;
  });
}

export async function createDip(data: DipInput): Promise<Dip> {
  return withDb((db) => {
    db.run(
      `INSERT INTO dips (group_id, location_name, latitude, longitude, water_temp, air_temp,
       weather_description, weather_icon, wind_speed, dipped_at, notes, images, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.groupId,
        data.locationName,
        data.latitude,
        data.longitude,
        data.waterTemp ?? null,
        data.airTemp ?? null,
        data.weatherDescription ?? null,
        data.weatherIcon ?? null,
        data.windSpeed ?? null,
        data.dippedAt,
        data.notes ?? null,
        JSON.stringify(data.images ?? []),
        data.createdByUserId ?? null,
        new Date().toISOString(),
      ]
    );

    const dipId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0] as number;

    for (const personId of data.participantIds) {
      db.run("INSERT INTO dip_participants (dip_id, person_id) VALUES (?, ?)", [
        dipId,
        personId,
      ]);
    }

    upsertSavedLocation(db, data.locationName, data.latitude, data.longitude);
    touchGroupUpdatedAt(db, data.groupId);

    return mapDipRow(db, queryAll<DipRow>(db, "SELECT * FROM dips WHERE id = ?", [dipId])[0]);
  });
}

export async function updateDip(id: number, data: DipInput): Promise<Dip> {
  return withDb((db) => {
    db.run(
      `UPDATE dips SET location_name = ?, latitude = ?, longitude = ?, water_temp = ?,
       air_temp = ?, weather_description = ?, weather_icon = ?, wind_speed = ?,
       dipped_at = ?, notes = ?, images = ? WHERE id = ?`,
      [
        data.locationName,
        data.latitude,
        data.longitude,
        data.waterTemp ?? null,
        data.airTemp ?? null,
        data.weatherDescription ?? null,
        data.weatherIcon ?? null,
        data.windSpeed ?? null,
        data.dippedAt,
        data.notes ?? null,
        JSON.stringify(data.images ?? []),
        id,
      ]
    );

    db.run("DELETE FROM dip_participants WHERE dip_id = ?", [id]);
    for (const personId of data.participantIds) {
      db.run("INSERT INTO dip_participants (dip_id, person_id) VALUES (?, ?)", [id, personId]);
    }

    upsertSavedLocation(db, data.locationName, data.latitude, data.longitude);
    touchGroupUpdatedAt(db, data.groupId);

    return mapDipRow(db, queryAll<DipRow>(db, "SELECT * FROM dips WHERE id = ?", [id])[0]);
  });
}

export async function deleteDip(id: number): Promise<void> {
  return withDb((db) => {
    const dip = queryAll<{ group_id: string }>(db, "SELECT group_id FROM dips WHERE id = ?", [id])[0];
    db.run("DELETE FROM dip_participants WHERE dip_id = ?", [id]);
    db.run("DELETE FROM dips WHERE id = ?", [id]);
    if (dip) touchGroupUpdatedAt(db, dip.group_id);
  });
}

export async function getLeaderboard(groupId?: string): Promise<LeaderboardEntry[]> {
  return withDb((db) => {
    if (groupId) {
      const rows = queryAll<{ id: number; name: string; dip_count: number }>(
        db,
        `SELECT p.id, p.name, COUNT(dp.dip_id) as dip_count
         FROM persons p
         JOIN person_groups pg ON pg.person_id = p.id AND pg.group_id = ?
         LEFT JOIN dip_participants dp ON p.id = dp.person_id
         LEFT JOIN dips d ON d.id = dp.dip_id AND d.group_id = ?
         GROUP BY p.id
         ORDER BY dip_count DESC`,
        [groupId, groupId]
      );
      return rows.map((r) => ({ id: r.id, name: r.name, dipCount: r.dip_count }));
    }

    const rows = queryAll<{ id: number; name: string; dip_count: number }>(
      db,
      `SELECT p.id, p.name, COUNT(dp.dip_id) as dip_count
       FROM persons p
       LEFT JOIN dip_participants dp ON p.id = dp.person_id
       GROUP BY p.id
       ORDER BY dip_count DESC`
    );
    return rows.map((r) => ({ id: r.id, name: r.name, dipCount: r.dip_count }));
  });
}

function touchGroupUpdatedAt(db: Database, groupId: string) {
  db.run("UPDATE groups SET updated_at = ? WHERE id = ?", [new Date().toISOString(), groupId]);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function upsertSavedLocation(
  db: Database,
  name: string,
  latitude: number,
  longitude: number
) {
  const all = queryAll<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  }>(db, "SELECT id, name, latitude, longitude FROM saved_locations");

  const near = all.find((loc) => haversineKm(loc.latitude, loc.longitude, latitude, longitude) < 0.3);

  const now = new Date().toISOString();
  if (near) {
    db.run(
      "UPDATE saved_locations SET name = ?, latitude = ?, longitude = ?, last_used_at = ? WHERE id = ?",
      [name, latitude, longitude, now, near.id]
    );
  } else {
    db.run(
      "INSERT INTO saved_locations (name, latitude, longitude, last_used_at) VALUES (?, ?, ?, ?)",
      [name, latitude, longitude, now]
    );
  }
}

export async function getSavedLocationsNear(
  lat: number,
  lon: number,
  radiusKm = 3
): Promise<Array<{ name: string; latitude: number; longitude: number }>> {
  return withDb((db) => {
    const all = queryAll<{
      name: string;
      latitude: number;
      longitude: number;
      last_used_at: string;
    }>(db, "SELECT name, latitude, longitude, last_used_at FROM saved_locations ORDER BY last_used_at DESC");

    return all
      .map((loc) => ({
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        dist: haversineKm(lat, lon, loc.latitude, loc.longitude),
      }))
      .filter((loc) => loc.dist <= radiusKm)
      .sort((a, b) => a.dist - b.dist)
      .map(({ name, latitude, longitude }) => ({ name, latitude, longitude }));
  });
}

export async function listSavedLocations(): Promise<
  Array<{ name: string; latitude: number; longitude: number }>
> {
  return withDb((db) => {
    const rows = queryAll<{
      name: string;
      latitude: number;
      longitude: number;
    }>(
      db,
      "SELECT name, latitude, longitude FROM saved_locations ORDER BY last_used_at DESC LIMIT 10"
    );
    return rows;
  });
}

export interface GroupSyncData {
  group: Group;
  persons: Person[];
  dips: Dip[];
  personGroupLinks: Array<{ personId: number; groupId: string }>;
}

export async function mergeGroupSync(data: GroupSyncData): Promise<void> {
  return withDb((db) => {
    const existing = getGroupSync(db, data.group.id);
    if (existing && existing.updatedAt > data.group.updatedAt) {
      return;
    }

    if (existing) {
      db.run(
        `UPDATE groups SET name = ?, owner_user_id = ?, share_code = ?, is_shared = 1, role = ?, updated_at = ?
         WHERE id = ?`,
        [
          data.group.name,
          data.group.ownerUserId,
          data.group.shareCode,
          data.group.role,
          data.group.updatedAt,
          data.group.id,
        ]
      );
    } else {
      db.run(
        `INSERT INTO groups (id, name, owner_user_id, share_code, is_shared, role, updated_at, created_at)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          data.group.id,
          data.group.name,
          data.group.ownerUserId,
          data.group.shareCode,
          data.group.role,
          data.group.updatedAt,
          data.group.createdAt,
        ]
      );
    }

    for (const person of data.persons) {
      const existingPerson = queryAll<{ id: number }>(
        db,
        "SELECT id FROM persons WHERE id = ?",
        [person.id]
      );
      if (!existingPerson.length) {
        const byName = queryAll<{ id: number; name: string; created_at: string }>(
          db,
          "SELECT id, name, created_at FROM persons WHERE name = ? COLLATE NOCASE",
          [person.name]
        );
        if (byName.length) {
          person.id = byName[0].id;
        } else {
          db.run("INSERT INTO persons (id, name, created_at) VALUES (?, ?, ?)", [
            person.id,
            person.name,
            person.createdAt,
          ]);
        }
      }
    }

    for (const link of data.personGroupLinks) {
      db.run("INSERT OR IGNORE INTO person_groups (person_id, group_id) VALUES (?, ?)", [
        link.personId,
        link.groupId,
      ]);
    }

    for (const dip of data.dips) {
      const existingDip = queryAll<{ id: number }>(db, "SELECT id FROM dips WHERE id = ?", [
        dip.id,
      ]);
      if (!existingDip.length) {
        db.run(
          `INSERT INTO dips (id, group_id, location_name, latitude, longitude, water_temp, air_temp,
           weather_description, weather_icon, wind_speed, dipped_at, notes, images, created_by_user_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dip.id,
            dip.groupId,
            dip.locationName,
            dip.latitude,
            dip.longitude,
            dip.waterTemp,
            dip.airTemp,
            dip.weatherDescription,
            dip.weatherIcon,
            dip.windSpeed,
            dip.dippedAt,
            dip.notes,
            JSON.stringify(dip.images),
            dip.createdByUserId,
            dip.createdAt,
          ]
        );
        for (const p of dip.participants) {
          db.run("INSERT OR IGNORE INTO dip_participants (dip_id, person_id) VALUES (?, ?)", [
            dip.id,
            p.id,
          ]);
        }
      } else {
        db.run(
          `UPDATE dips SET location_name = ?, latitude = ?, longitude = ?, water_temp = ?,
           air_temp = ?, weather_description = ?, weather_icon = ?, wind_speed = ?,
           dipped_at = ?, notes = ?, images = ?, created_by_user_id = ? WHERE id = ?`,
          [
            dip.locationName,
            dip.latitude,
            dip.longitude,
            dip.waterTemp,
            dip.airTemp,
            dip.weatherDescription,
            dip.weatherIcon,
            dip.windSpeed,
            dip.dippedAt,
            dip.notes,
            JSON.stringify(dip.images),
            dip.createdByUserId,
            dip.id,
          ]
        );
        db.run("DELETE FROM dip_participants WHERE dip_id = ?", [dip.id]);
        for (const p of dip.participants) {
          db.run("INSERT INTO dip_participants (dip_id, person_id) VALUES (?, ?)", [
            dip.id,
            p.id,
          ]);
        }
      }
    }
  });
}

export async function exportGroupForUpload(groupId: string): Promise<GroupSyncData> {
  return withDb((db) => {
    const group = getGroupSync(db, groupId);
    if (!group) throw new Error("NOT_FOUND");

    const persons = queryAll<{ id: number; name: string; created_at: string }>(
      db,
      `SELECT p.id, p.name, p.created_at FROM persons p
       JOIN person_groups pg ON pg.person_id = p.id
       WHERE pg.group_id = ?`,
      [groupId]
    );

    const dips = queryAll<DipRow>(db, "SELECT * FROM dips WHERE group_id = ?", [groupId]);

    return {
      group,
      persons: persons.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.created_at,
      })),
      dips: dips.map((d) => mapDipRow(db, d)),
      personGroupLinks: persons.map((p) => ({ personId: p.id, groupId })),
    };
  });
}

export async function canEditDip(dipId: number, userId: string): Promise<boolean> {
  return withDb((db) => {
    const dip = queryAll<{ created_by_user_id: string | null; group_id: string }>(
      db,
      "SELECT created_by_user_id, group_id FROM dips WHERE id = ?",
      [dipId]
    )[0];
    if (!dip) return false;

    const group = getGroupSync(db, dip.group_id);
    if (!group) return true;
    if (!group.isShared) return true;
    if (group.role === "owner") return true;
    return dip.created_by_user_id === userId;
  });
}

export async function canEditGroup(groupId: string): Promise<boolean> {
  return withDb((db) => {
    const group = getGroupSync(db, groupId);
    if (!group) return false;
    if (!group.isShared) return true;
    return group.role === "owner";
  });
}
