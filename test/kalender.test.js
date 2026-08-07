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

// Ett event syns de dagar det är aktivt. Tidigare visades bara startdag, slutdag och
// Idag; en dag där eventet pågick men varken började eller slutade saknades helt, vilket
// gjorde att raden på slutdagen läste som om eventet hörde till just den dagen.

test('pågående flerdagarsevent visas varje dag det är aktivt', () => {
  const e = ev('Road', 'event', '2026-07-06T00:01:00.000', '2026-07-10T23:59:00.000');
  const k = grupperaKalender([e], NU);
  const nycklar = k.dagar.filter((d) => d.events.some((x) => x.name === 'Road')).map((d) => d.nyckel);
  assert.deepEqual(nycklar, ['2026-07-08', '2026-07-09', '2026-07-10']);
});

test('pågående event visas inte på dagar som redan passerat', () => {
  const e = ev('Road', 'event', '2026-07-06T00:01:00.000', '2026-07-10T23:59:00.000');
  const k = grupperaKalender([e], NU);
  const nycklar = k.dagar.filter((d) => d.events.some((x) => x.name === 'Road')).map((d) => d.nyckel);
  assert.ok(!nycklar.includes('2026-07-06'));
  assert.ok(!nycklar.includes('2026-07-07'));
});

test('kommande flerdagarsevent visas varje dag från start till slut', () => {
  const e = ev('Vattenfest', 'event', '2026-07-11T10:00:00.000', '2026-07-15T20:00:00.000');
  const k = grupperaKalender([e], NU);
  const nycklar = k.dagar.filter((d) => d.events.some((x) => x.name === 'Vattenfest')).map((d) => d.nyckel);
  assert.deepEqual(nycklar, ['2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15']);
});

test('tvådagarsevent visas båda dagarna', () => {
  const gofest = ev('GO Fest', 'pokemon-go-fest', '2026-07-11T10:00:00.000', '2026-07-12T19:00:00.000');
  const k = grupperaKalender([gofest], NU);
  const nycklar = k.dagar.filter((d) => d.events.some((x) => x.name === 'GO Fest')).map((d) => d.nyckel);
  assert.deepEqual(nycklar, ['2026-07-11', '2026-07-12']);
});

// Det konkreta hålet i den gamla regeln: en dag mitt i ett event hoppades över helt,
// så en helgdag kunde se tom ut trots att två events pågick.
test('dag där inget börjar eller slutar finns ändå när ett event är aktivt', () => {
  const e = ev('Marathon', 'event', '2026-07-06T00:01:00.000', '2026-07-12T23:59:00.000');
  const k = grupperaKalender([e], NU);
  const dag = k.dagar.find((d) => d.nyckel === '2026-07-10');
  assert.ok(dag, 'mellandagen ska finnas som egen dag i kalendern');
  assert.equal(dag.events[0].name, 'Marathon');
});

// Natten till 29 mars 2026 ställs klockan fram och dygnet blir 23 timmar långt.
// Dagstegningen får varken hoppa över eller dubblera en dag.
test('dagstegningen påverkas inte av sommartidsskiftet', () => {
  const nu = tolkaTid('2026-03-27T12:00:00.000');
  const e = ev('Vårevent', 'event', '2026-03-27T10:00:00.000', '2026-03-30T20:00:00.000');
  const k = grupperaKalender([e], nu);
  const nycklar = k.dagar.filter((d) => d.events.some((x) => x.name === 'Vårevent')).map((d) => d.nyckel);
  assert.deepEqual(nycklar, ['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30']);
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
  const nytt = ev('Raidkväll', 'raid-battles', '2026-07-09T17:00:00.000', '2026-07-09T20:00:00.000');
  const tidigt = ev('Morgon', 'raid-battles', '2026-07-09T06:00:00.000', '2026-07-09T09:00:00.000');
  const k = grupperaKalender([nytt, tidigt, gammalt], NU);
  const dag = k.dagar.find((d) => d.nyckel === '2026-07-09');
  assert.deepEqual(dag.events.map((e) => e.name), ['Pågående', 'Morgon', 'Raidkväll']);
});

test('parsade tidsobjekt följer med händelserna', () => {
  const e = ev('X', 'event', '2026-07-09T10:00:00.000', '2026-07-09T18:00:00.000');
  const k = grupperaKalender([e], NU);
  const dag = k.dagar.find((d) => d.nyckel === '2026-07-09');
  assert.ok(dag.events[0].startDate instanceof Date);
  assert.ok(dag.datum instanceof Date);
});
