<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- This is the **Badloggen** app: a single Next.js 16 (App Router) project, npm-based. Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`).
- Run dev with `npm run dev` (Turbopack, serves on `http://localhost:3000`). No `.env` file, database server, or API keys are required for local development or end-to-end testing.
- Despite the `/api/*` endpoints and Drizzle/libSQL code described in `README.md`, the running app is **fully client-side**: data is stored in an in-browser SQLite DB (`sql.js` WASM) persisted to IndexedDB (`src/lib/db/browser-db.ts`). The server-side Drizzle/libSQL code is only used by the `db:*` migration scripts, not at runtime. So testing requires a browser (data lives in IndexedDB, not on disk).
- External calls (Open-Meteo weather/marine/geocoding, OpenStreetMap Nominatim/tiles) are optional and degrade gracefully (return `null`) if blocked; the app still works without network access to them.
- `npm run lint` currently reports 1 pre-existing error (`react-hooks/set-state-in-effect` in `src/components/log-form.tsx`) and several warnings in the existing source — these are not environment issues.
