import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { berikaRaids } from '../scripts/lib/berikaRaids.js';
import { valideraRaids } from '../scripts/lib/validera.js';

const ordlista = JSON.parse(readFileSync(new URL('../data/ordlista.json', import.meta.url), 'utf8'));

const exempel = [
  { name: 'Machop', tier: '1-Star Raids', canBeShiny: true, image: 'https://cdn.leekduck.com/machop.png' },
  { name: 'Kyurem (White)', tier: '5-Star Raids', canBeShiny: true, image: 'https://cdn.leekduck.com/kyurem.png' },
  { name: 'Mega Tyranitar', tier: 'Mega Raids', canBeShiny: false, image: 'https://cdn.leekduck.com/ttar.png' },
  { name: 'Breloom', tier: '3-Star Raids', canBeShiny: false, image: 'https://cdn.leekduck.com/breloom.png' },
];

test('raids grupperas per nivå med svensk rubrik, svåraste först', () => {
  const { grupper } = berikaRaids(exempel, { ordlista });
  assert.deepEqual(grupper.map((g) => g.rubrik), ['5 stjärnor', 'Mega', '3 stjärnor', '1 stjärna']);
});

test('varje boss får namn, bild och shiny-flagga', () => {
  const { grupper } = berikaRaids(exempel, { ordlista });
  const femma = grupper[0].pokemon[0];
  assert.deepEqual(femma, { namn: 'Kyurem (White)', bild: 'https://cdn.leekduck.com/kyurem.png', shiny: true });
});

test('okänd nivå visas oöversatt sist och loggas', () => {
  const konstig = [...exempel, { name: 'X', tier: 'Shadow Raids', canBeShiny: false, image: '' }];
  const { grupper, okandaTermer } = berikaRaids(konstig, { ordlista });
  assert.equal(grupper.at(-1).rubrik, 'Shadow Raids');
  assert.ok(okandaTermer.includes('Shadow Raids'));
});

test('valideraRaids kräver icke-tom array med name och tier', () => {
  assert.deepEqual(valideraRaids(exempel), exempel);
  assert.throws(() => valideraRaids({}), /array/i);
  assert.throws(() => valideraRaids([]), /tom/i);
  assert.throws(() => valideraRaids([{ name: 'X' }]), /tier/);
});
