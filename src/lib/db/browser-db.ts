import initSqlJs, { type Database, type SqlValue } from "sql.js";

const DB_STORAGE_KEY = "badloggen-sqlite";
const IDB_NAME = "badloggen";
const IDB_STORE = "kv";
const SCHEMA_VERSION = 3;
const WASM_PATH = process.env.NEXT_PUBLIC_BASE_PATH
  ? `${process.env.NEXT_PUBLIC_BASE_PATH}/sql-wasm.wasm`
  : "/sql-wasm.wasm";

let dbPromise: Promise<Database> | null = null;

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
    setSchemaVersion(db, SCHEMA_VERSION);
    ensureDipColumns(db);
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
    // Migrate existing dip locations into saved_locations
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

export interface Person {
  id: number;
  name: string;
  createdAt: string;
}

export interface Dip {
  id: number;
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
}

type DipRow = {
  id: number;
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
    createdAt: dip.created_at,
    participants,
  };
}

export async function listPersons(): Promise<Person[]> {
  return withDb((db) => {
    const rows = queryAll<{ id: number; name: string; created_at: string }>(
      db,
      "SELECT id, name, created_at FROM persons ORDER BY name"
    );
    return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
  });
}

export async function createPerson(name: string): Promise<Person> {
  return withDb((db) => {
    db.run("INSERT INTO persons (name, created_at) VALUES (?, ?)", [
      name,
      new Date().toISOString(),
    ]);
    const row = queryAll<{ id: number; name: string; created_at: string }>(
      db,
      "SELECT id, name, created_at FROM persons WHERE id = last_insert_rowid()"
    )[0];
    return { id: row.id, name: row.name, createdAt: row.created_at };
  });
}

export async function deletePerson(id: number): Promise<void> {
  return withDb((db) => {
    db.run("DELETE FROM dip_participants WHERE person_id = ?", [id]);
    db.run("DELETE FROM persons WHERE id = ?", [id]);
  });
}

export async function listDips(): Promise<Dip[]> {
  return withDb((db) => {
    const dips = queryAll<DipRow>(db, "SELECT * FROM dips ORDER BY dipped_at DESC");
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
      `INSERT INTO dips (location_name, latitude, longitude, water_temp, air_temp,
       weather_description, weather_icon, wind_speed, dipped_at, notes, images, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    return mapDipRow(db, queryAll<DipRow>(db, "SELECT * FROM dips WHERE id = ?", [id])[0]);
  });
}

export async function deleteDip(id: number): Promise<void> {
  return withDb((db) => {
    db.run("DELETE FROM dip_participants WHERE dip_id = ?", [id]);
    db.run("DELETE FROM dips WHERE id = ?", [id]);
  });
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return withDb((db) => {
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

