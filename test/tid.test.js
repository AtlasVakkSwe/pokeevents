import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolkaTid, formatKlocka, formatDatum, formatTidsspann } from '../docs/lib/tid.js';

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
