# Bidra till Badloggen

Tack för att du vill hjälpa till! Badloggen är ett öppet källkodsprojekt och vi välkomnar pull requests och feature requests.

## Så här bidrar du

1. **Öppna en issue** (valfritt men uppskattat) – Beskriv buggen eller idén innan du börjar koda
2. **Forka repot** och skapa en branch från `main`
3. **Gör dina ändringar** och testa lokalt (`npm install` → `npm run dev`)
4. **Öppna en pull request** mot `main` med en tydlig beskrivning av vad som ändrats och varför
5. **Vänta på granskning** – En maintainer granskar och mergar PR:n

## Pull requests och granskning

**Du kan inte pusha direkt till `main`.** Branchen är skyddad på GitHub och kräver pull request med minst en godkännande granskning innan merge.

Det gäller även deploy: produktion uppdateras först när en godkänd PR har mergats till `main`. Vanliga bidragsgivare behöver inte (och kan inte) deploya själva.

### Branch protection (aktiv)

Följande regler gäller för `main`:

- **Pull request krävs** – inga direkta commits till `main`, även för repoägaren
- **Minst en godkännande granskning** – en maintainer måste godkänna PR:n innan merge
- **Ingen force-push eller radering** av branchen

Endast maintainers med skrivbehörighet kan merga PR:er till `main`. Just nu är det [13pixlar](https://github.com/13pixlar).

### Lägg till med-maintainers

1. Gå till **Settings → Collaborators** och bjud in personen med **Write**-behörighet
2. Med-maintainers kan granska och merga PR:er enligt samma branch protection-regler

> **Obs:** GitHub tillåter inte per-användare push-restriktioner på personliga repon. Åtkomstkontroll sker via vem som har Write-behörighet som collaborator.

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
