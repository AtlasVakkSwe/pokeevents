import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grupperaKalender } from '../docs/lib/kalender.js';
import { tolkaTid } from '../docs/lib/tid.js';

// Tisdag 8 juli 2026, kl 18.30 svensk tid
const NU = tolkaTid('2026-07-08T18:30:00.000');

function ev(namn, typ, start, slut) {
  return { name: namn, typ, start, end: slut, pokemon: [], bonusar: [] };
}

test('kort event som pågår hamnar i NU-panelen, inte under Idag', () => {
  const spotlight = ev('Zubat', 'pokemon-spotlight-hour', '2026-07-08T18:00:00.000', '2026-07-08T19:00:00.000');
  const k = grupperaKalender([spotlight], NU);
  assert.equal(k.nuPanel.length, 1);
  assert.equal(k.nuPanel[0].name, 'Zubat');
  const idag = k.dagar[0];
  assert.ok(!idag.events.some((e) => e.name === 'Zubat'));
});

test('kort event senare i veckan hamnar på sin dag, inte i NU-panelen', () => {
  const spotlight = ev('Snubbull', 'pokemon-spotlight-hour', '2026-07-16T18:00:00.000', '2026-07-16T19:00:00.000');
  const k = grupperaKalender([spotlight], NU);
  assert.equal(k.nuPanel.length, 0);
  const dag = k.dagar.find((d) => d.nyckel === '2026-07-16');
  assert.equal(dag.events[0].name, 'Snubbull');
});

// En rad per event. Kalendern visar vad som börjar, plus vad som gäller idag.
// Ett pågående event hör hemma under Idag; ett kommande under sin startdag. Att låta
// samma event upprepas på fler dagar gav antingen tom upprepning (samma nedräkning om
// och om igen) eller en rad under en framtida dag vars siffra räknade från nu.

test('pågående flerdagarsevent visas bara under Idag', () => {
  const e = ev('Road', 'event', '2026-07-06T00:01:00.000', '2026-07-10T23:59:00.000');
  const k = grupperaKalender([e], NU);
  const nycklar = k.dagar.filter((d) => d.events.some((x) => x.name === 'Road')).map((d) => d.nyckel);
  assert.deepEqual(nycklar, ['2026-07-08']);
});

test('kommande flerdagarsevent visas bara på sin startdag', () => {
  const e = ev('Vattenfest', 'event', '2026-07-11T10:00:00.000', '2026-07-15T20:00:00.000');
  const k = grupperaKalender([e], NU);
  const nycklar = k.dagar.filter((d) => d.events.some((x) => x.name === 'Vattenfest')).map((d) => d.nyckel);
  assert.deepEqual(nycklar, ['2026-07-11']);
});

test('event som börjar senare idag hamnar under Idag', () => {
  const e = ev('Kvällsraid', 'raid-battles', '2026-07-08T20:00:00.000', '2026-07-09T22:00:00.000');
  const k = grupperaKalender([e], NU);
  const nycklar = k.dagar.filter((d) => d.events.some((x) => x.name === 'Kvällsraid')).map((d) => d.nyckel);
  assert.deepEqual(nycklar, ['2026-07-08']);
});

// Följden av regeln: en dag där ingenting börjar finns inte. Det är avsiktligt —
// att eventet pågår den dagen framgår av Idag-raden, som namnger slutdagen.
test('dag där ingenting börjar finns inte i kalendern', () => {
  const e = ev('Marathon', 'event', '2026-07-06T00:01:00.000', '2026-07-12T23:59:00.000');
  const k = grupperaKalender([e], NU);
  assert.ok(!k.dagar.some((d) => d.nyckel === '2026-07-10'));
});

test('kommande endagsevent får bara en rad', () => {
  const e = ev('Raiddag', 'raid-day', '2026-07-18T14:00:00.000', '2026-07-18T17:00:00.000');
  const k = grupperaKalender([e], NU);
  const traffar = k.dagar.filter((d) => d.events.some((x) => x.name === 'Raiddag'));
  assert.equal(traffar.length, 1);
  assert.equal(traffar[0].nyckel, '2026-07-18');
});

test('pågående säsong hamnar under "pågår hela tiden", inte i kalendern', () => {
  const s = ev('Forever Forward', 'season', '2026-06-02T10:00:00.000', '2026-09-08T10:00:00.000');
  const k = grupperaKalender([s], NU);
  assert.equal(k.alltidPagaende.length, 1);
  assert.ok(k.dagar.every((d) => d.events.length === 0));
});

test('go-battle-league räknas som långkörare även när omgången är kort', () => {
  const gbl = ev('Ultra League', 'go-battle-league', '2026-07-07T22:00:00.000', '2026-07-14T22:00:00.000');
  const k = grupperaKalender([gbl], NU);
  assert.equal(k.alltidPagaende.length, 1);
});

test('okänd typ längre än 14 dagar räknas som långkörare via längdregeln', () => {
  const lang = ev('Jubileum', 'event', '2026-07-01T00:00:00.000', '2026-07-30T00:00:00.000');
  const k = grupperaKalender([lang], NU);
  assert.equal(k.alltidPagaende.length, 1);
});

test('långkörare som inte börjat visas i kalendern på sin startdag', () => {
  const s = ev('Ny säsong', 'season', '2026-09-08T10:00:00.000', '2026-12-01T10:00:00.000');
  const k = grupperaKalender([s], NU);
  assert.equal(k.alltidPagaende.length, 0);
  const dag = k.dagar.find((d) => d.nyckel === '2026-09-08');
  assert.equal(dag.events[0].name, 'Ny säsong');
});

test('avslutade events visas inte alls', () => {
  const e = ev('Gammalt', 'event', '2026-07-01T00:00:00.000', '2026-07-07T00:00:00.000');
  const k = grupperaKalender([e], NU);
  assert.equal(k.nuPanel.length + k.alltidPagaende.length, 0);
  assert.ok(k.dagar.every((d) => d.events.length === 0));
});

test('Idag finns alltid som första dag, även utan events', () => {
  const k = grupperaKalender([], NU);
  assert.equal(k.dagar[0].nyckel, '2026-07-08');
});

test('events inom en dag sorteras på starttid, äldst först', () => {
  const gammalt = ev('Pågående', 'event', '2026-07-06T00:00:00.000', '2026-07-09T23:00:00.000');
  const senare = ev('Raidkväll', 'raid-battles', '2026-07-08T21:00:00.000', '2026-07-08T22:30:00.000');
  const k = grupperaKalender([senare, gammalt], NU);
  const dag = k.dagar.find((d) => d.nyckel === '2026-07-08');
  assert.deepEqual(dag.events.map((e) => e.name), ['Pågående', 'Raidkväll']);
});

test('parsade tidsobjekt följer med händelserna', () => {
  const e = ev('X', 'event', '2026-07-09T10:00:00.000', '2026-07-09T18:00:00.000');
  const k = grupperaKalender([e], NU);
  const dag = k.dagar.find((d) => d.nyckel === '2026-07-09');
  assert.ok(dag.events[0].startDate instanceof Date);
  assert.ok(dag.datum instanceof Date);
});

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
