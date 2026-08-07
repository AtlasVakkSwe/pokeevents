# Design: Kalendervy (v2.0)

**Datum:** 2026-07-08 · **Status:** Godkänd av Toni efter visuell brainstorm (mockuper i `.superpowers/brainstorm/`)

## Problem

Barntestet visade att sidan är rörig och svår att överblicka — särskilt *vad som gäller
för respektive dag*. Långkörare (Säsong, GO Pass, Battle League) skymmer det viktiga,
och de stora korten gör att bara 1–2 events syns per skärm.

## Beslut

Listvyn ("Pågår nu"/"Kommer snart" med stora kort och "Visa mer") ersätts av en
**dagindelad kalender med kompakta bildrader**, en **NU-panel** och en **bottom sheet**
för detaljer. Valt genom tre mockup-omgångar: riktning C (kompakt kalender) →
variant C+ (bildrader + NU-panel, viktigt för barn med lässvårigheter: bilden känns
igen snabbare än ordet) → bottom sheet framför expandera-på-plats.

## Sidans struktur

1. **NU-panel** — visas endast när minst ett *kort* event (längd ≤ 24 h) pågår just nu:
   Rampljustimme, Raid Hour, Community Day, Raid Day, Max Monday. Grön ram,
   "NU · slutar kl 19", Pokémon-bild, bonus. Tryck → bottom sheet.
   Pågår inget kort event visas ingen panel.
2. **Kalender** — dagrubriker: "IDAG · tisdag 8 juli" (grön), "IMORGON · onsdag 9 juli",
   sedan "TORSDAG 10 juli" osv; lör/sön i blått med 🎉. Under varje dag: bildrader för
   events aktiva den dagen. Dagar utan innehåll hoppas över (IDAG visas alltid).
   Events i NU-panelen dubbleras inte under IDAG.
3. **"Raider idag"** — syntetisk rad under IDAG med bossminiatyrer från `raids-sv.json`
   → bottom sheet med nivågrupper. Ersätter sektionen "Raids just nu".
4. **"Pågår hela tiden"** — nedtonad, hopfällbar rad längst ner för långkörare.
5. **Sidfot** — "Uppdaterad …" som idag.

## Regler och logik

- **Långkörare**: eventtyp ∈ {season, go-pass, go-battle-league, twitch-drops} ELLER
  längd > 14 dygn. Pågående långkörare → strippen; ej påbörjade → kalenderrad på
  startdagen; avslutade → visas inte.
- **Dagtillhörighet**: ~~event visas på sin startdag, sin slutdag ("till kl X" =
  sista chansen) och under Idag om det pågår — men inte på mellandagar
  (justerat efter första renderingen: upprepade rader varje dag blev brus).~~
  **Upphävd 2026-08-07** — en rad per event: pågående under Idag, kommande på sin
  startdag. Se `specs/2026-08-07-nedrakning-design.md`. Slutdagsraden fick eventet
  att se ut som en endagsföreteelse, eftersom det inte syntes på dagarna före.
- **Sortering inom dag**: starttid, äldst först (pågående överst, sedan dagens nya).
- **Tidschip**: startar+slutar samma dag → "kl 10–18"; startar denna dag, slutar
  senare → "från kl 6"; började tidigare, slutar denna dag → "till kl 22"; började
  tidigare, slutar senare → "t.o.m. fredag" (veckodag om < 7 dagar bort, annars datum).
- **Radbild**: Pokémon-ikon (`pokemon[0].bild`) för rampljustimme/raid-typer/community
  day, annars eventbilden. Bildfel → bilden döljs, namnet står kvar.
- **Sverige-status**: "gäller inte"-rader nedtonade med ✗-markering; osäkert → 🟡.
  Full etikett i bottom sheet.

## Bottom sheet

Glider upp underifrån över nedtonad bakgrund. Innehåll: eventbild, typrubrik + namn,
fullständig tid (formatTidsspann), Sverige-etikett, lättläst sammanfattning, "Finns
att fånga" (alla), bonusar, "Raids under eventet" (alla), länk till LeekDuck. Stängs
med ✕, tryck på bakgrunden eller mobilens bakåtknapp (`history.pushState`/`popstate`).
Bakgrundsscroll låses medan öppen. Tryckytor ≥ 44 px.

## Teknik

- Ingen ny data: allt finns i `events-sv.json` + `raids-sv.json`. Byggskriptet rörs inte.
- Ny modul `docs/lib/kalender.js` (ren logik, TDD): `grupperaKalender(events, nu)` →
  `{ nuPanel: [...], dagar: [{nyckel, datum, events}], alltidPagaende: [...] }`.
- `docs/lib/tid.js` utökas (TDD): `formatDagRubrik(date, nu)`, `formatChip(event, dagDatum, nu)`.
- `docs/app.js` + `docs/styles.css` skrivs om; `klassificera.js` utgår ur frontend
  (kalendergrupperingen tar över). Samma palett, samma säkerhetsregler
  (textContent, CSP, inga beroenden).
- Acceptanskriterier från PRD etapp 4 gäller oförändrat: text ≥ 18 px (radnamn 17–18 px),
  tryckytor ≥ 44 px (rader ≥ 48 px), WCAG AA, 360 px utan horisontell skroll.

## Testning

- TDD för kalender.js och tid.js-utökningarna (dagtillhörighet, långkörarregeln,
  NU-logik, chip-texter, dygnsgränser i svensk tid).
- Manuell/headless verifiering: 360 px-skärmdump, bottom sheet-innehåll i DOM,
  inga konsolfel.

## Utanför scope

Etapp 8 (AI-översättning) och etapp 10 påverkas inte. Ingen ny datainsamling.
