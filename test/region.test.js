import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { klassaRegion } from '../scripts/lib/region.js';

const regioner = JSON.parse(readFileSync(new URL('../data/regioner.json', import.meta.url), 'utf8'));

function ev(name, heading = 'Event') {
  return { name, heading };
}

// Testfall 5.1: vanligt globalt event → grön etikett
test('vanligt event utan regionstermer gäller i Sverige', () => {
  const r = klassaRegion(ev('Zubat Spotlight Hour', 'Pokémon Spotlight Hour'), regioner);
  assert.equal(r.status, 'galler');
});

test('event med term som täcker Sverige gäller i Sverige', () => {
  const r = klassaRegion(ev('GO Fest Global', 'Pokémon GO Fest'), regioner);
  assert.equal(r.status, 'galler');
});

// Testfall 5.2: "GO Fest Osaka" → gäller inte här
test('event med stad utanför Sverige gäller inte här', () => {
  const r = klassaRegion(ev('GO Fest Osaka', 'Pokémon GO Fest'), regioner);
  assert.equal(r.status, 'galler-inte');
});

test('event med region som utesluter Sverige gäller inte här', () => {
  const r = klassaRegion(ev('Special Event (Asia-Pacific)', 'Event'), regioner);
  assert.equal(r.status, 'galler-inte');
});

// Testfall 5.3: regionssignal med okänd term → osäkert, aldrig gissa grönt
test('regionsbegränsat event med okänd plats blir "osäkert" med loggterm', () => {
  const r = klassaRegion(ev('GO Fest Zone X', 'Pokémon GO Fest'), regioner);
  assert.equal(r.status, 'osakert');
  assert.ok(r.term.includes('Zone X'));
});

test('Europa-event gäller i Sverige', () => {
  const r = klassaRegion(ev('Raid Weekend (Europe)', 'Raid Battles'), regioner);
  assert.equal(r.status, 'galler');
});
