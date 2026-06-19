import initSqlJs, { type Database, type SqlValue } from "sql.js";

const DB_STORAGE_KEY = "badloggen-sqlite";
const WASM_PATH = process.env.NEXT_PUBLIC_BASE_PATH
  ? `${process.env.NEXT_PUBLIC_BASE_PATH}/sql-wasm.wasm`
  : "/sql-wasm.wasm";

let dbPromise: Promise<Database> | null = null;

function runMigrations(db: Database) {
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
      dipped_at TEXT NOT NULL,
      notes TEXT,
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
}

function persistDb(db: Database) {
  if (typeof window === "undefined") return;
  const data = db.export();
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
}

export async function getBrowserDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => WASM_PATH });
      const saved = typeof window !== "undefined" ? localStorage.getItem(DB_STORAGE_KEY) : null;

      let db: Database;
      if (saved) {
        const binary = atob(saved);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        db = new SQL.Database(bytes);
      } else {
        db = new SQL.Database();
        runMigrations(db);
        persistDb(db);
      }

      return db;
    })();
  }

  return dbPromise;
}

export async function withDb<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getBrowserDb();
  const result = fn(db);
  persistDb(db);
  return result;
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
  dippedAt: string;
  notes: string | null;
  createdAt: string;
  participants: Array<{ id: number; name: string }>;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  dipCount: number;
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
    const dips = queryAll<{
      id: number;
      location_name: string;
      latitude: number;
      longitude: number;
      water_temp: number | null;
      air_temp: number | null;
      weather_description: string | null;
      weather_icon: string | null;
      dipped_at: string;
      notes: string | null;
      created_at: string;
    }>(db, "SELECT * FROM dips ORDER BY dipped_at DESC");

    return dips.map((dip) => {
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
        dippedAt: dip.dipped_at,
        notes: dip.notes,
        createdAt: dip.created_at,
        participants,
      };
    });
  });
}

export async function createDip(data: {
  locationName: string;
  latitude: number;
  longitude: number;
  waterTemp?: number | null;
  airTemp?: number | null;
  weatherDescription?: string | null;
  weatherIcon?: string | null;
  dippedAt: string;
  notes?: string | null;
  participantIds: number[];
}): Promise<Dip> {
  return withDb((db) => {
    db.run(
      `INSERT INTO dips (location_name, latitude, longitude, water_temp, air_temp,
       weather_description, weather_icon, dipped_at, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.locationName,
        data.latitude,
        data.longitude,
        data.waterTemp ?? null,
        data.airTemp ?? null,
        data.weatherDescription ?? null,
        data.weatherIcon ?? null,
        data.dippedAt,
        data.notes ?? null,
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

    const dip = queryAll<{
      id: number;
      location_name: string;
      latitude: number;
      longitude: number;
      water_temp: number | null;
      air_temp: number | null;
      weather_description: string | null;
      weather_icon: string | null;
      dipped_at: string;
      notes: string | null;
      created_at: string;
    }>(db, "SELECT * FROM dips WHERE id = ?", [dipId])[0];

    const participants = queryAll<{ id: number; name: string }>(
      db,
      `SELECT p.id, p.name FROM dip_participants dp
       JOIN persons p ON p.id = dp.person_id WHERE dp.dip_id = ?`,
      [dipId]
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
      dippedAt: dip.dipped_at,
      notes: dip.notes,
      createdAt: dip.created_at,
      participants,
    };
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
