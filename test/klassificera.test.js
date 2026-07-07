import { test } from 'node:test';
import assert from 'node:assert/strict';
import { klassificera } from '../docs/lib/klassificera.js';

const NU = new Date('2026-07-16T12:00:00.000Z');

function ev(namn, start, slut) {
  return { name: namn, start, end: slut };
}

// Testfall 3.1: start igår, slut imorgon → Pågår nu
test('event som pågår hamnar under "pågår nu"', () => {
  const r = klassificera([ev('A', '2026-07-15T00:00:00.000Z', '2026-07-17T00:00:00.000Z')], NU);
  assert.equal(r.pagarNu.length, 1);
  assert.equal(r.kommerSnart.length, 0);
});

// Testfall 3.2: start om 2 timmar → Kommer snart
test('event som inte börjat hamnar under "kommer snart"', () => {
  const r = klassificera([ev('B', '2026-07-16T14:00:00.000Z', '2026-07-16T15:00:00.000Z')], NU);
  assert.equal(r.pagarNu.length, 0);
  assert.equal(r.kommerSnart.length, 1);
});

// Testfall 3.3: 1 minut före resp. efter starttid byter sektion
test('1 minut före start ligger under "kommer snart", 1 minut efter under "pågår nu"', () => {
  const e = [ev('C', '2026-07-16T12:01:00.000Z', '2026-07-16T13:00:00.000Z')];
  assert.equal(klassificera(e, NU).kommerSnart.length, 1);
  const efter = new Date('2026-07-16T12:02:00.000Z');
  assert.equal(klassificera(e, efter).pagarNu.length, 1);
});

// Testfall 3.4: avslutade events syns inte
test('avslutade events filtreras bort', () => {
  const r = klassificera([ev('D', '2026-07-14T00:00:00.000Z', '2026-07-15T00:00:00.000Z')], NU);
  assert.equal(r.pagarNu.length, 0);
  assert.equal(r.kommerSnart.length, 0);
});

test('"kommer snart" sorteras på starttid, närmast först', () => {
  const r = klassificera([
    ev('sen', '2026-07-20T00:00:00.000Z', '2026-07-21T00:00:00.000Z'),
    ev('snart', '2026-07-17T00:00:00.000Z', '2026-07-18T00:00:00.000Z'),
  ], NU);
  assert.deepEqual(r.kommerSnart.map((e) => e.name), ['snart', 'sen']);
});

test('"pågår nu" sorteras på sluttid, slutar först överst', () => {
  const r = klassificera([
    ev('långt', '2026-07-10T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
    ev('kort', '2026-07-16T00:00:00.000Z', '2026-07-16T18:00:00.000Z'),
  ], NU);
  assert.deepEqual(r.pagarNu.map((e) => e.name), ['kort', 'långt']);
});

test('parsade tidsobjekt följer med på eventet', () => {
  const r = klassificera([ev('E', '2026-07-16T18:00:00.000', '2026-07-16T19:00:00.000')], NU);
  assert.ok(r.kommerSnart[0].startDate instanceof Date);
  assert.ok(r.kommerSnart[0].endDate instanceof Date);
});
