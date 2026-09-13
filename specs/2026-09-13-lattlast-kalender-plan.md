# Lättläst kalender (v2.2) — implementationsplan

> **För agentiska arbetare:** OBLIGATORISK SUB-SKILL: använd superpowers:subagent-driven-development (rekommenderas) eller superpowers:executing-plans för att genomföra planen uppgift för uppgift. Stegen använder checkbox-syntax (`- [ ]`) för avprickning.

**Mål:** Göra kalenderraderna läsbara på svenska, ta bort brus (Battle League, dubblerade raidrader, två månaders kalender) och ge sidan färgkant per typ samt mörkt läge.

**Arkitektur:** Bygget (`scripts/lib/oversatt.js`, `berika.js`, `build.js`) får ett nytt fält `namn` och fler sammanfattningsmallar; en beskrivningsfil per eventnamn slår mallen. Frontendens grupperingsmodul (`docs/lib/kalender.js`) får två nya regler (Battle League utan rad, pågående raidrotationer i egen lista) och `docs/app.js` renderar dem: raidrotationer slås in i "Raider idag", dagar bortom 30 dagar hamnar bakom en knapp. Utseendet (`docs/styles.css`) får typfärger och mörkt läge via CSS-variabler.

**Teknikstack:** Ramverkslös ES-moduler-frontend, Node-byggskript utan beroenden, `node:test`.

**Specifikation:** `specs/2026-09-13-lattlast-kalender-design.md`

## Globala förutsättningar

- Noll beroenden, varken i frontend eller bygge. CSP i `docs/index.html` rörs inte.
- All extern data sätts med `textContent`, aldrig `innerHTML`.
- Pokémon-namn översätts aldrig. Originalnamnet (`name`) visas alltid i detaljvyn.
- Tryckytor ≥ 44 px, radens `min-height` 56 px behålls, 360 px utan horisontell skroll.
- Svensk, utskriven UI-copy utan förkortningar.
- Kontrast ≥ WCAG AA (4,5:1 för text under 24 px) i både ljust och mörkt läge.
- Före arbetet: 105 tester gröna. Kör `npm test` från repots rot efter varje uppgift.
- Commit efter varje uppgift med `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` sist i meddelandet.

---

### Task 1: Lättlästa namn i bygget

**Filer:**
- Ändra: `scripts/lib/oversatt.js`
- Ändra: `data/ordlista.json` (ny tabell `raidTyper`)
- Test: `test/oversatt.test.js`

**Gränssnitt:**
- Producerar: `oversattare.lattlastNamn(event)` → `string`. `event` är ett rått ScrapedDuck-event med `name` och `eventType`. Okänd raidnivå läggs i `okandaTermer()`.

- [ ] **Steg 1: Lägg till `raidTyper` i `data/ordlista.json`** (efter `raidNivaer`):

```json
  "raidTyper": {
    "5-star Raid Battles": "5-stjärniga raider",
    "4-star Raid Battles": "4-stjärniga raider",
    "3-star Raid Battles": "3-stjärniga raider",
    "1-star Raid Battles": "1-stjärniga raider",
    "Mega Raids": "Mega-raider",
    "Shadow Raids": "Shadow-raider",
    "Elite Raids": "Elitraider"
  },
```

- [ ] **Steg 2: Skriv de failande testerna** sist i `test/oversatt.test.js`:

```js
// Lättlästa namn (spec: specs/2026-09-13-lattlast-kalender-design.md, punkt 1)
function namn(name, eventType) {
  return nyOversattare().lattlastNamn({ name, eventType });
}

test('raidrotation: "X in 5-star Raid Battles" blir "X i 5-stjärniga raider"', () => {
  assert.equal(namn('Xerneas in 5-star Raid Battles', 'raid-battles'), 'Xerneas i 5-stjärniga raider');
});

test('formnamn i parentes klipps ur radnamnet', () => {
  assert.equal(namn('Zacian (Hero of Many Battles) in 5-star Raid Battles', 'raid-battles'), 'Zacian i 5-stjärniga raider');
});

test('Mega- och Shadow-raider', () => {
  assert.equal(namn('Mega Beedrill in Mega Raids', 'raid-battles'), 'Mega Beedrill i Mega-raider');
  assert.equal(namn('Shadow Thundurus (Incarnate Forme) in Shadow Raids', 'raid-battles'), 'Shadow Thundurus i Shadow-raider');
});

test('"and" i uppräkning blir "och"', () => {
  assert.equal(
    namn('Xurkitree, Pheromosa, and Buzzwole in 5-star Raid Battles', 'raid-battles'),
    'Xurkitree, Pheromosa och Buzzwole i 5-stjärniga raider'
  );
});

test('okänd raidnivå lämnar namnet orört (utom klipp) och loggas', () => {
  const o = nyOversattare();
  assert.equal(o.lattlastNamn({ name: 'Groudon in Primal Raids', eventType: 'raid-battles' }), 'Groudon in Primal Raids');
  assert.ok(o.okandaTermer().includes('Primal Raids'));
});

test('rampljustimme sätter typen först', () => {
  assert.equal(namn('Houndour and Houndoom Spotlight Hour', 'pokemon-spotlight-hour'), 'Rampljustimme: Houndour och Houndoom');
  assert.equal(namn('Mystery Pokémon Spotlight Hour', 'pokemon-spotlight-hour'), 'Rampljustimme: Hemlig Pokémon');
});

test('raidtimme, raiddag och Max-stridsdag', () => {
  assert.equal(namn('Zamazenta (Hero of Many Battles) Raid Hour', 'raid-hour'), 'Raidtimme: Zamazenta');
  assert.equal(namn('Staraptor Super Mega Raid Day', 'raid-day'), 'Raiddag: Staraptor');
  assert.equal(namn('Super Mega Raid Day', 'raid-day'), 'Raiddag');
  assert.equal(namn('Gigantamax Cinderace Max Battle Day', 'max-battles'), 'Max-stridsdag: Gigantamax Cinderace');
  assert.equal(namn('Max Battle Day', 'max-battles'), 'Max-stridsdag');
});

test('Max-måndag', () => {
  assert.equal(namn('Dynamax Rhyhorn during Max Monday', 'max-mondays'), 'Max-måndag: Rhyhorn');
});

test('Community Day med månad eller Pokémon', () => {
  assert.equal(namn('October Community Day', 'community-day'), 'Community Day i oktober');
  assert.equal(namn('Nickit Community Day', 'community-day'), 'Community Day: Nickit');
});

test('suffix efter " | " klipps även för typer utan mönster', () => {
  assert.equal(namn('Great League and Little Cup | Twilight Trails', 'go-battle-league'), 'Great League and Little Cup');
  assert.equal(namn('Harvest Festival 2026: Applin Picking', 'event'), 'Harvest Festival 2026: Applin Picking');
});
```

- [ ] **Steg 3: Kör testerna och se dem faila**

Kör: `node --test test/oversatt.test.js`
Förväntat: FAIL med `lattlastNamn is not a function`.

- [ ] **Steg 4: Implementera** i `scripts/lib/oversatt.js`. Lägg till hjälpare på modulnivå (efter `namnlista`):

```js
const MANADER = {
  January: 'januari', February: 'februari', March: 'mars', April: 'april', May: 'maj', June: 'juni',
  July: 'juli', August: 'augusti', September: 'september', October: 'oktober', November: 'november', December: 'december',
};

// Steg 1–2 i namnreglerna: suffix efter " | " och formnamn i parentes klipps.
function rensaNamn(name) {
  return name.split(' | ')[0].replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

// Uppräkningsdelen av ett namn: "A, B, and C" → "A, B och C". Pokémon-namn rörs inte.
function ochLista(text) {
  return text.replace(/, and /g, ' och ').replace(/ and /g, ' och ').replace(/Mystery Pokémon/g, 'Hemlig Pokémon');
}
```

Inuti `skapaOversattare`, efter `bonusIndex`:

```js
  const raidTypIndex = new Map(
    Object.entries(ordlista.raidTyper || {}).map(([nyckel, svensk]) => [nyckel.toLowerCase(), svensk])
  );

  // Lättläst namn (spec punkt 1). Originalet ligger kvar i event.name och visas i
  // detaljvyn; det här är radens namn. Matchar inget mönster returneras det rensade
  // originalet.
  function lattlastNamn(event) {
    const bas = rensaNamn(event.name);
    let m;
    switch (event.eventType) {
      case 'raid-battles':
        m = bas.match(/^(.+?) in (.+)$/);
        if (!m) {
          return bas;
        }
        if (!raidTypIndex.has(m[2].toLowerCase())) {
          okanda.add(m[2]);
          return bas;
        }
        return `${ochLista(m[1])} i ${raidTypIndex.get(m[2].toLowerCase())}`;
      case 'pokemon-spotlight-hour':
        m = bas.match(/^(.+) Spotlight Hour$/);
        return m ? `Rampljustimme: ${ochLista(m[1])}` : bas;
      case 'raid-hour':
        m = bas.match(/^(.+) Raid Hour$/);
        return m ? `Raidtimme: ${ochLista(m[1])}` : bas;
      case 'raid-day': {
        const re = /\s*(?:Super\s+)?(?:Mega\s+)?Raid Day$/;
        if (!re.test(bas)) {
          return bas;
        }
        const x = bas.replace(re, '');
        return x ? `Raiddag: ${ochLista(x)}` : 'Raiddag';
      }
      case 'max-mondays':
        m = bas.match(/^Dynamax (.+) during Max Monday$/);
        return m ? `Max-måndag: ${ochLista(m[1])}` : bas;
      case 'max-battles': {
        const re = /\s*Max Battle Day$/;
        if (!re.test(bas)) {
          return bas;
        }
        const x = bas.replace(re, '');
        return x ? `Max-stridsdag: ${ochLista(x)}` : 'Max-stridsdag';
      }
      case 'community-day':
        m = bas.match(/^(.+) Community Day$/);
        if (!m) {
          return bas;
        }
        return MANADER[m[1]] ? `Community Day i ${MANADER[m[1]]}` : `Community Day: ${ochLista(m[1])}`;
      default:
        return bas;
    }
  }
```

Lägg till `lattlastNamn` i returobjektet: `return { bonus, eventtyp, sammanfattning, lattlastNamn, okandaTermer };`

- [ ] **Steg 5: Kör testerna** — `npm test`, förväntat: alla gröna (105 + 11 nya).

- [ ] **Steg 6: Commit** — `git add data/ordlista.json scripts/lib/oversatt.js test/oversatt.test.js && git commit -m "Lättlästa namn: deterministisk omskrivning av LeekDucks rubriker"`

---

### Task 2: Standardtexter, beskrivningsfil och fältet `namn`

**Filer:**
- Ändra: `scripts/lib/oversatt.js` (`sammanfattning`)
- Ändra: `scripts/lib/berika.js`
- Ändra: `scripts/build.js`
- Skapa: `data/beskrivningar.json`
- Test: `test/oversatt.test.js`, `test/berika.test.js`

**Gränssnitt:**
- Konsumerar: `lattlastNamn` från Task 1.
- Producerar: `berikaEvents(rawEvents, { ordlista, regioner, beskrivningar })` → `{ events, okandaTermer, saknarBeskrivning }`. Varje event får `namn` (sträng). `beskrivningar` är objektet `{ "<originalnamn>": "<text>" }` (valfritt, standard `{}`). `saknarBeskrivning` är `[{ name, typ, start, end, link }]`.

- [ ] **Steg 1: Failande tester för mallarna** sist i `test/oversatt.test.js`:

```js
// Standardtexter för typer som saknade mall (spec punkt 5)
function samm(event) {
  return nyOversattare().sammanfattning(event);
}

test('generiskt event med spawns får standardtext, utan spawns ingen', () => {
  assert.equal(
    samm({ name: 'Mega Squads', eventType: 'event', extraData: { generic: { hasSpawns: true } } }),
    'Särskilda Pokémon dyker upp under eventet. Se listan.'
  );
  assert.equal(samm({ name: 'LEGO Stores and Pokémon GO', eventType: 'event', extraData: { generic: { hasSpawns: false } } }), null);
});

test('Hatch Day känns igen på namnet', () => {
  assert.equal(samm({ name: 'Hatch Day', eventType: 'event', extraData: {} }), 'Kläckdag! Kläck ägg och få en särskild Pokémon.');
});

test('Max-måndag namnger Pokémonen och säger inte längre "ikväll"', () => {
  assert.equal(samm({ name: 'Dynamax Rhyhorn during Max Monday', eventType: 'max-mondays' }), 'Rhyhorn i Max-strider hela dagen.');
  assert.equal(samm({ name: 'Max Monday', eventType: 'max-mondays' }), 'Max-måndag! Extra Max-strider hela dagen.');
});

test('wild-area, max-battles, go-pass och season får korta mallar', () => {
  assert.equal(samm({ name: 'X', eventType: 'wild-area' }), 'Wild Area: massor av Pokémon att fånga och särskilda bonusar.');
  assert.equal(samm({ name: 'X', eventType: 'max-battles' }), 'Extra många Max-strider.');
  assert.equal(samm({ name: 'X', eventType: 'go-pass' }), 'Samla poäng och få belöningar hela månaden.');
  assert.equal(samm({ name: 'X', eventType: 'season' }), 'Ny säsong med nya Pokémon och bonusar.');
});
```

- [ ] **Steg 2: Failande tester för berika** sist i `test/berika.test.js`:

```js
// Fältet namn, beskrivningsfil och logg över saknade texter (spec punkt 1 och 5)
test('varje event får ett lättläst namn', () => {
  const { events } = berikaEvents([spotlight, raid, generiskt], { ordlista, regioner });
  assert.equal(events[0].namn, 'Rampljustimme: Zubat');
  assert.equal(events[1].namn, 'Mega Lucario i Mega-raider');
  assert.equal(events[2].namn, 'Battle Weekend');
});

test('beskrivningsfilen slår mallen på originalnamnet', () => {
  const beskrivningar = { 'Zubat Spotlight Hour': 'Zubat överallt ikväll.' };
  const { events } = berikaEvents([spotlight], { ordlista, regioner, beskrivningar });
  assert.equal(events[0].sammanfattning, 'Zubat överallt ikväll.');
});

test('event utan egen mall och utan beskrivning loggas som saknad', () => {
  const festival = {
    ...generiskt,
    eventID: 'f-1',
    name: 'Harvest Festival',
    eventType: 'event',
    extraData: { generic: { hasSpawns: true } },
  };
  const { saknarBeskrivning } = berikaEvents([spotlight, festival], { ordlista, regioner });
  assert.deepEqual(saknarBeskrivning, [
    { name: 'Harvest Festival', typ: 'event', start: festival.start, end: festival.end, link: festival.link },
  ]);
});

test('event med beskrivning loggas inte som saknad', () => {
  const festival = { ...generiskt, eventID: 'f-1', name: 'Harvest Festival', eventType: 'event' };
  const { saknarBeskrivning } = berikaEvents([festival], { ordlista, regioner, beskrivningar: { 'Harvest Festival': 'Skördefest!' } });
  assert.deepEqual(saknarBeskrivning, []);
});
```

- [ ] **Steg 3: Kör och se dem faila** — `npm test`, förväntat: de nya testerna FAIL.

- [ ] **Steg 4: Implementera mallarna** i `sammanfattning` i `oversatt.js`. Ersätt `case 'max-mondays'` och lägg till nya fall före `default`:

```js
      case 'max-mondays': {
        const m = rensaNamn(event.name).match(/^Dynamax (.+) during Max Monday$/);
        return m ? `${ochLista(m[1])} i Max-strider hela dagen.` : 'Max-måndag! Extra Max-strider hela dagen.';
      }
      case 'max-battles':
        return 'Extra många Max-strider.';
      case 'wild-area':
        return 'Wild Area: massor av Pokémon att fånga och särskilda bonusar.';
      case 'go-pass':
        return 'Samla poäng och få belöningar hela månaden.';
      case 'season':
        return 'Ny säsong med nya Pokémon och bonusar.';
      case 'event':
        if (/\bHatch Day\b/.test(event.name)) {
          return 'Kläckdag! Kläck ägg och få en särskild Pokémon.';
        }
        return extra.generic?.hasSpawns ? 'Särskilda Pokémon dyker upp under eventet. Se listan.' : null;
```

- [ ] **Steg 5: Implementera i `berika.js`.** Lägg till på modulnivå:

```js
// Typer vars mall säger något specifikt om just det eventet. Övriga typer får bara
// en standardtext, och loggas så att Toni kan skriva en riktig i data/beskrivningar.json.
const TYPER_MED_EGEN_MALL = new Set([
  'pokemon-spotlight-hour',
  'community-day',
  'raid-battles',
  'raid-hour',
  'raid-day',
  'max-mondays',
  'go-battle-league',
]);
```

Ändra signaturen och map-funktionen:

```js
export function berikaEvents(rawEvents, { ordlista, regioner, beskrivningar = {} }) {
  const oversattare = skapaOversattare(ordlista);
  const okandaRegioner = new Set();
  const saknarBeskrivning = [];

  const events = rawEvents.map((event) => {
    const region = klassaRegion(event, regioner);
    if (region.status === 'osakert') {
      okandaRegioner.add(region.term);
    }
    const bonusar = (event.extraData?.communityday?.bonuses || []).map((b) =>
      oversattare.bonus(b.text)
    );
    const beskrivning = beskrivningar[event.name];
    if (!beskrivning && !TYPER_MED_EGEN_MALL.has(event.eventType)) {
      saknarBeskrivning.push({ name: event.name, typ: event.eventType, start: event.start, end: event.end, link: event.link || '' });
    }
    return {
      id: event.eventID || event.name,
      name: event.name,
      namn: oversattare.lattlastNamn(event),
      typ: event.eventType,
      typRubrik: oversattare.eventtyp(event.eventType),
      link: event.link || '',
      image: event.image || '',
      start: event.start,
      end: event.end,
      region: region.status,
      sammanfattning: beskrivning || oversattare.sammanfattning(event),
      pokemon: pokemonForEvent(event),
      bonusar,
    };
  });

  return {
    events,
    okandaTermer: [...oversattare.okandaTermer(), ...okandaRegioner],
    saknarBeskrivning,
  };
}
```

- [ ] **Steg 6: Skapa `data/beskrivningar.json`:**

```json
{
  "kommentar": "Svenska beskrivningar per originalnamn (spec 2026-09-13, punkt 5). Nyckeln är eventets engelska namn exakt som i events-raw.json. En träff här slår alltid mallen i oversatt.js. Bygget skriver data/saknar-beskrivning.json med de event som bara fått standardtext — fyll på härifrån. Max 2 meningar, lättläst svenska, Pokémon-namn oöversatta.",
  "beskrivningar": {}
}
```

- [ ] **Steg 7: Koppla in i `scripts/build.js`.** Ersätt raderna som läser ordlista/regioner och anropar `berikaEvents`:

```js
  const ordlista = lasJson('data/ordlista.json');
  const regioner = lasJson('data/regioner.json');
  const beskrivningar = lasJson('data/beskrivningar.json').beskrivningar || {};
  const { events, okandaTermer, saknarBeskrivning } = berikaEvents(rawEvents, { ordlista, regioner, beskrivningar });

  // Pågående och kommande event som bara fått standardtext — Tonis att-göra-lista
  // för data/beskrivningar.json. Skrivs alltid, så åtgärdade poster försvinner.
  const aktuella = saknarBeskrivning
    .filter((e) => new Date(e.end).getTime() >= Date.now())
    .map(({ end, ...rest }) => rest);
  skrivJson('data/saknar-beskrivning.json', { uppdaterad: nu, events: aktuella });
  if (aktuella.length > 0) {
    console.log(`${aktuella.length} event saknar svensk beskrivning (se data/saknar-beskrivning.json).`);
  }
```

- [ ] **Steg 8: Kör testerna** — `npm test`, förväntat: alla gröna. Kontrollera att inget befintligt test förväntar sig `ikväll` (`grep -n ikväll test/`).

- [ ] **Steg 9: Commit** — `git add data/beskrivningar.json scripts/ test/ && git commit -m "Standardtexter för typer utan mall, beskrivningsfil och fältet namn"`

---

### Task 3: `verb`-parameter i `formatNedrakning`

**Filer:**
- Ändra: `docs/lib/tid.js`
- Test: `test/tid.test.js`

**Gränssnitt:**
- Producerar: `formatNedrakning(start, slut, nu, verb = 'slutar')`. `verb` används bara för pågående event (`slutar om …`, `slutar strax`). `har slutat` och `börjar nu`/`om …` påverkas inte.

- [ ] **Steg 1: Failande tester** sist i `test/tid.test.js`:

```js
// Raidraden säger "byts" i stället för "slutar" (spec 2026-09-13, punkt 3)
test('verb-parametern byter ut "slutar" för pågående event', () => {
  assert.equal(formatNedrakning(fore(TIMME), efter(2 * DYGN), NU, 'byts'), 'byts om 2 dagar');
  assert.equal(formatNedrakning(fore(TIMME), efter(30 * SEKUND), NU, 'byts'), 'byts strax');
});

test('verb-parametern påverkar inte kommande eller avslutade event', () => {
  assert.equal(formatNedrakning(efter(TIMME), efter(2 * TIMME), NU, 'byts'), 'om 1 timme');
  assert.equal(formatNedrakning(fore(2 * TIMME), fore(TIMME), NU, 'byts'), 'har slutat');
});
```

- [ ] **Steg 2: Kör och se faila** — `node --test test/tid.test.js`.

- [ ] **Steg 3: Implementera** — i `formatNedrakning`:

```js
export function formatNedrakning(start, slut, nu, verb = 'slutar') {
  const pagar = start.getTime() <= nu.getTime();
  const mal = pagar ? slut : start;
  const diff = mal.getTime() - nu.getTime();
  if (pagar && diff <= 0) {
    return 'har slutat';
  }
  if (diff < MINUT_MS) {
    return pagar ? `${verb} strax` : 'börjar nu';
  }
  const { antal, ental, flertal } = enhet(diff, nu, mal);
  const text = `om ${antal} ${antal === 1 ? ental : flertal}`;
  return pagar ? `${verb} ${text}` : text;
}
```

- [ ] **Steg 4: Kör testerna** — `npm test`, gröna.
- [ ] **Steg 5: Commit** — `git add docs/lib/tid.js test/tid.test.js && git commit -m "formatNedrakning: valfritt verb för pågående event"`

---

### Task 4: Grupperingsregler i `kalender.js`

**Filer:**
- Ändra: `docs/lib/kalender.js`
- Test: `test/kalender.test.js`

**Gränssnitt:**
- Producerar: `grupperaKalender(events, nu)` → `{ nuPanel, dagar, alltidPagaende, raidRotationer }`. `raidRotationer` innehåller pågående `raid-battles`-event längre än NU-panelgränsen och kortare än långkörargränsen, sorterade på sluttid.

- [ ] **Steg 1: Failande tester** sist i `test/kalender.test.js`:

```js
// Battle League får ingen kalenderrad (spec 2026-09-13, punkt 2)
test('kommande go-battle-league får ingen rad någonstans', () => {
  const gbl = ev('Ultra League', 'go-battle-league', '2026-07-14T22:00:00.000', '2026-07-21T22:00:00.000');
  const k = grupperaKalender([gbl], NU);
  assert.equal(k.alltidPagaende.length, 0);
  assert.ok(k.dagar.every((d) => d.events.length === 0));
});

// Pågående raidrotationer i egen lista (spec punkt 3)
test('pågående flerdagars raid-battles hamnar i raidRotationer, inte under Idag', () => {
  const rot = ev('Mega Beedrill in Mega Raids', 'raid-battles', '2026-07-07T10:00:00.000', '2026-07-14T10:00:00.000');
  const k = grupperaKalender([rot], NU);
  assert.deepEqual(k.raidRotationer.map((e) => e.name), ['Mega Beedrill in Mega Raids']);
  assert.ok(k.dagar.every((d) => d.events.length === 0));
});

test('raidRotationer sorteras på sluttid', () => {
  const sen = ev('Sen', 'raid-battles', '2026-07-07T10:00:00.000', '2026-07-16T10:00:00.000');
  const tidig = ev('Tidig', 'raid-battles', '2026-07-06T10:00:00.000', '2026-07-10T10:00:00.000');
  const k = grupperaKalender([sen, tidig], NU);
  assert.deepEqual(k.raidRotationer.map((e) => e.name), ['Tidig', 'Sen']);
});

test('kort pågående raid-battles hamnar fortfarande i NU-panelen', () => {
  const kort = ev('Raidkväll', 'raid-battles', '2026-07-08T18:00:00.000', '2026-07-08T21:00:00.000');
  const k = grupperaKalender([kort], NU);
  assert.equal(k.nuPanel.length, 1);
  assert.equal(k.raidRotationer.length, 0);
});

test('kommande raid-battles står kvar på sin startdag', () => {
  const rot = ev('Xerneas in 5-star Raid Battles', 'raid-battles', '2026-07-15T10:00:00.000', '2026-07-22T10:00:00.000');
  const k = grupperaKalender([rot], NU);
  assert.equal(k.raidRotationer.length, 0);
  assert.equal(k.dagar.find((d) => d.nyckel === '2026-07-15').events[0].name, 'Xerneas in 5-star Raid Battles');
});

test('raid-battles längre än 14 dagar är fortfarande långkörare', () => {
  const shadow = ev('Shadow Thundurus in Shadow Raids', 'raid-battles', '2026-07-01T10:00:00.000', '2026-07-30T10:00:00.000');
  const k = grupperaKalender([shadow], NU);
  assert.equal(k.alltidPagaende.length, 1);
  assert.equal(k.raidRotationer.length, 0);
});
```

- [ ] **Steg 2: Kör och se faila** — `node --test test/kalender.test.js`.

- [ ] **Steg 3: Implementera** i `docs/lib/kalender.js`:

```js
export function grupperaKalender(events, nu) {
  const nuPanel = [];
  const alltidPagaende = [];
  const raidRotationer = [];
  const perDag = new Map();
  // ... (idag, laggTill oförändrade)

  for (const raw of events) {
    // ... (startDate/endDate/event/langd/pagar/arLangkorare oförändrade)

    if (arLangkorare) {
      if (pagar) {
        alltidPagaende.push(event);
      } else if (event.typ !== 'go-battle-league') {
        // Battle League svarar inte på någon av barnens frågor; en kommande omgång
        // får ingen rad. Pågående ligger kvar i "Pågår hela tiden" (spec punkt 2).
        laggTill(dagNyckel(startDate), startDate, event);
      }
      continue;
    }

    if (pagar && langd <= MAX_LANGD_NU_PANEL) {
      nuPanel.push(event);
      continue;
    }

    // Pågående raidrotationer visas av raden "Raider idag" när raiddata finns,
    // annars som rader under Idag — det avgör app.js (spec punkt 3).
    if (pagar && event.typ === 'raid-battles') {
      raidRotationer.push(event);
      continue;
    }

    // ... (en rad per event, oförändrat)
  }

  // ... (sortering oförändrad)
  raidRotationer.sort((a, b) => a.endDate - b.endDate);

  return { nuPanel, dagar, alltidPagaende, raidRotationer };
}
```

- [ ] **Steg 4: Kör testerna** — `npm test`, gröna.
- [ ] **Steg 5: Commit** — `git add docs/lib/kalender.js test/kalender.test.js && git commit -m "Kalender: Battle League utan rad, pågående raidrotationer i egen lista"`

---

### Task 5: Frontend — lättlästa namn och raidsammanslagning

**Filer:**
- Ändra: `docs/app.js`
- Ändra: `docs/styles.css` (ny klass `.sheet-original`)

**Gränssnitt:**
- Konsumerar: `event.namn` (Task 2), `raidRotationer` (Task 4), `formatNedrakning(…, 'byts')` (Task 3).

- [ ] **Steg 1: Visningsnamn.** Lägg till efter `ETIKETTER` i `app.js`:

```js
// Radnamnet är det lättlästa namnet från bygget; äldre JSON utan fältet faller
// tillbaka på originalet.
function visningsnamn(event) {
  return event.namn || event.name;
}
```

Byt `event.name` mot `visningsnamn(event)` i `rad()` (`let namn = …`) och `nuPanelNod()` (`nu-namn`). I `eventSheet`, ersätt `noder.push(el('h2', 'sheet-namn', event.name));` med:

```js
  noder.push(el('h2', 'sheet-namn', visningsnamn(event)));
  if (visningsnamn(event) !== event.name) {
    noder.push(el('p', 'sheet-original', event.name));
  }
```

- [ ] **Steg 2: CSS för originalnamnet** — efter `.sheet-namn` i `styles.css`:

```css
.sheet-original {
  margin: -4px 0 8px;
  font-size: 15px;
  color: var(--tackt-mjuk);
}
```

- [ ] **Steg 3: Raidraden med rotationer.** Ersätt `raidRad` och `raidSheet`:

```js
function raidSheet(grupper, kommande, nu) {
  const noder = [el('h2', 'sheet-namn', 'Raids just nu')];
  for (const grupp of grupper) {
    noder.push(el('h3', 'sheet-rubrik', grupp.rubrik));
    noder.push(pokemonRad(grupp.pokemon));
  }
  if (kommande.length > 0) {
    const nar = formatDatum(kommande[0].startDate, nu).toLowerCase();
    noder.push(el('h3', 'sheet-rubrik', `Nya raider ${nar}:`));
    noder.push(pokemonRad(kommande.flatMap((e) => e.pokemon)));
  }
  oppnaSheet(noder);
}

// rotationer: pågående flerdagars raidevent som raden representerar (kan vara tom).
// kommande: raidevent som startar näst i kalendern, alla på samma dag (kan vara tom).
function raidRad(grupper, rotationer, kommande, nu) {
  const alla = grupper.flatMap((g) => g.pokemon);
  const knapp = el('button', 'rad rad-typ-raid');
  knapp.type = 'button';
  if (alla[0]?.bild) {
    knapp.append(bildNod(alla[0].bild, 'rad-bild rad-bild-rund'));
  }
  const textkolumn = el('span', 'rad-text');
  textkolumn.append(el('span', 'rad-namn', `Raider idag: ${alla[0]?.namn ?? ''} +${Math.max(alla.length - 1, 0)}`));
  if (rotationer.length > 0) {
    const forst = rotationer[0];
    textkolumn.append(
      tidsrad(
        formatChip(forst.startDate, forst.endDate, nu),
        (n) => formatNedrakning(forst.startDate, forst.endDate, n, 'byts'),
        nu,
        true
      )
    );
  } else {
    const tid = el('span', 'rad-tid rad-tid-gron');
    tid.append(el('span', 'rad-klocka', 'hela dagen'));
    textkolumn.append(tid);
  }
  knapp.append(textkolumn);
  knapp.append(el('span', 'rad-pil', '›'));
  knapp.addEventListener('click', () => raidSheet(grupper, kommande, nu));
  return knapp;
}

// De raid-battles-event som startar näst i kalendern — alla som startar den dagen.
function nastaRaidRotationer(dagar, nu) {
  for (const dag of dagar) {
    const raids = dag.events.filter((e) => e.typ === 'raid-battles' && e.startDate.getTime() > nu.getTime());
    if (raids.length > 0) {
      return raids;
    }
  }
  return [];
}
```

- [ ] **Steg 4: `beraknaNastaGrans` tar med rotationerna.** Ändra signaturen till `beraknaNastaGrans(nuPanel, dagar, alltidPagaende, raidRotationer, nu)` och lägg till en loop `for (const event of raidRotationer) { uppdatera(event); }` före `return minsta;`.

- [ ] **Steg 5: `start()`** — ersätt destruktureringen och Idag-renderingen:

```js
    const { nuPanel, dagar, alltidPagaende, raidRotationer } = grupperaKalender(data.events, nu);
    nastaGrans = beraknaNastaGrans(nuPanel, dagar, alltidPagaende, raidRotationer, nu);
    const kommandeRaids = nastaRaidRotationer(dagar, nu);
```

och inuti dagloopen:

```js
      if (arIdag) {
        if (raidGrupper) {
          innehall.append(raidRad(raidGrupper, raidRotationer, kommandeRaids, nu));
        } else {
          // Utan raiddata finns ingen rad att slå in rotationerna i — visa dem som förut.
          for (const event of raidRotationer) {
            innehall.append(rad(event, dag.datum, nu, true));
          }
        }
      }
```

och tomtillståndet:

```js
      if (arIdag && dag.events.length === 0 && !raidGrupper && raidRotationer.length === 0 && nuPanel.length === 0) {
```

- [ ] **Steg 6: Verifiera i webbläsare.** Starta `python3 -m http.server 8000 --directory docs` och ta skärmdump med headless Chrome (sökvägen finns i `.claude/settings.local.json`):

```bash
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --headless=new --disable-gpu --window-size=360,1400 --screenshot=/tmp/v22-ljus.png http://localhost:8000/
```

Kontrollera: radnamn på svenska, en enda raidrad under Idag med `t.o.m. … · byts om …`, inga konsolfel (`--enable-logging=stderr --v=0` vid behov).

- [ ] **Steg 7: Commit** — `git add docs/app.js docs/styles.css && git commit -m "Frontend: lättlästa namn i rader, raidrotationer i Raider idag"`

---

### Task 6: Kalendern kapas vid 30 dagar

**Filer:**
- Ändra: `docs/app.js`, `docs/styles.css`

- [ ] **Steg 1: Konstant** — efter `OMRITNING_MS` i `app.js`:

```js
// Dagar längre bort än så här ligger bakom "Visa fler dagar" (spec 2026-09-13, punkt 4).
const MAX_DAGAR_SYNLIGA = 30;
const DYGN_MS = 24 * 60 * 60 * 1000;
```

- [ ] **Steg 2: Dold behållare.** I `start()`, före dagloopen:

```js
    const sistaSynligaDag = dagNyckel(new Date(nu.getTime() + MAX_DAGAR_SYNLIGA * DYGN_MS));
    let mal = innehall;
```

I loopen, efter `if (!arIdag && dag.events.length === 0) continue;` och före rubriken:

```js
      if (mal === innehall && dag.nyckel > sistaSynligaDag) {
        const dolda = el('div', 'dolda-dagar');
        dolda.hidden = true;
        const visa = el('button', 'visa-fler', 'Visa fler dagar ▾');
        visa.type = 'button';
        visa.addEventListener('click', () => {
          dolda.hidden = false;
          visa.remove();
        });
        innehall.append(visa, dolda);
        mal = dolda;
      }
```

Byt varje `innehall.append(...)` inuti dagloopen (rubrik, raidrad, rader, tomtillstånd) mot `mal.append(...)`. Strippen efter loopen ligger kvar på `innehall`.

- [ ] **Steg 3: CSS** — efter `.strip-knapp`:

```css
.visa-fler {
  display: block;
  width: 100%;
  min-height: 48px;
  margin-top: 18px;
  background: var(--bla-ljus);
  border: 0;
  border-radius: 12px;
  color: var(--bla);
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
}
```

- [ ] **Steg 4: Verifiera** med skärmdump som i Task 5 steg 6: knappen syns efter ~30 dagar, tryck visar resten (verifiera i riktig Chrome eller via `--dump-dom` att `.dolda-dagar` innehåller dagrubriker).

- [ ] **Steg 5: Commit** — `git add docs/app.js docs/styles.css && git commit -m "Kalendern visar 30 dagar, resten bakom Visa fler dagar"`

---

### Task 7: Färgkant per typ och mörkt läge

**Filer:**
- Ändra: `docs/styles.css`, `docs/app.js`, `docs/index.html`

- [ ] **Steg 1: Typfamilj i `app.js`** — efter `POKEMONBILD_TYPER`:

```js
// Färgkant per typfamilj (spec 2026-09-13, punkt 6). Typer utanför tabellen får ingen.
const TYPFAMILJ = {
  'raid-battles': 'raid',
  'raid-hour': 'raid',
  'raid-day': 'raid',
  'elite-raids': 'raid',
  'shadow-raids': 'raid',
  'raid-weekend': 'raid',
  'pokemon-spotlight-hour': 'rampljus',
  'community-day': 'community',
  'max-mondays': 'max',
  'max-battles': 'max',
};
```

I `rad()`, efter `knapp.type = 'button';`:

```js
  if (TYPFAMILJ[event.typ]) {
    knapp.classList.add(`rad-typ-${TYPFAMILJ[event.typ]}`);
  }
```

- [ ] **Steg 2: Variabler i `styles.css`.** Utöka `:root` med:

```css
  --pil: #b7a88f;
  --langd: #6f6250;
  --strip-bg: #f4ede0;
  --poke-bg: #ffffff;
  --rod-ljus: #fbe4e2;
  --rod-morgon: #a02b24;
  --radskugga: 0 1px 5px rgba(94, 70, 34, 0.14);
  --backdrop: rgba(43, 33, 24, 0.45);
  --typ-raid: #d63b2f;
  --typ-rampljus: #e8901c;
  --typ-community: #d6438f;
  --typ-max: #7b4fd1;
```

och byt hårdkodade värden: `.rad { box-shadow: var(--radskugga); }`, `.rad-langd { color: var(--langd); }`, `.rad-pil { color: var(--pil); }`, `.strip-knapp { background: var(--strip-bg); }`, `.mini-poke { background: var(--poke-bg); }`, `.etikett-galler-inte { background: var(--rod-ljus); color: var(--rod-morgon); }`, `.backdrop { background: var(--backdrop); }`. (`--langd` mörknas från `#8a7a63` till `#6f6250`: det gamla värdet gav 4,0:1 mot vitt, under AA.)

- [ ] **Steg 3: Färgkant** — ändra `.rad` till `border: 0; border-left: 5px solid transparent;` och lägg till:

```css
.rad-typ-raid { border-left-color: var(--typ-raid); }
.rad-typ-rampljus { border-left-color: var(--typ-rampljus); }
.rad-typ-community { border-left-color: var(--typ-community); }
.rad-typ-max { border-left-color: var(--typ-max); }
```

- [ ] **Steg 4: Mörkt läge** — sist i `styles.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bakgrund: #1a1511;
    --kort: #282019;
    --tackt: #f4ecdf;
    --tackt-mjuk: #c2b39c;
    --gron: #6fd68a;
    --gron-ljus: #1e3524;
    --bla: #8ab8ff;
    --bla-ljus: #1f2c45;
    --gul-morgon: #f1cd6a;
    --gul-ljus: #3b3012;
    --rod: #ff6b61;
    --linje: #3b3128;
    --skugga: 0 4px 16px rgba(0, 0, 0, 0.4);
    --pil: #8f8068;
    --langd: #a8987f;
    --strip-bg: #2f271f;
    --poke-bg: #3a3128;
    --rod-ljus: #452320;
    --rod-morgon: #ffb0a8;
    --radskugga: 0 1px 5px rgba(0, 0, 0, 0.35);
    --backdrop: rgba(0, 0, 0, 0.6);
    --typ-raid: #ff7b6e;
    --typ-rampljus: #ffb347;
    --typ-community: #ff7ac0;
    --typ-max: #b48cff;
  }
  body {
    background-image: none;
  }
  .pokeboll {
    background:
      radial-gradient(circle at 50% 50%, #fff 0 7px, #1a1511 7px 10px, transparent 10px),
      linear-gradient(to bottom, transparent 0 calc(50% - 3px), #1a1511 calc(50% - 3px) calc(50% + 3px), transparent calc(50% + 3px)),
      linear-gradient(to bottom, var(--rod) 0 50%, #fff 50%);
  }
}
```

- [ ] **Steg 5: `index.html`** — efter befintlig `theme-color`:

```html
  <meta name="theme-color" content="#1a1511" media="(prefers-color-scheme: dark)">
```

- [ ] **Steg 6: Verifiera** — skärmdump ljus och mörk (`--force-dark-mode` fungerar inte för `prefers-color-scheme`; använd i stället `--enable-features=WebContentsForceDark` eller emulera via `--blink-settings=preferredColorScheme=1`... enklast: temporärt lägg `@media` -blockets innehåll i `:root` via devtools i riktig Chrome, eller kontrollera på mobilen med mörkt tema). Kontrollera att kanten syns på raid-, rampljus-, community- och Max-rader och att ingen text i mörkt läge blir grå på grått.

- [ ] **Steg 7: Commit** — `git add docs/ && git commit -m "Färgkant per eventtyp och mörkt läge"`

---

### Task 8: Bygg, dokumentation och sluttest

**Filer:**
- Ändra: `PRD-pokemon-events.md`, `README.md`
- Genererat: `docs/events-sv.json`, `data/saknar-beskrivning.json`

- [ ] **Steg 1: Kör bygget lokalt** — `npm run build`. Kontrollera att `docs/events-sv.json` har `namn` på varje event (`node -e "const j=require('./docs/events-sv.json'); console.log(j.events.filter(e=>!e.namn).length)"` → 0) och att `data/saknar-beskrivning.json` listar de event som bara fått standardtext.

- [ ] **Steg 2: PRD.** Ändra i `PRD-pokemon-events.md`:
  - Rubrikblock: `**Version:** 2.2`, datum `2026-09-13`, status `Version 2.2 driftsatt (etapp 1–7 + 9; etapp 8 och 10 återstår)`.
  - Etapp 7, acceptanskriteriet "Pokémon-namn och officiella eventnamn översätts ALDRIG" → "Pokémon-namn översätts ALDRIG. Originalnamnet visas alltid i detaljvyn; kalenderradens namn får skrivas om deterministiskt (v2.2)."
  - Avsnitt 9, Definition of Done: markera punkt 1, 2 och 3 som uppfyllda (`[x]`) med notis "barnen använder sidan självständigt sedan augusti 2026"; etapp 8/10 kvarstår.
  - Ändringslogg: nytt avsnitt `### Version 2.2 (2026-09-13)` som sammanfattar punkterna 1–7 i specen och hänvisar till `specs/2026-09-13-lattlast-kalender-design.md`.
  - Öppna frågor: lägg till "Ska Toni fylla `data/beskrivningar.json` löpande, eller är det dags för etapp 8?"

- [ ] **Steg 3: README.** Under "Underhåll", ny punkt: "**Event utan svensk text?** Bygget listar dem i `data/saknar-beskrivning.json`. Skriv en text per originalnamn i `data/beskrivningar.json` — den slår mallen."

- [ ] **Steg 4: Hela sviten och skärmdump** — `npm test` (alla gröna), skärmdump 360 px ljus, ögna igenom att sidan inte har horisontell skroll (`--dump-dom` + `document.documentElement.scrollWidth` ≤ 360 via ett litet skript, eller okulärt).

- [ ] **Steg 5: Commit och push** — `git add -A && git commit -m "Kalendervy v2.2: lättlästa namn, mindre brus, färgkant, mörkt läge" && git push`. Verifiera efter Pages-deployen att live-sidan visar svenska radnamn.
