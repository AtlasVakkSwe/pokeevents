import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extraheraSpawns, extraheraEventRaids } from '../scripts/lib/spawns.js';

const gofest = readFileSync(new URL('fixtures/gofest.html', import.meta.url), 'utf8');
const pikachu = readFileSync(new URL('fixtures/pikachu.html', import.meta.url), 'utf8');
const road = readFileSync(new URL('fixtures/road.html', import.meta.url), 'utf8');

test('extraherar alla Pokémon ur spawns-sektionen med namn, bild och shiny', () => {
  const spawns = extraheraSpawns(gofest);
  assert.equal(spawns.length, 8);
  assert.ok(spawns.some((p) => p.namn === 'Bulbasaur'));
  for (const p of spawns) {
    assert.ok(p.namn.length > 0);
    assert.ok(p.bild.startsWith('https://cdn.leekduck.com/'));
    assert.equal(typeof p.shiny, 'boolean');
  }
});

test('shiny-flaggan sätts från shiny-ikonen', () => {
  const spawns = extraheraSpawns(gofest);
  assert.ok(spawns.every((p) => p.shiny === true));
});

test('HTML-entiteter i namn avkodas', () => {
  const spawns = extraheraSpawns(pikachu);
  assert.equal(spawns[0].namn, 'Pikachu wearing a Tricks & Treats costume');
  assert.equal(spawns.length, 3);
});

test('sida utan spawns-sektion ger tom lista', () => {
  assert.deepEqual(extraheraSpawns(road), []);
});

test('Pokémon utanför spawns-sektionen (raids, ägg) tas inte med', () => {
  // road.html har raids- och eggs-sektioner med pkmn-list-items men ingen spawns-sektion
  assert.ok(road.includes('pkmn-list-item'));
  assert.deepEqual(extraheraSpawns(road), []);
});

test('dubbletter av samma Pokémon slås ihop', () => {
  const dubblett = gofest.replace(
    'class="event-section-header spawns">',
    'class="event-section-header spawns">'
  );
  const spawns = extraheraSpawns(dubblett + '');
  const namn = spawns.map((p) => p.namn);
  assert.equal(namn.length, new Set(namn).size);
});

test('trasig eller tom HTML ger tom lista, inget fel', () => {
  assert.deepEqual(extraheraSpawns(''), []);
  assert.deepEqual(extraheraSpawns('<html>trasigt'), []);
});

test('extraherar raidbossar ur raids-sektionen, höjdpunkter först', () => {
  const raids = extraheraEventRaids(gofest);
  assert.equal(raids.length, 94);
  assert.equal(raids[0].namn, 'Mega Mewtwo X');
  assert.equal(raids[1].namn, 'Mega Mewtwo Y');
  for (const p of raids) {
    assert.ok(p.bild.startsWith('https://cdn.leekduck.com/'));
    assert.equal(typeof p.shiny, 'boolean');
  }
});

test('raids- och spawns-sektionerna blandas inte ihop', () => {
  const spawns = extraheraSpawns(gofest);
  assert.ok(!spawns.some((p) => p.namn.includes('Mewtwo')));
  const raids = extraheraEventRaids(gofest);
  assert.ok(!raids.some((p) => p.namn === 'Bulbasaur'));
});

test('pikachu-eventets raids-sektion ger de utklädda bossarna', () => {
  const raids = extraheraEventRaids(pikachu);
  assert.equal(raids.length, 9);
  assert.equal(raids[0].namn, 'Dapper Pikachu with red accents');
});

test('sida utan raids-sektion ger tom raidlista', () => {
  assert.deepEqual(extraheraEventRaids(''), []);
  assert.deepEqual(extraheraEventRaids('<html><h2 class="event-section-header spawns"></h2>'), []);
});
