import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl =
  process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "data", "badloggen.db")}`;

const isTurso =
  databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: isTurso ? "turso" : "sqlite",
  dbCredentials: isTurso
    ? {
        url: databaseUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN!,
      }
    : {
        url: databaseUrl,
      },
});
