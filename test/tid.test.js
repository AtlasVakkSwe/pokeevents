import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolkaTid, formatKlocka, formatDatum, formatTidsspann, formatNedrakning } from '../docs/lib/tid.js';

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
