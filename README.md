# Pokémon GO Events på svenska

En webbsida på lättläst svenska som visar pågående och kommande Pokémon GO-events,
byggd för barn med lässvårigheter. Se [PRD-pokemon-events.md](PRD-pokemon-events.md)
för hela kravbilden.

## Hur det fungerar

```
ScrapedDuck (events.json)
        │  1 gång/dygn via GitHub Actions (.github/workflows/uppdatera-events.yml)
        ▼
scripts/build.js: hämta → validera → översätt (ordlista + mallar)
        │
        ▼
docs/events-sv.json (committas i repot)
        │
        ▼
Statisk sida på GitHub Pages (docs/ — läser endast färdig svensk JSON)
```

Inga beroenden: frontenden är ren HTML/CSS/JS och byggskriptet använder bara Node.js
standardbibliotek. Klassificeringen "Pågår nu / Kommer snart" sker i webbläsaren vid
sidladdning, så sidan är korrekt även om ett dygnsbygge uteblir.

## Kommandon

```bash
npm test       # kör alla tester (node:test, inga beroenden)
npm run build  # hämtar ScrapedDuck-data och bygger docs/events-sv.json
```

Testa sidan lokalt:

```bash
cd docs && python3 -m http.server 8000
# öppna http://localhost:8000
```

Sidan visar också en sektion **"Raids just nu"** från ScrapedDucks `raids.json`
(aktuella raidbossar per nivå). Den hämtas i samma dygnsbygge; misslyckas den
behålls förra versionen och eventbygget räknas ändå som lyckat.

För events med vilda spawns som saknar strukturerad Pokémon-data hämtar bygget
dessutom eventsidans spawns-sektion från LeekDuck (strukturerad HTML, typiskt
1–5 sidor per dygn) och visar den som **"Finns att fånga:"** på kortet.
Fel på en enskild sida är icke-fatalt. Se PRD:ns ändringslogg (v1.1).

## Underhåll

- **Ny engelsk term dyker upp oöversatt på sidan?** Lägg till den i
  `data/ordlista.json` (bonusar eller eventtyper). Okända termer loggas vid bygget
  och skrivs till `data/okanda-termer.json`.
- **Fel regionsetikett?** Komplettera `data/regioner.json`. Termer som täcker Sverige
  → `gallerISverige`, termer/städer som utesluter Sverige → `gallerInte`.
  Vid osäkerhet visar sidan "Osäkert – kolla 🟡" — den gissar aldrig grönt.
- **Bygget misslyckas?** Sidan visar senaste lyckade data. Kolla Actions-fliken på
  GitHub för felmeddelandet.

## Etapp 8 (AI-översättning) är inte byggd ännu

Allt på sidan översätts deterministiskt via ordlista och mallar. AI-översättning av
unika texter (med cache och granskningsvy) är nästa version — se PRD etapp 8 och 10.
