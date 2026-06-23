import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import fs from "fs";
import { getLibsqlConfig, isRemoteDatabase } from "./client-config";

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;
let migrated = false;

function getLocalDatabaseUrl(): string {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return `file:${path.join(dataDir, "badloggen.db")}`;
}

function resolveDatabaseUrl(): string {
  const { url } = getLibsqlConfig();
  return url || getLocalDatabaseUrl();
}

function createDbClient(): Client {
  const { url, authToken } = getLibsqlConfig();
  const resolvedUrl = url || getLocalDatabaseUrl();

  if (isRemoteDatabase(resolvedUrl) && !authToken) {
    throw new Error(
      "DATABASE_AUTH_TOKEN is required when DATABASE_URL points to Turso/libSQL remote"
    );
  }

  return createClient(
    authToken ? { url: resolvedUrl, authToken } : { url: resolvedUrl }
  );
}

export function getDb() {
  if (!db) {
    client = createDbClient();
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

export function getDatabaseUrl(): string {
  return resolveDatabaseUrl();
}

export function isUsingRemoteDatabase(): boolean {
  const { url } = getLibsqlConfig();
  return Boolean(url && isRemoteDatabase(url));
}
