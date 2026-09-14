import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valideraEvents } from '../scripts/lib/validera.js';

const giltigt = [
  { name: 'X', eventType: 'event', start: '2026-07-16T18:00:00.000', end: '2026-07-16T19:00:00.000' },
];

test('giltig array passerar och returneras', () => {
  assert.deepEqual(valideraEvents(giltigt), giltigt);
});

// Testfall 1.3: trasig struktur ska ge fel, inte tom sida
test('icke-array kastar fel', () => {
  assert.throws(() => valideraEvents({ events: [] }), /array/i);
});

test('tom array kastar fel (tomt svar ska inte skriva över cache)', () => {
  assert.throws(() => valideraEvents([]), /tom/i);
});

test('event utan namn eller typ kastar fel', () => {
  for (const falt of ['name', 'eventType']) {
    const trasigt = [{ ...giltigt[0] }];
    delete trasigt[0][falt];
    assert.throws(() => valideraEvents(trasigt), new RegExp(falt));
  }
});

// LeekDuck listar ibland event utan datum (start/end null). Ett sådant ska inte
// stoppa hela dygnsbygget – det hoppas över så att resten kan uppdateras.
test('event utan start eller slut hoppas över, resten returneras', () => {
  const odaterat = { name: 'Odaterat', eventType: 'pokemon-spotlight-hour', start: null, end: null };
  const utanSlut = { ...giltigt[0], name: 'Utan slut', end: '' };
  assert.deepEqual(valideraEvents([odaterat, ...giltigt, utanSlut]), giltigt);
});

test('överhoppade event rapporteras via varna med namn och saknat fält', () => {
  const odaterat = { name: 'Odaterat', eventType: 'event', start: null, end: '2026-07-16T19:00:00.000' };
  const varningar = [];
  valideraEvents([...giltigt, odaterat], { varna: (m) => varningar.push(m) });
  assert.equal(varningar.length, 1);
  assert.match(varningar[0], /Odaterat/);
  assert.match(varningar[0], /start/);
});

test('om alla event saknar datum kastas fel (ska inte skriva över cache)', () => {
  const odaterat = { name: 'Odaterat', eventType: 'event', start: null, end: null };
  assert.throws(() => valideraEvents([odaterat]), /datum/i);
});
