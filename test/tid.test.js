import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolkaTid, formatKlocka, formatDatum, formatTidsspann, formatNedrakning, formatLangd } from '../docs/lib/tid.js';

// Testfall 2.1: tid utan Z tolkas som svensk lokal tid och konverteras INTE
test('tid utan Z tolkas som svensk väggklocka (18 förblir 18)', () => {
  const d = tolkaTid('2026-07-16T18:00:00.000');
  assert.equal(formatKlocka(d), '18');
});

test('tid utan Z i juli motsvarar UTC+2 som tidsobjekt', () => {
  const d = tolkaTid('2026-07-16T18:00:00.000');
  assert.equal(d.getTime(), Date.UTC(2026, 6, 16, 16, 0, 0));
});

test('tid utan Z i januari motsvarar UTC+1 som tidsobjekt', () => {
  const d = tolkaTid('2026-01-15T18:00:00.000');
  assert.equal(d.getTime(), Date.UTC(2026, 0, 15, 17, 0, 0));
});

// Testfall 2.2: tid med Z i juli konverteras till svensk sommartid
test('tid med Z i juli visas som UTC+2 (10Z blir kl 12)', () => {
  const d = tolkaTid('2026-07-16T10:00:00.000Z');
  assert.equal(formatKlocka(d), '12');
});

// Testfall 2.3: samma UTC-tid i januari blir vintertid
test('tid med Z i januari visas som UTC+1 (10Z blir kl 11)', () => {
  const d = tolkaTid('2026-01-15T10:00:00.000Z');
  assert.equal(formatKlocka(d), '11');
});

test('halvtimmar visas med punkt (18.30)', () => {
  const d = tolkaTid('2026-07-16T18:30:00.000');
  assert.equal(formatKlocka(d), '18.30');
});

// Datum visas som "lördag 6 juli" med svenska namn i gemener
test('datum formatteras som "torsdag 16 juli"', () => {
  const d = tolkaTid('2026-07-16T18:00:00.000');
  const nu = tolkaTid('2026-07-01T12:00:00.000');
  assert.equal(formatDatum(d, nu), 'torsdag 16 juli');
});

// Testfall 2.4: event som startar dagens datum får "Idag"
test('samma dag ger "Idag"', () => {
  const d = tolkaTid('2026-07-16T18:00:00.000');
  const nu = tolkaTid('2026-07-16T08:00:00.000');
  assert.equal(formatDatum(d, nu), 'Idag');
});

test('nästa dag ger "Imorgon"', () => {
  const d = tolkaTid('2026-07-17T18:00:00.000');
  const nu = tolkaTid('2026-07-16T08:00:00.000');
  assert.equal(formatDatum(d, nu), 'Imorgon');
});

test('dagsgränsen räknas i svensk tid, inte UTC', () => {
  // 23:30Z den 16:e är 01:30 svensk tid den 17:e i juli
  const d = tolkaTid('2026-07-16T23:30:00.000Z');
  const nu = tolkaTid('2026-07-17T08:00:00.000');
  assert.equal(formatDatum(d, nu), 'Idag');
});

// PRD: tid som "kl 10–18" för spann samma dag
test('tidsspann samma dag blir "Idag kl 18–19"', () => {
  const start = tolkaTid('2026-07-16T18:00:00.000');
  const slut = tolkaTid('2026-07-16T19:00:00.000');
  const nu = tolkaTid('2026-07-16T08:00:00.000');
  assert.equal(formatTidsspann(start, slut, nu), 'Idag kl 18–19');
});

test('tidsspann över flera dagar visar båda datumen', () => {
  const start = tolkaTid('2026-07-13T06:00:00.000');
  const slut = tolkaTid('2026-07-14T22:00:00.000');
  const nu = tolkaTid('2026-07-01T08:00:00.000');
  assert.equal(
    formatTidsspann(start, slut, nu),
    'måndag 13 juli kl 6 – tisdag 14 juli kl 22'
  );
});

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

test('23 timmar 59 minuter till start är nästa kalenderdag och ger "om 1 dag"', () => {
  assert.equal(formatNedrakning(efter(23 * TIMME + 59 * MINUT), efter(30 * TIMME), NU), 'om 1 dag');
});

test('exakt ett dygn till start ger "om 1 dag" (singular)', () => {
  assert.equal(formatNedrakning(efter(DYGN), efter(DYGN + TIMME), NU), 'om 1 dag');
});

test('nio dygn till start ger "om 9 dagar"', () => {
  assert.equal(formatNedrakning(efter(9 * DYGN), efter(9 * DYGN + 3 * TIMME), NU), 'om 9 dagar');
});

// --- Avrundning nedåt för minuter och timmar (underskattning är ofarliga riktningen).
//     Dygn räknas däremot exakt i kalenderdagar, se nästa avsnitt. ---

test('2 timmar 50 minuter avrundas nedåt till "om 2 timmar"', () => {
  assert.equal(formatNedrakning(efter(2 * TIMME + 50 * MINUT), efter(5 * TIMME), NU), 'om 2 timmar');
});

// --- Dygn räknas i kalenderdagar, inte i förflutna 24-timmarsperioder ---
// Barn tänker i sömnar, inte i timmar: är det fredag ska ett event på måndag stå
// "om 3 dagar" oavsett vad klockan är. NU i testerna ovan är en fredag.

test('1 dygn 23 timmar spänner över två kalenderdagar och ger "om 2 dagar"', () => {
  assert.equal(formatNedrakning(efter(DYGN + 23 * TIMME), efter(3 * DYGN), NU), 'om 2 dagar');
});

test('fredag morgon till måndag ger "om 3 dagar"', () => {
  const nu = tolkaTid('2026-08-07T08:00:00.000');
  const start = tolkaTid('2026-08-10T10:00:00.000');
  const slut = tolkaTid('2026-08-10T13:00:00.000');
  assert.equal(formatNedrakning(start, slut, nu), 'om 3 dagar');
});

test('fredag sen kväll till samma måndag ger också "om 3 dagar" (60 timmar, inte 2 dygn)', () => {
  const nu = tolkaTid('2026-08-07T22:00:00.000');
  const start = tolkaTid('2026-08-10T10:00:00.000');
  const slut = tolkaTid('2026-08-10T13:00:00.000');
  assert.equal(formatNedrakning(start, slut, nu), 'om 3 dagar');
});

test('nästa kalenderdag ger "om 1 dag" även när starten bara är en timme bort', () => {
  const nu = tolkaTid('2026-08-07T23:30:00.000');
  const start = tolkaTid('2026-08-08T00:30:00.000');
  const slut = tolkaTid('2026-08-08T02:00:00.000');
  assert.equal(formatNedrakning(start, slut, nu), 'om 1 dag');
});

test('samma kalenderdag räknas i timmar även när det är nästan ett helt dygn', () => {
  const nu = tolkaTid('2026-08-07T00:10:00.000');
  const start = tolkaTid('2026-08-07T23:50:00.000');
  const slut = tolkaTid('2026-08-08T01:00:00.000');
  assert.equal(formatNedrakning(start, slut, nu), 'om 23 timmar');
});

// --- Längdtext på kommande flerdagarsevents startdagsrad ---
// Räknas i kalenderdagar precis som nedräkningen, så de två siffrorna på samma kort
// aldrig kan bygga på olika sätt att räkna dygn.

test('kommande flerdagarsevent får längden i kalenderdagar', () => {
  const start = tolkaTid('2026-08-11T10:00:00.000');
  const slut = tolkaTid('2026-08-17T20:00:00.000');
  assert.equal(formatLangd(start, slut), 'pågår 7 dagar');
});

test('event som börjar och slutar samma dag får ingen längdtext', () => {
  const start = tolkaTid('2026-08-11T10:00:00.000');
  const slut = tolkaTid('2026-08-11T18:00:00.000');
  assert.equal(formatLangd(start, slut), null);
});

test('event över exakt två kalenderdagar ger "pågår 2 dagar"', () => {
  const start = tolkaTid('2026-08-11T10:00:00.000');
  const slut = tolkaTid('2026-08-12T18:00:00.000');
  assert.equal(formatLangd(start, slut), 'pågår 2 dagar');
});

test('längden påverkas inte av sommartidsskiftet', () => {
  const start = tolkaTid('2026-03-27T10:00:00.000');
  const slut = tolkaTid('2026-03-30T18:00:00.000');
  assert.equal(formatLangd(start, slut), 'pågår 4 dagar');
});

// Sommartidsskiftet gör dygnet 23 timmar långt. Kalenderdagsräkningen ska inte bry
// sig: natten till 29 mars 2026 ställs klockan fram, och nästa dag är ändå nästa dag.
test('dygnsräkningen påverkas inte av sommartidsskiftet', () => {
  const nu = tolkaTid('2026-03-28T12:00:00.000');
  const start = tolkaTid('2026-03-29T11:30:00.000');
  const slut = tolkaTid('2026-03-29T14:00:00.000');
  assert.equal(formatNedrakning(start, slut, nu), 'om 1 dag');
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

// Kalendergrupperingen filtrerar bort avslutade events vid render, men ticker n
// (app.js) kan hinna passera slutet innan en omritning hinner ske — funktionen
// måste då vara ärlig i stället för att visa ett negativt tal som "slutar strax".
test('redan avslutat event ger "har slutat" i stället för negativ tid', () => {
  assert.equal(formatNedrakning(fore(3 * TIMME), fore(TIMME), NU), 'har slutat');
});

test('exakt noll kvar (slutet passerat i precis detta ögonblick) ger "har slutat"', () => {
  assert.equal(formatNedrakning(fore(TIMME), NU, NU), 'har slutat');
});

test('samma event ger samma nedräkning oavsett vilken dag raden står under', () => {
  const start = fore(DYGN);
  const slut = efter(3 * DYGN);
  assert.equal(formatNedrakning(start, slut, NU), 'slutar om 3 dagar');
});
