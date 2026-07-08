import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolkaTid, formatDagRubrik, formatChip, arHelg } from '../docs/lib/tid.js';

const NU = tolkaTid('2026-07-08T18:30:00.000'); // onsdag 8 juli 2026

test('dagrubrik för idag och imorgon', () => {
  assert.equal(formatDagRubrik(tolkaTid('2026-07-08T10:00:00.000'), NU), 'Idag · onsdag 8 juli');
  assert.equal(formatDagRubrik(tolkaTid('2026-07-09T10:00:00.000'), NU), 'Imorgon · torsdag 9 juli');
});

test('dagrubrik för övriga dagar är veckodag + datum', () => {
  assert.equal(formatDagRubrik(tolkaTid('2026-07-11T10:00:00.000'), NU), 'lördag 11 juli');
});

test('helgdetektering i svensk tid', () => {
  assert.equal(arHelg(tolkaTid('2026-07-11T10:00:00.000')), true);  // lördag
  assert.equal(arHelg(tolkaTid('2026-07-12T10:00:00.000')), true);  // söndag
  assert.equal(arHelg(tolkaTid('2026-07-10T10:00:00.000')), false); // fredag
});

function chip(start, slut, dag) {
  return formatChip(tolkaTid(start), tolkaTid(slut), tolkaTid(dag));
}

test('chip: startar och slutar samma dag → "kl 10–18"', () => {
  assert.equal(chip('2026-07-11T10:00:00.000', '2026-07-11T18:00:00.000', '2026-07-11T00:00:00.000'), 'kl 10–18');
});

test('chip: startar denna dag, slutar senare → "från kl 6"', () => {
  assert.equal(chip('2026-07-13T06:00:00.000', '2026-07-14T22:00:00.000', '2026-07-13T00:00:00.000'), 'från kl 6');
});

test('chip: började tidigare, slutar denna dag → "till kl 22"', () => {
  assert.equal(chip('2026-07-13T06:00:00.000', '2026-07-14T22:00:00.000', '2026-07-14T00:00:00.000'), 'till kl 22');
});

test('chip: började tidigare, slutar inom en vecka → "t.o.m. fredag"', () => {
  assert.equal(chip('2026-07-06T00:01:00.000', '2026-07-10T23:59:00.000', '2026-07-08T00:00:00.000'), 't.o.m. fredag');
});

test('chip: började tidigare, slutar längre fram → "t.o.m. 4 augusti"', () => {
  assert.equal(chip('2026-07-01T06:00:00.000', '2026-08-04T22:00:00.000', '2026-07-09T00:00:00.000'), 't.o.m. 4 augusti');
});
