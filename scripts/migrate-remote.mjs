#!/usr/bin/env node
/**
 * Run Drizzle migrations against the configured DATABASE_URL (Turso or local file).
 * Used in CI/Vercel build when DATABASE_URL is set.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL not set — skipping remote migration.");
  process.exit(0);
}

const authToken = process.env.DATABASE_AUTH_TOKEN;
const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

if (isRemote && !authToken) {
  console.error("DATABASE_AUTH_TOKEN is required for remote Turso databases.");
  process.exit(1);
}

const client = createClient(authToken ? { url, authToken } : { url });
const db = drizzle(client);

console.log(`Running migrations against ${isRemote ? "Turso" : "local"} database…`);
await migrate(db, { migrationsFolder: path.join(root, "drizzle") });
console.log("Migrations complete.");
await client.close();
