# Bidra till Badloggen

Tack för att du vill hjälpa till! Badloggen är ett öppet källkodsprojekt och vi välkomnar pull requests och feature requests.

## Så här bidrar du

1. **Öppna en issue** (valfritt men uppskattat) – Beskriv buggen eller idén innan du börjar koda
2. **Forka repot** och skapa en branch från `main`
3. **Gör dina ändringar** och testa lokalt (`npm install` → `npm run dev`)
4. **Öppna en pull request** mot `main` med en tydlig beskrivning av vad som ändrats och varför
5. **Vänta på granskning** – En maintainer granskar och mergar PR:n

## Pull requests och granskning

**Du kan inte (och ska inte) pusha direkt till `main`.** Alla ändringar går via pull request som granskas av en maintainer innan merge.

Det gäller även deploy: produktion uppdateras först när en godkänd PR har mergats till `main`. Vanliga bidragsgivare behöver inte (och kan inte) deploya själva.

### För maintainers (repoägare)

Aktivera branch protection på `main` i GitHub:

1. Gå till **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Aktivera:
   - **Require a pull request before merging**
   - **Require approvals** (minst 1)
   - **Restrict who can push to matching branches** (lägg till dig själv och eventuella med-maintainers)
4. Spara

Då kan bara godkända PR:er nå `main`, och Vercel/GitHub Pages deployar först efter merge.

## Kodstil

- Följ befintliga mönster i kodbasen
- Håll PR:er fokuserade – en sak i taget går lättare att granska
- Skriv commit-meddelanden på engelska med [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` osv.)

## Kom igång lokalt

```bash
git clone https://github.com/13pixlar/badloggen.git
cd badloggen
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000).

## Frågor?

Öppna en [issue](https://github.com/13pixlar/badloggen/issues) om något är oklart.
