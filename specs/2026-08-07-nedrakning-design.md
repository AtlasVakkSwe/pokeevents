# Design: Nedräkning på eventtider (v2.1)

**Datum:** 2026-08-07 · **Status:** Godkänd av Toni efter brainstorm

## Problem

Sidan svarar idag på PRD:ns fråga *när börjar nästa event?* med ett klockslag: "kl 18".
Att omsätta det till hur länge man behöver vänta kräver att barnet räknar — subtraktion
med klockslag, precis den sortens uppgift målgruppen har svårt för. En nedräkning kräver
ingen räkning alls.

Samma sak för pågående events: "kl 10–20" säger inte hur mycket tid som är kvar att
hinna med.

## Beslut

Varje plats som visar en eventtid visar hädanefter **både klockslag och återstående
tid**. Klockslagen behålls oförändrade — nedräkningen läggs till, den ersätter ingenting.

Övervägt och valt bort under brainstormen:

- **Uppläsning (text-to-speech).** Korten innehåller oöversatt engelska (Pokémon-namn,
  eventnamn). Svensk uppläsning av "Mega Blaziken in Mega Raids" blir obegriplig.
- **Nedräkning bara på det som är nära i tid.** Toni valde konsekvent visning på alla
  rader; en rad ska betyda samma sak oavsett var i kalendern den står.

## Vad som visas var

Kalenderraden blir tvåradig: namnet överst som idag, därunder en tidsrad
`klockslag · nedräkning` i mindre stil. Tvåradigheten är vald för att båda värdena
ska rymmas på 360 px utan att namnet kortas med ellips.

| Plats | Före | Efter |
|---|---|---|
| Kalenderrad | `kl 18–19` | `kl 18–19 · slutar om 40 minuter` |
| NU-panel | `NU · slutar kl 18` | `NU` + `kl 18–19 · slutar om 40 minuter` |
| Bottom sheet | `🕐 Idag kl 18–19` | `🕐 Idag kl 18–19 · börjar om 2 timmar` |
| Pågår hela tiden | `t.o.m. 8 september` | `t.o.m. 8 september · slutar om 32 dagar` |

Klockslagsdelen är oförändrad `formatChip`-text i kalenderraderna och strippen
(`kl 10–18`, `från kl 6`, `till kl 22`, `t.o.m. fredag`) respektive `formatTidsspann`
i bottom sheet.

Raden "Raider idag" är syntetisk och har inga egna start-/sluttider. Den behåller
`hela dagen` utan nedräkning.

## Regler

**Måltidpunkt.** Nedräkningen pekar alltid på eventets nästa gräns: har eventet inte
börjat räknas det ner till starten, har det börjat räknas det ner till slutet.
Ordet "slutar" skiljer de två fallen, så betydelsen bärs av text och inte enbart av
den gröna markeringen för pågående.

Följden är att ett event får samma nedräkning oavsett vilken dag raden står under.
Ett flerdagarsevent som syns både under Idag och under sin slutdag säger
`slutar om 3 dagar` på båda ställena; två rader för samma event kan aldrig motsäga
varandra.

**Språktrappa.** Utskrivna ord, en enhet:

| Återstår | Ej börjat | Pågår |
|---|---|---|
| under 1 minut | `börjar nu` | `slutar strax` |
| senare samma dygn, under 1 timme | `om 45 minuter` | `slutar om 40 minuter` |
| senare samma dygn, en timme eller mer | `om 2 timmar` | `slutar om 5 timmar` |
| ett senare datum | `om 9 dagar` | `slutar om 32 dagar` |
| redan passerat | — | `har slutat` |

Singularformer: `om 1 minut`, `om 1 timme`, `om 1 dag` (och `slutar om 1 minut` osv).

Förkortningar (`tim`, `dgr`) används inte — de är extra avkodningsarbete för en ovan
läsare, och tvåradslayouten ger plats för hela ord.

**Dygn räknas i kalenderdagar, inte i förflutna 24-timmarsperioder.** Barn tänker i
sömnar. Är det fredag ska ett event på måndag stå `om 3 dagar` oavsett vad klockan är
— även klockan 22 på fredagskvällen, när den förflutna tiden bara är 60 timmar och en
24-timmarsräkning hade sagt `om 2 dagar`. Följden är att gränsen mellan timmar och
dagar ligger vid midnatt och inte vid 24 timmar: ett event 09.00 imorgon står som
`om 1 dag` även när klockan är 23.30 ikväll. Det är avsiktligt — klockslaget står
bredvid i samma rad och visar hur nära det faktiskt är.

Kalenderdagarna räknas på datumkomponenterna i svensk tid, aldrig på förfluten tid,
så sommartidsskiftets 23- och 25-timmarsdygn inte kan förskjuta räkningen.

**Minuter och timmar avrundas nedåt.** `om 2 timmar` visas alltså även när det
återstår 2 timmar och 50 minuter. Valet är medvetet: underskattning gör att barnet
kommer för tidigt i stället för för sent, och för `slutar om` skyndar en snålare
siffra på i stället för att invagga. Dygnsräkningen är däremot exakt — en kalenderdag
är inte en avrundning av något.

## Att siffran förblir sann

En nedräkning som står still ljuger. Två mekanismer:

**Tickning.** En timer uppdaterar var 30:e sekund enbart texten i nedräkningsnoderna,
inte hela vyn — inget hoppar och sidans skrollposition rörs inte. Timern pausas när
dokumentet inte är synligt.

**Omritning vid återkomst.** När appen blir synlig igen jämförs klockan med tidpunkten
för senaste rendering. Har mer än fem minuter gått ritas hela vyn om från grunden med
ett nytt `nu`.

Omritningen rättar samtidigt ett befintligt fel: `nu` sätts idag en enda gång vid
sidladdning (`app.js`, i `start()`). Ligger appen kvar på hemskärmen och barnet
återvänder nästa dag visas gårdagens kalender tills sidan laddas om manuellt. Felet är
svårt att upptäcka idag men skulle bli uppenbart med en nedräkning bredvid.

## Teknik

- **Ingen ny data.** `events-sv.json` och `raids-sv.json` räcker; byggskriptet och
  workflowen rörs inte.
- **`docs/lib/tid.js`** får en ren funktion för nedräkningstexten, granne med
  `formatChip` som gör motsvarande jobb för klockslagen. In: måltidpunkt, `nu`, och
  om eventet pågår. Ut: färdig sträng. Inga DOM-beroenden.
- **`docs/app.js`**: raden byggs om till namn plus tidsrad. Ett register över de noder
  som ska tickas hålls i modulen, så timern slipper leta i DOM:en. Bottom sheetens
  tidsrad registreras när den öppnas och avregistreras när den stängs, så registret
  inte växer för varje öppnat event. Tickning och `visibilitychange`-hantering
  läggs till.
- **`docs/lib/kalender.js` rörs inte** — grupperingen är oförändrad.
- **`docs/styles.css`**: regler för tvåradsraden.
- Oförändrade säkerhets- och tillgänglighetsregler: all extern data via `textContent`,
  CSP orörd, noll beroenden, tryckytor ≥ 44 px, 360 px utan horisontell skroll.
  Radnamnet behåller storleken från v2.0-specen; tidsraden sätts mindre än namnet men
  inte under 15 px, och ska klara WCAG AA mot bakgrunden trots den mindre graden.
  Raden blir högre av den extra textraden — höjden får inte understiga nuvarande
  tryckyta.

## Testning

TDD för nedräkningsfunktionen i `test/tid.test.js`, bredvid de befintliga tidstesterna.
Täcker varje gräns i trappan (59 s mot 60 s, 59 min mot 60 min, midnatt som gräns
mellan timmar och dagar), båda riktningarna (ej börjat / pågår), singularformerna,
att minuter och timmar avrundas nedåt, att fredag→måndag ger tre dagar oavsett
klockslag, och att sommartidsskiftet inte förskjuter dygnsräkningen.

Verifiering utöver enhetstesterna: 360 px-rendering utan horisontell skroll, och att
samtliga befintliga tester fortsätter passera.

## Utanför scope

Etapp 8 (AI-översättning) och etapp 10 (granskningsvy) påverkas inte. Kalendergruppering,
Sverige-etiketter, spawn-listor och bottom sheetens övriga innehåll är oförändrade.
Ingen ny datainsamling, ingen lagring i webbläsaren.
