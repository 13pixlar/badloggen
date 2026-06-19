import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import fs from "fs";

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;
let migrated = false;

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return `file:${path.join(dataDir, "badloggen.db")}`;
}

export function getDb() {
  if (!db) {
    client = createClient({ url: getDatabaseUrl() });
    db = drizzle(client, { schema });
  }
  return db;
}

export async function ensureMigrated() {
  if (migrated) return;
  const database = getDb();
  await migrate(database, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  migrated = true;
}
