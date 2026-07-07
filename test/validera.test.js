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

test('event utan obligatoriskt fält kastar fel', () => {
  for (const falt of ['name', 'eventType', 'start', 'end']) {
    const trasigt = [{ ...giltigt[0] }];
    delete trasigt[0][falt];
    assert.throws(() => valideraEvents(trasigt), new RegExp(falt));
  }
});
