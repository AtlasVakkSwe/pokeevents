# Design: Lättläst kalender (v2.2)

**Datum:** 2026-09-13 · **Status:** Godkänd av Toni efter utvärdering av dagens kalender

## Problem

Barnen använder sidan mycket, men en rendering av dagens kalender (52 events, 46 rader,
32 dagar med innehåll, 76 dagar framåt) visade var läsbördan ligger:

- Nästan varje radnamn är LeekDucks engelska rubrik: `Zacian (Hero of Many Battles) in
  5-star Raid Battles`, `Dynamax Rhyhorn during Max Monday`. PRD:ns femsekundersregel
  faller på namnet, inte på tiderna.
- GO Battle League står för 11 av 46 rader med de längsta namnen på sidan, och svarar
  inte på någon av barnens fyra frågor.
- 15 events saknar svensk text helt, däribland de barnen frågar mest om (Harvest
  Festival, Hatch Day, Max Battle Day, Wild Area).
- Under Idag säger raden "Raider idag" och tre separata rader för pågående
  raidrotationer samma sak.
- Kalendern sträcker sig 76 dagar fram. Barn planerar inte två månader.

Därtill saknas två små bekvämligheter: eventtypen syns inte på raden utan att läsa, och
sidan saknar mörkt läge trots att Rampljustimmen ligger kl 18–19.

## Beslut

Åtta ändringar, alla utan nya beroenden, utan ny datakälla och med CSP orörd. Nummer 1
och 5 sker i bygget, 2–4 och 6–7 i frontenden, 8 i PRD:n.

### 1. Lättlästa namn

Bygget lägger till fältet `namn` på varje event: ett svenskt, kortare namn härlett
deterministiskt ur LeekDucks rubrikmönster. `name` (originalet) ligger kvar och visas i
detaljvyn under det lättlästa namnet, i mindre stil, när de två skiljer sig.

Regler, i ordning:

1. Suffix efter ` | ` klipps (`… | Twilight Trails`).
2. Parenteser med formnamn klipps ur: `Zacian (Hero of Many Battles)` → `Zacian`.
3. Mönster per eventtyp. `X` är den del av namnet som återstår; i `X` ersätts `, and `
   och ` and ` med ` och `.

| Typ | Mönster | Blir |
|---|---|---|
| `raid-battles` | `X in <nivå>` | `X i <nivå på svenska>` |
| `pokemon-spotlight-hour` | `X Spotlight Hour` | `Rampljustimme: X` |
| `raid-hour` | `X Raid Hour` | `Raidtimme: X` |
| `raid-day` | `X [Super] [Mega] Raid Day` | `Raiddag: X`, eller `Raiddag` om X är tomt |
| `max-mondays` | `Dynamax X during Max Monday` | `Max-måndag: X` |
| `max-battles` | `X Max Battle Day` | `Max-stridsdag: X`, eller `Max-stridsdag` |
| `community-day` | `<Månad> Community Day` | `Community Day i <månad på svenska>` |
| `community-day` | `X Community Day` | `Community Day: X` |

Raidnivåerna översätts via en ny tabell `raidTyper` i `data/ordlista.json`:
`5-star Raid Battles` → `5-stjärniga raider`, `Mega Raids` → `Mega-raider`,
`Shadow Raids` → `Shadow-raider`, `Elite Raids` → `Elitraider`, samt 1-, 3- och
4-stjärniga. Okänd nivå loggas som okänd term och namnet lämnas som efter steg 1–2.

`Mystery Pokémon` blir `Hemlig Pokémon`. Ett namn som inte matchar något mönster får
`namn` lika med resultatet av steg 1–2. Pokémon-namn översätts aldrig.

PRD:ns regel "officiella eventnamn översätts aldrig" omformuleras: **originalnamnet
visas alltid i detaljvyn.** LeekDucks rubriker för raidrotationer, rampljustimmar och
Max-måndagar är inte officiella eventnamn utan beskrivningar, och de får skrivas om.

### 2. GO Battle League bort ur kalendern

Events av typen `go-battle-league` får aldrig en kalenderrad. En pågående ligaomgång
ligger kvar i "Pågår hela tiden"; kommande omgångar visas inte alls. Övriga
långkörartyper (säsong, GO Pass, Twitch) berörs inte: de visas fortfarande på sin
startdag.

### 3. Raidrotationer slås ihop under Idag

Pågående events av typen `raid-battles` som är längre än ett dygn (och därmed inte
hör hemma i NU-panelen) och kortare än långkörargränsen returneras av
`grupperaKalender` i en egen lista, `raidRotationer`, i stället för under Idag.

Frontenden avgör hur de visas:

- **Finns `raids-sv.json`:** raden "Raider idag" visar dem. Tidsraden byter från
  `hela dagen` till chip + nedräkning mot den rotation som slutar först:
  `t.o.m. tisdag · byts om 2 dagar`. Raidsheeten får, efter nivågrupperna, rubriken
  `Nya raider <veckodag>:` följt av bossbilderna för de `raid-battles`-events som
  startar närmast i tiden (alla som startar samma dag), om något sådant finns i
  kalendern.
- **Saknas `raids-sv.json`:** rotationerna ritas som vanliga rader under Idag, exakt
  som idag. Ingen information går förlorad om raidhämtningen felar.

Kommande rotationer står kvar som rader på sin startdag. Rotationer längre än 14 dagar
(t.ex. Shadow-raider som pågår en månad) är långkörare som förut och ligger i
"Pågår hela tiden".

`formatNedrakning` får en valfri fjärde parameter `verb` (standard `slutar`) så att
raidraden kan säga `byts om 2 dagar` och `byts strax` utan strängbyte i frontenden.
`har slutat` påverkas inte.

### 4. Kalendern kapas vid 30 dagar

Dagar vars datum ligger mer än 30 kalenderdagar efter idag renderas i en dold behållare
under knappen `Visa fler dagar ▾`. Ett tryck visar behållaren och tar bort knappen.
Knappen visas bara om det finns dolda dagar. Vid omritning (dagbyte, återkomst) börjar
kalendern hopfälld igen. Nedräkningarna i den dolda delen registreras som vanligt, så
de är korrekta när de visas.

### 5. Standardtexter och beskrivningsfil

Mallar i `oversatt.js` för typer som idag saknar sammanfattning:

| Typ / villkor | Text |
|---|---|
| `event` med `hasSpawns` | `Särskilda Pokémon dyker upp under eventet. Se listan.` |
| `event`, namn innehåller `Hatch Day` | `Kläckdag! Kläck ägg och få en särskild Pokémon.` |
| `wild-area` | `Wild Area: massor av Pokémon att fånga och särskilda bonusar.` |
| `max-battles` | `Extra många Max-strider.` |
| `go-pass` | `Samla poäng och få belöningar hela månaden.` |
| `season` | `Ny säsong med nya Pokémon och bonusar.` |
| `max-mondays`, `Dynamax X during Max Monday` | `X i Max-strider hela dagen.` |

Max-måndagens tidigare text `Extra Max-strider ikväll.` ersätts (eventet pågår kl 6–21).
`event` utan spawns och utan namnträff får fortsatt `null`.

Ny fil `data/beskrivningar.json`: `{ "kommentar": …, "beskrivningar": { "<originalnamn>":
"<svensk text>" } }`. En träff på originalnamnet slår alltid mallen. Filen skapas med
tom lista; Toni fyller på.

Ny loggfil `data/saknar-beskrivning.json`, skriven av bygget: pågående och kommande
events som saknar post i beskrivningsfilen och vars typ saknar egen mall (typerna
`event`, `wild-area`, `max-battles`, `go-pass`, `season` samt okända typer), som
`{ uppdaterad, events: [{ name, typ, start, link }] }` sorterat på start. Workflowen
stagear `data/`, så filen följer med automatiskt.

### 6. Färgkant per eventtyp

Varje kalenderrad får en 5 px vänsterkant vars färg följer typfamiljen:

| Familj | Typer | Färg |
|---|---|---|
| raid | `raid-battles`, `raid-hour`, `raid-day`, `elite-raids`, `shadow-raids`, `raid-weekend` | röd |
| rampljus | `pokemon-spotlight-hour` | orange |
| community | `community-day` | rosa |
| max | `max-mondays`, `max-battles` | lila |
| övrigt | allt annat | ingen kant |

Ingen ny text på raden. Raden "Raider idag" räknas som raid. NU-panelen (redan grön
ram) och "Pågår hela tiden" berörs inte.

### 7. Mörkt läge

`@media (prefers-color-scheme: dark)` sätter nya värden på CSS-variablerna i `:root`.
Hårdkodade färger i `styles.css` (pilar, strip-knapp, mini-bilders vita bakgrund,
etikettfärger) flyttas till variabler först, så att det mörka läget bara är en
variabeltabell. Bakgrundens radialgradienter släcks i mörkt läge. `index.html` får en
andra `theme-color`-meta med `media="(prefers-color-scheme: dark)"`. Ingen knapp,
ingen sparad inställning. Kontrast ≥ WCAG AA även i mörkt läge.

### 8. PRD

Version 2.2, status "driftsatt", Definition of Done avbockad utom etapp 8 och 10 (barnen
använder sidan självständigt sedan augusti), namnregeln i etapp 7 omformulerad enligt
punkt 1, ändringslogg med punkterna ovan.

## Datamodell

`events-sv.json` får per event det nya fältet `namn` (sträng, alltid satt). Övriga fält
oförändrade. Frontenden använder `namn` i rader, NU-panel och som sheet-rubrik, och
`name` som underrubrik i sheeten när de skiljer sig.

`grupperaKalender` returnerar `{ nuPanel, dagar, alltidPagaende, raidRotationer }`.

## Testning

TDD med `node:test`:

- `test/oversatt.test.js`: varje namnmönster, `och`-ersättning, parentesklipp,
  suffixklipp, okänd raidnivå, nya sammanfattningsmallar, beskrivningsfil slår mall.
- `test/kalender.test.js`: GBL får ingen rad, `raidRotationer` fylls bara av pågående
  flerdagars raid-battles under 14 dagar, kort raid-battles hamnar fortsatt i NU-panelen.
- `test/tid.test.js`: `verb`-parametern.
- `test/berika.test.js`: `namn` sätts, beskrivningsfil, loggposter för saknad text.
- `test/workflow.test.js`: befintligt vaktar att `data/` stageas.

Manuellt: headless Chrome-skärmdump på 360 px i ljust och mörkt läge (inga konsolfel,
ingen horisontell skroll), samt Tonis okulära kontroll på mobilen.

## Utanför scope

Etapp 8 (AI-översättning) och etapp 10. Bilder för Max-måndagens Pokémon (ingen bild-URL
i datan). Service worker/offline.
