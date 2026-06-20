# Badloggen

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

En öppen källkods-app för att logga utomhusbad och dopp i Sverige.

**Live:** [badloggen.vercel.app](https://badloggen.vercel.app/)

## Vad är Badloggen?

Badloggen är en svensk webbapp för dig som badar utomhus – i sjöar, hav, bäckar eller vad som helst kallt nog. Appen hjälper dig och ditt gäng att hålla koll på era dopp, jämföra vem som badat mest och minnas tillbaka på tidigare äventyr.

All data lagras lokalt i webbläsaren (SQLite via sql.js och IndexedDB), så du behöver inget konto och ingen server för att komma igång.

## Vad vi vill göra

Vi bygger Badloggen som ett enkelt, roligt verktyg för utomhusbadare i Sverige. Målet är att göra det lätt att:

- **Logga varje dopp** – med plats, deltagare, väder, vattentemperatur och foton
- **Hålla en topplista** – se vem i gänget som badat mest
- **Utforska historiken** – bläddra bland alla loggade bad och redigera dem i efterhand
- **Se var ni badat** – en karta över alla era badplatser
- **Hitta badplatser** – sök platser i Sverige via OpenStreetMap

Appen är byggd med fokus på mobilen, svenska språket och att fungera direkt i webbläsaren utan installation.

## Bidra

Badloggen är ett öppet källkodsprojekt och vi välkomnar bidrag! Oavsett om du vill fixa buggar, förbättra designen, lägga till funktioner eller bara föreslå idéer – ditt engagemang uppskattas.

1. **Forka repot** och skapa en branch från `main`
2. **Gör dina ändringar** och testa lokalt
3. **Öppna en pull request** mot `main`
4. **Vänta på granskning** – en maintainer godkänner och mergar PR:n

- **Feature requests** – Öppna en [issue](https://github.com/13pixlar/badloggen/issues) om du har idéer på nya funktioner
- **Buggrapporter** – Hittat något som inte fungerar? Rapportera det i issues

**`main` är branch-skyddad på GitHub.** Direkt push till `main` blockeras – alla ändringar måste gå via pull request som godkänns av en maintainer innan merge. Endast utsedda maintainers kan merga till `main`; det triggar automatisk deploy till produktion. Se [CONTRIBUTING.md](CONTRIBUTING.md) för mer detaljer.

## Funktioner

- **Badare** – Lägg till personer i din lista
- **Logga bad** – Registrera bad med plats, deltagare, väder och vattentemperatur
- **Topplista** – Se vem som badat mest
- **Historik** – Bläddra bland alla loggade bad
- **Karta** – Se alla badplatser på en interaktiv karta
- **Platsförslag** – Sök badplatser via OpenStreetMap (begränsat till Sverige)
- **Väder** – Hämtas automatiskt från Open-Meteo
- **Vattentemperatur** – Hämtas från Open-Meteo Marine eller SMHI-stationer

## Teknik

- [Next.js](https://nextjs.org/) 16 (App Router)
- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/)
- [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/) för kartor
- [SQLite](https://www.sqlite.org/) via [sql.js](https://sql.js.org/) i webbläsaren
- Svensk lokalisering

## Kom igång lokalt

```bash
git clone https://github.com/13pixlar/badloggen.git
cd badloggen
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## Deploy

Produktion: [badloggen.vercel.app](https://badloggen.vercel.app/)

Deploy sker **automatiskt när en pull request har granskats och mergats till `main`** – inte vid push från godtyckliga branches. Vercel bygger från `main`; se [CONTRIBUTING.md](CONTRIBUTING.md) för bidragsflödet.

### Vercel (produktion)

- Sätt **Production Branch** till `main` (inte `gh-pages`)
- Branchen `gh-pages` innehåller bara statisk export för GitHub Pages och saknar källkod – Vercel kan inte bygga därifrån

### GitHub Pages (alternativ)

Statisk export till GitHub Pages sker via `.github/workflows/deploy.yml` efter merge till `main`.

## Licens

Badloggen är licensierad under [MIT-licensen](LICENSE). Du får fritt använda, modifiera och distribuera koden så länge copyright-meddelandet behålls.
