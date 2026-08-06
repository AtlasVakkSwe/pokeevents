# Nedräkning på eventtider — implementationsplan

> **För agentiska arbetare:** OBLIGATORISK SUB-SKILL: använd superpowers:subagent-driven-development (rekommenderas) eller superpowers:executing-plans för att genomföra planen uppgift för uppgift. Stegen använder checkbox-syntax (`- [ ]`) för avprickning.

**Mål:** Visa både klockslag och återstående tid på varje eventtid i appen, med en siffra som håller sig sann över tid.

**Arkitektur:** En ren formateringsfunktion i `docs/lib/tid.js` producerar nedräkningstexten. `docs/app.js` renderar kalenderraden tvåradigt (namn över tidsrad) och håller ett register över de textnoder som ska uppdateras, så en timer kan skriva om enbart dem var 30:e sekund. När appen blir synlig igen efter mer än fem minuter ritas hela vyn om med ett nytt `nu`.

**Teknikstack:** Ramverkslös ES-moduler-frontend, `node:test` för enhetstester, noll beroenden.

**Specifikation:** `specs/2026-08-07-nedrakning-design.md`

## Globala förutsättningar

- Noll frontend-beroenden. Inga npm-paket, inga CDN-resurser, ingen ny fil-import utöver de befintliga modulerna.
- All extern data sätts med `textContent`, aldrig `innerHTML`. Gäller även nya noder.
- CSP i `docs/index.html` rörs inte.
- Tryckytor ≥ 44 px. Kalenderradens `min-height` får inte sänkas under nuvarande 56 px.
- Radnamnet behåller `font-size: 17px` från v2.0. Tidsraden sätts till 15 px — mindre än namnet men inte under 15 px.
- 360 px skärmbredd utan horisontell skroll.
- Svensk text i all UI-copy. Utskrivna ord i nedräkningen, aldrig förkortningarna "tim" eller "dgr".
- Avrundning nedåt i alla tidsenheter.
- Samtliga befintliga tester ska fortsätta passera. Före arbetet: 76 tester, alla gröna.
- Kör hela sviten med `npm test` från repots rot.

---

### Task 1: Nedräkningsfunktion i tid.js

Ren logik utan DOM-beroenden. Enda uppgiften med automatiserade tester — resten av planen verifieras i webbläsare.

**Filer:**
- Ändra: `docs/lib/tid.js` (lägg till sist, efter `formatTidsspann` som slutar på rad 131)
- Test: `test/tid.test.js` (lägg till sist, efter sista testet på rad 81)

**Gränssnitt:**
- Konsumerar: `tolkaTid` från samma modul (finns redan, används i testerna)
- Producerar: `formatNedrakning(start, slut, nu)` → `string`. Alla tre argumenten är `Date`. Signaturen speglar befintliga `formatChip(start, slut, dag)`. Funktionen avgör själv om eventet pågår (`start <= nu`) och räknar mot slutet i så fall, annars mot starten.

- [ ] **Steg 1: Skriv de failande testerna**

Lägg till sist i `test/tid.test.js`. Importraden på rad 3 behöver utökas med `formatNedrakning`:

```js
import { tolkaTid, formatKlocka, formatDatum, formatTidsspann, formatNedrakning } from '../docs/lib/tid.js';
```

Och testerna sist i filen:

```js
// Nedräkning (spec: specs/2026-08-07-nedrakning-design.md)
// Hjälpare: bygger start/slut relativt ett fast "nu" så testerna blir lättlästa.
const NU = tolkaTid('2026-08-07T12:00:00.000');
const efter = (ms) => new Date(NU.getTime() + ms);
const fore = (ms) => new Date(NU.getTime() - ms);
const SEKUND = 1000;
const MINUT = 60 * SEKUND;
const TIMME = 60 * MINUT;
const DYGN = 24 * TIMME;

// --- Event som inte har börjat: räknar ner till starten ---

test('under en minut till start ger "börjar nu"', () => {
  assert.equal(formatNedrakning(efter(59 * SEKUND), efter(2 * TIMME), NU), 'börjar nu');
});

test('exakt en minut till start ger "om 1 minut" (singular)', () => {
  assert.equal(formatNedrakning(efter(MINUT), efter(2 * TIMME), NU), 'om 1 minut');
});

test('45 minuter till start ger "om 45 minuter"', () => {
  assert.equal(formatNedrakning(efter(45 * MINUT), efter(2 * TIMME), NU), 'om 45 minuter');
});

test('59 minuter till start räknas fortfarande i minuter', () => {
  assert.equal(formatNedrakning(efter(59 * MINUT), efter(2 * TIMME), NU), 'om 59 minuter');
});

test('exakt en timme till start ger "om 1 timme" (singular)', () => {
  assert.equal(formatNedrakning(efter(TIMME), efter(3 * TIMME), NU), 'om 1 timme');
});

test('23 timmar 59 minuter till start räknas fortfarande i timmar', () => {
  assert.equal(formatNedrakning(efter(23 * TIMME + 59 * MINUT), efter(30 * TIMME), NU), 'om 23 timmar');
});

test('exakt ett dygn till start ger "om 1 dag" (singular)', () => {
  assert.equal(formatNedrakning(efter(DYGN), efter(DYGN + TIMME), NU), 'om 1 dag');
});

test('nio dygn till start ger "om 9 dagar"', () => {
  assert.equal(formatNedrakning(efter(9 * DYGN), efter(9 * DYGN + 3 * TIMME), NU), 'om 9 dagar');
});

// --- Avrundning nedåt (spec: underskattning är den ofarliga riktningen) ---

test('2 timmar 50 minuter avrundas nedåt till "om 2 timmar"', () => {
  assert.equal(formatNedrakning(efter(2 * TIMME + 50 * MINUT), efter(5 * TIMME), NU), 'om 2 timmar');
});

test('1 dygn 23 timmar avrundas nedåt till "om 1 dag"', () => {
  assert.equal(formatNedrakning(efter(DYGN + 23 * TIMME), efter(3 * DYGN), NU), 'om 1 dag');
});

// --- Pågående event: räknar ner till slutet, med prefixet "slutar" ---

test('pågående event med 40 minuter kvar ger "slutar om 40 minuter"', () => {
  assert.equal(formatNedrakning(fore(20 * MINUT), efter(40 * MINUT), NU), 'slutar om 40 minuter');
});

test('pågående event med 5 timmar kvar ger "slutar om 5 timmar"', () => {
  assert.equal(formatNedrakning(fore(2 * TIMME), efter(5 * TIMME), NU), 'slutar om 5 timmar');
});

test('pågående event med 32 dygn kvar ger "slutar om 32 dagar"', () => {
  assert.equal(formatNedrakning(fore(DYGN), efter(32 * DYGN), NU), 'slutar om 32 dagar');
});

test('pågående event med mindre än en minut kvar ger "slutar strax"', () => {
  assert.equal(formatNedrakning(fore(TIMME), efter(30 * SEKUND), NU), 'slutar strax');
});

test('event som startar exakt nu räknas som pågående', () => {
  assert.equal(formatNedrakning(NU, efter(2 * TIMME), NU), 'slutar om 2 timmar');
});

// Kalendergrupperingen filtrerar bort avslutade events, men funktionen får
// aldrig visa ett negativt tal om den ändå anropas med ett.
test('redan avslutat event ger "slutar strax" i stället för negativ tid', () => {
  assert.equal(formatNedrakning(fore(3 * TIMME), fore(TIMME), NU), 'slutar strax');
});

test('samma event ger samma nedräkning oavsett vilken dag raden står under', () => {
  const start = fore(DYGN);
  const slut = efter(3 * DYGN);
  assert.equal(formatNedrakning(start, slut, NU), 'slutar om 3 dagar');
});
```

- [ ] **Steg 2: Kör testerna och se att de failar**

Kör: `npm test 2>&1 | tail -20`

Förväntat: FAIL. Felet blir `SyntaxError: The requested module '../docs/lib/tid.js' does not provide an export named 'formatNedrakning'` — hela testfilen fallerar på importen, inte ett test i taget. Det är väntat.

- [ ] **Steg 3: Skriv minimal implementation**

Lägg till sist i `docs/lib/tid.js`. `DYGN_MS` finns redan deklarerad på rad 61 och behövs inte här — den nästlade divisionen sköter enheterna.

```js
// Nedräkning (spec: specs/2026-08-07-nedrakning-design.md).
// Avrundning nedåt genomgående: underskattning gör att man kommer för tidigt
// i stället för för sent, och skyndar på när tiden håller på att ta slut.
const MINUT_MS = 60 * 1000;

function enhet(diffMs) {
  const minuter = Math.floor(diffMs / MINUT_MS);
  if (minuter < 60) {
    return { antal: minuter, ental: 'minut', flertal: 'minuter' };
  }
  const timmar = Math.floor(minuter / 60);
  if (timmar < 24) {
    return { antal: timmar, ental: 'timme', flertal: 'timmar' };
  }
  return { antal: Math.floor(timmar / 24), ental: 'dag', flertal: 'dagar' };
}

// Pekar alltid på eventets nästa gräns: starten om det inte börjat, annars slutet.
export function formatNedrakning(start, slut, nu) {
  const pagar = start.getTime() <= nu.getTime();
  const mal = pagar ? slut : start;
  const diff = mal.getTime() - nu.getTime();
  if (diff < MINUT_MS) {
    return pagar ? 'slutar strax' : 'börjar nu';
  }
  const { antal, ental, flertal } = enhet(diff);
  const text = `om ${antal} ${antal === 1 ? ental : flertal}`;
  return pagar ? `slutar ${text}` : text;
}
```

- [ ] **Steg 4: Kör testerna och se att de passerar**

Kör: `npm test 2>&1 | tail -12`

Förväntat: PASS, 94 tester (76 befintliga + 18 nya), noll failade.

- [ ] **Steg 5: Committa**

```bash
git add docs/lib/tid.js test/tid.test.js
git commit -m "Nedräkningsfunktion för eventtider"
```

---

### Task 2: Tvåradig kalenderrad

Raden går från `[bild] namn chip ›` till `[bild] namn / klockslag · nedräkning ›`. Ingen tickning ännu — siffran är korrekt vid sidladdning och rörs inte förrän Task 4.

**Filer:**
- Ändra: `docs/app.js` — importraden (rad 4), `rad()` (rad 178–199), `raidRad()` (rad 201–213)
- Ändra: `docs/styles.css` — `.rad-namn` (rad 212), `.rad-chip` (rad 223)

**Gränssnitt:**
- Konsumerar: `formatNedrakning(start, slut, nu)` från Task 1
- Producerar: `tidsrad(klockText, nedrakningFn, nu, gron)` → `HTMLElement`. Skapar `<span class="rad-tid">` med två barn: en statisk klockslagsnod och en nedräkningsnod. Task 4 byter ut den här funktionens inre mot en registrerande variant — signaturen ändras inte.

- [ ] **Steg 1: Utöka importen**

I `docs/app.js` rad 4, lägg till `formatNedrakning`:

```js
import { formatTidsspann, formatDagRubrik, formatChip, formatKlocka, formatDatum, arHelg, formatNedrakning } from './lib/tid.js';
```

- [ ] **Steg 2: Lägg till hjälpfunktionen `tidsrad`**

Lägg in direkt före `function radBild(event)` (rad 171) i `docs/app.js`:

```js
/* ---------- Tidsrad: klockslag · nedräkning ---------- */

// nedrakningFn tar ett nu och returnerar texten, så Task 4 kan uppdatera
// enbart nedräkningsnoden utan att röra klockslaget.
function tidsrad(klockText, nedrakningFn, nu, gron) {
  const nod = el('span', gron ? 'rad-tid rad-tid-gron' : 'rad-tid');
  nod.append(el('span', 'rad-klocka', `${klockText} · `));
  nod.append(el('span', 'rad-nedrakning', nedrakningFn(nu)));
  return nod;
}
```

- [ ] **Steg 3: Bygg om `rad()`**

Ersätt raderna 194–196 i `docs/app.js` — alltså de tre `knapp.append(...)`-anropen för namn, chip och pil — med en textkolumn:

```js
  const textkolumn = el('span', 'rad-text');
  textkolumn.append(el('span', 'rad-namn', namn));
  textkolumn.append(
    tidsrad(
      formatChip(event.startDate, event.endDate, dagDatum),
      (n) => formatNedrakning(event.startDate, event.endDate, n),
      nu,
      pagar
    )
  );
  knapp.append(textkolumn);
  knapp.append(el('span', 'rad-pil', '›'));
```

Resten av `rad()` — knappen, dämpningen, bilden, `✗`/`🟡`-suffixen och klicklyssnaren — lämnas orörd.

- [ ] **Steg 4: Bygg om `raidRad()` till samma layout**

Raden "Raider idag" har inga egna tider och behåller texten `hela dagen`, men ska se likadan ut som de andra. Ersätt raderna 208–209 i `docs/app.js`:

```js
  const textkolumn = el('span', 'rad-text');
  textkolumn.append(el('span', 'rad-namn', `Raider idag: ${alla[0]?.namn ?? ''} +${Math.max(alla.length - 1, 0)}`));
  const tid = el('span', 'rad-tid rad-tid-gron');
  tid.append(el('span', 'rad-klocka', 'hela dagen'));
  textkolumn.append(tid);
  knapp.append(textkolumn);
```

Raden efter (`knapp.append(el('span', 'rad-pil', '›'));`) står kvar.

- [ ] **Steg 5: Lägg till stilarna**

I `docs/styles.css`, ersätt hela `.rad-namn`-regeln (rad 212–222) och `.rad-chip`-regeln (rad 223–230) med:

```css
.rad-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rad-namn {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.rad-tid {
  font-size: 15px;
  font-weight: 700;
  color: var(--bla);
}
.rad-tid-gron {
  color: var(--gron);
}
```

`.rad-chip-gron` (rad 231) blir oanvänd och tas bort. `min-width: 0` på `.rad-text` är nödvändigt — utan det vägrar flexbarnet krympa och långa namn spränger raden i sidled på 360 px.

Tidsraden ärver `.rad-chip`:s storlek (15 px), vikt (700) och färger (`var(--bla)`, `var(--gron)`) oförändrade. Specens WCAG AA-krav på tidsraden är därmed redan uppfyllt av den kontrast v2.0 etablerade — ingen ny färgsättning införs.

- [ ] **Steg 6: Verifiera i webbläsare på 360 px**

Kör en lokal server från repots rot:

```bash
python3 -m http.server 8000 --directory docs
```

Öppna `http://localhost:8000` och ställ in 360 px bredd i devtools.

Kontrollera:
- Varje kalenderrad visar namn på egen rad och `klockslag · nedräkning` under.
- Pågående events har grön tidsrad och texten börjar med "slutar".
- Ingen horisontell skroll. Långa namn som "Choose Your Path: Venom and Vines" bryts eller kortas, men spränger inte raden.
- Raden "Raider idag" ser ut som de andra och säger `hela dagen`.
- Raderna under "Pågår hela tiden" har fått samma behandling (de går genom samma `rad()`).
- Noll fel i konsolen.

- [ ] **Steg 7: Kör hela testsviten**

Kör: `npm test 2>&1 | tail -8`

Förväntat: PASS, 94 tester. Inget test rör DOM:en, så ingenting ska ha ändrats — steget finns för att fånga oavsiktliga följdfel.

- [ ] **Steg 8: Committa**

```bash
git add docs/app.js docs/styles.css
git commit -m "Tvåradig kalenderrad med klockslag och nedräkning"
```

---

### Task 3: NU-panel och bottom sheet

Samma tidsuppgift på de två återstående platserna.

**Filer:**
- Ändra: `docs/app.js` — `eventSheet()`, `nuPanelNod()`
- Ändra: `docs/styles.css` — ny regel efter `.nu-namn`

Radnummer utelämnas från och med här: Task 2 har redan flyttat allt nedanför `radBild()`. Sök på den citerade koden i stället.

**Gränssnitt:**
- Konsumerar: `tidsrad(klockText, nedrakningFn, nu, gron)` från Task 2, `formatNedrakning` från Task 1

- [ ] **Steg 1: Nedräkning i bottom sheet**

I `docs/app.js`, ersätt den enda raden i `eventSheet()` som börjar med `noder.push(el('p', 'sheet-tid'`:

```js
  noder.push(el('p', 'sheet-tid', '🕐 ' + formatTidsspann(event.startDate, event.endDate, nu)));
```

med:

```js
  const sheetTid = el('p', 'sheet-tid', '🕐 ' + formatTidsspann(event.startDate, event.endDate, nu) + ' · ');
  sheetTid.append(el('span', 'rad-nedrakning', formatNedrakning(event.startDate, event.endDate, nu)));
  noder.push(sheetTid);
```

- [ ] **Steg 2: Nedräkning i NU-panelen**

I `docs/app.js`, ersätt raden i `nuPanelNod()` som sätter `nu-etikett`:

```js
  panel.append(el('span', 'nu-etikett', `NU · slutar kl ${formatKlocka(event.endDate)}`));
```

med:

```js
  panel.append(el('span', 'nu-etikett', 'NU'));
```

och lägg in tidsraden direkt efter `panel.append(el('span', 'nu-namn', event.name));`:

```js
  panel.append(
    tidsrad(
      formatChip(event.startDate, event.endDate, nu),
      (n) => formatNedrakning(event.startDate, event.endDate, n),
      nu,
      true
    )
  );
```

`formatKlocka` används fortfarande av `visaUppdaterad()` och ska stå kvar i importen.

- [ ] **Steg 3: Stil för tidsraden i NU-panelen**

Lägg till i `docs/styles.css` direkt efter `.nu-namn`-regelns avslutande klammer:

```css
.nu-panel .rad-tid {
  display: block;
  margin-top: 2px;
}
```

- [ ] **Steg 4: Verifiera i webbläsare**

Starta servern som i Task 2 steg 6 och kontrollera på 360 px:
- Bottom sheet: tidsraden lyder t.ex. `🕐 Idag kl 18–19 · börjar om 2 timmar`.
- NU-panelen: etiketten är bara `NU`, och tidsraden under namnet visar `kl 18–19 · slutar om 40 minuter`.
- NU-panelen syns bara när ett kort event pågår. Gör den inte det just nu går den inte att verifiera — notera det och gå vidare, Task 4 steg 6 ger ett sätt att framkalla den.
- Noll fel i konsolen.

- [ ] **Steg 5: Kör hela testsviten**

Kör: `npm test 2>&1 | tail -8`

Förväntat: PASS, 94 tester.

- [ ] **Steg 6: Committa**

```bash
git add docs/app.js docs/styles.css
git commit -m "Nedräkning i NU-panel och bottom sheet"
```

---

### Task 4: Tickning och omritning vid återkomst

Den del som gör att siffran förblir sann. Rättar samtidigt att `nu` sätts en enda gång vid sidladdning.

**Filer:**
- Ändra: `docs/app.js` — `tidsrad()` från Task 2, `eventSheet()`, `stangSheet()`, `start()`, nytt block sist i filen

**Gränssnitt:**
- Konsumerar: `tidsrad()` från Task 2
- Producerar: registren `tickare` och `sheetTickare`, funktionerna `tick()`, `startaTick()`, `stoppaTick()`

- [ ] **Steg 1: Lägg till registren**

Lägg in direkt före `/* ---------- Bottom sheet ---------- */` (rad 77) i `docs/app.js`:

```js
/* ---------- Tickande nedräkningar ---------- */

const TICK_MS = 30 * 1000;
const OMRITNING_MS = 5 * 60 * 1000;

// Sidans egna nedräkningar töms vid varje omritning; sheetens hålls separat
// och töms när sheeten stängs, annars växer registret för varje öppnat event.
const tickare = [];
const sheetTickare = [];
let tickTimer = null;
let senasteRendering = 0;

function registrera(register, nod, textFn) {
  register.push({ nod, textFn });
  return nod;
}

function tick() {
  const nu = new Date();
  for (const post of tickare) {
    post.nod.textContent = post.textFn(nu);
  }
  for (const post of sheetTickare) {
    post.nod.textContent = post.textFn(nu);
  }
}

function startaTick() {
  if (tickTimer === null) {
    tickTimer = setInterval(tick, TICK_MS);
  }
}

function stoppaTick() {
  if (tickTimer !== null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}
```

- [ ] **Steg 2: Registrera radernas nedräkningar**

I `docs/app.js`, ersätt kroppen i `tidsrad()` från Task 2 så nedräkningsnoden registreras:

```js
function tidsrad(klockText, nedrakningFn, nu, gron) {
  const nod = el('span', gron ? 'rad-tid rad-tid-gron' : 'rad-tid');
  nod.append(el('span', 'rad-klocka', `${klockText} · `));
  nod.append(registrera(tickare, el('span', 'rad-nedrakning', nedrakningFn(nu)), nedrakningFn));
  return nod;
}
```

Enda skillnaden mot Task 2 är att nedräkningsnoden går genom `registrera`. Signaturen är oförändrad, så anropen i `rad()` och `nuPanelNod()` behöver inte röras.

- [ ] **Steg 3: Registrera sheetens nedräkning**

I `eventSheet()`, ersätt den nod som lades till i Task 3 steg 1 så den hamnar i `sheetTickare`:

```js
  const sheetTid = el('p', 'sheet-tid', '🕐 ' + formatTidsspann(event.startDate, event.endDate, nu) + ' · ');
  sheetTid.append(
    registrera(
      sheetTickare,
      el('span', 'rad-nedrakning', formatNedrakning(event.startDate, event.endDate, nu)),
      (n) => formatNedrakning(event.startDate, event.endDate, n)
    )
  );
  noder.push(sheetTid);
```

- [ ] **Steg 4: Töm sheetregistret när sheeten stängs**

I `stangSheet()`, lägg till en rad direkt efter `sheetOppen = false;`:

```js
  sheetTickare.length = 0;
```

- [ ] **Steg 5: Nollställ registret vid omritning och starta timern**

I `start()`, direkt efter `const nu = new Date();`, lägg till:

```js
    tickare.length = 0;
    senasteRendering = Date.now();
```

Och direkt före `visaUppdaterad(data.uppdaterad);`, lägg till:

```js
    startaTick();
```

- [ ] **Steg 6: Hantera återkomst till appen**

Ersätt sista raden i `docs/app.js`, anropet `start();`, med:

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stoppaTick();
    return;
  }
  // Har det gått länge är hela grupperingen byggd på ett gammalt nu — dagrubriker,
  // vilka events som räknas som pågående och NU-panelen är då fel, inte bara siffran.
  if (Date.now() - senasteRendering > OMRITNING_MS) {
    stangSheet();
    start();
    return;
  }
  tick();
  startaTick();
});

start();
```

- [ ] **Steg 7: Verifiera tickningen**

Starta servern som i Task 2 steg 6. Sätt tillfälligt `TICK_MS` till `1000` för att slippa vänta, och kontrollera:
- En nedräkning som visar minuter räknar ned utan att sidan hoppar eller tappar skrollposition.
- Klockslagsdelen står stilla; bara siffran efter `·` ändras.
- Öppna ett event, låt sheeten stå öppen — även dess nedräkning tickar.
- Stäng sheeten, öppna ett annat event flera gånger. Kontrollera i konsolen att `sheetTickare.length` är 1, inte växande. Skriv `sheetTickare` i konsolen går inte (modulscope) — verifiera i stället genom att sätta en `console.log(sheetTickare.length)` sist i `eventSheet()` under testet och ta bort den efteråt.

Återställ `TICK_MS` till `30 * 1000` när det är verifierat.

- [ ] **Steg 8: Verifiera omritning vid återkomst**

Sätt tillfälligt `OMRITNING_MS` till `5000`. Öppna sidan, byt till en annan flik i minst 6 sekunder, kom tillbaka.

Förväntat: hela vyn ritas om — en nätverksbegäran till `events-sv.json` syns i devtools nätverksflik, och sidan skrollar till toppen. Är en sheet öppen när du byter flik ska den vara stängd när du kommer tillbaka.

Återställ `OMRITNING_MS` till `5 * 60 * 1000`.

- [ ] **Steg 9: Kör hela testsviten**

Kör: `npm test 2>&1 | tail -8`

Förväntat: PASS, 94 tester.

- [ ] **Steg 10: Committa**

```bash
git add docs/app.js
git commit -m "Tickande nedräkningar och omritning vid återkomst"
```

---

## Efter sista uppgiften

- [ ] Bekräfta att `TICK_MS` är `30 * 1000` och `OMRITNING_MS` är `5 * 60 * 1000` — de tillfälliga testvärdena från Task 4 får inte följa med i en commit. Kontrollera med `grep -n "TICK_MS\|OMRITNING_MS" docs/app.js`.
- [ ] Bekräfta att inga `console.log` från felsökningen ligger kvar: `grep -n "console.log" docs/app.js` ska ge noll träffar.
- [ ] Kör `npm test` en sista gång: 94 tester, alla gröna.
- [ ] Uppdatera PRD:ns ändringslogg med en kort v2.1-post om nedräkningen, i samma form som v2.0-posten.
- [ ] Pusha. Sidan deployas automatiskt via Pages när `main` uppdateras.
