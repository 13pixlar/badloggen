# Badloggen

En svensk webbapp för att logga utomhusbad och dopp i Sverige.

## Funktioner

- **Badare** – Lägg till personer i din lista
- **Logga bad** – Registrera bad med plats, deltagare, väder och vattentemperatur
- **Topplista** – Se vem som badat mest
- **Historik** – Bläddra bland alla loggade bad
- **Platsförslag** – Sök badplatser via OpenStreetMap (begränsat till Sverige)
- **Väder** – Hämtas automatiskt från Open-Meteo
- **Vattentemperatur** – Hämtas från Open-Meteo Marine eller SMHI-stationer

## Teknik

- [Next.js](https://nextjs.org/) 16 (App Router)
- [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS
- [SQLite](https://www.sqlite.org/) via [Drizzle ORM](https://orm.drizzle.team/) + [libSQL](https://github.com/tursodatabase/libsql)
- Svensk lokalisering

## Kom igång lokalt

```bash
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

Databasen skapas automatiskt i `data/badloggen.db` vid första anrop.

## Miljövariabler

| Variabel | Beskrivning |
|----------|-------------|
| `DATABASE_URL` | SQLite-fil (`file:./data/badloggen.db`) eller Turso URL (`libsql://...`) |
| `DATABASE_AUTH_TOKEN` | Turso auth token (krävs för Turso) |

## Deploy (live)

Appen deployas automatiskt till **GitHub Pages** vid push till `main`:

**https://13pixlar.github.io/badloggen/**

Databasen körs i webbläsaren (SQLite via sql.js) – ingen server behövs.

### Alternativ: Vercel

Workflow finns i `.github/workflows/vercel.yml` (manuell körning). Kräver secrets:
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## Deploy på Vercel (tillfälligt)

1. Pusha till GitHub/GitLab
2. Importera projektet på [vercel.com](https://vercel.com)
3. Skapa en gratis [Turso](https://turso.tech/)-databas (SQLite-kompatibel):
   ```bash
   turso db create badloggen
   turso db show badloggen --url
   turso db tokens create badloggen
   ```
4. Lägg till miljövariabler i Vercel:
   - `DATABASE_URL` = Turso URL
   - `DATABASE_AUTH_TOKEN` = Turso token
5. Deploy!

> **Obs:** Vercel har inget persistent filsystem. Använd Turso för SQLite i molnet, eller migrera till en Digital Ocean Droplet med lokal SQLite-fil.

## Migrera till Digital Ocean Droplet

1. Klona repot på dropleten
2. Installera Node.js 20+
3. Sätt `DATABASE_URL=file:./data/badloggen.db` (eller exportera Turso-data)
4. Kör `npm install && npm run build && npm start`
5. Använd nginx som reverse proxy + Let's Encrypt för HTTPS

## API-endpoints

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET/POST | `/api/persons` | Lista/skapa badare |
| DELETE | `/api/persons/[id]` | Ta bort badare |
| GET/POST | `/api/dips` | Lista/skapa bad |
| GET | `/api/leaderboard` | Topplista |
| GET | `/api/locations?q=` | Sök badplatser |
| GET | `/api/weather?lat=&lon=` | Väder och vattentemp |
