import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skapaOversattare } from '../scripts/lib/oversatt.js';

const ordlista = JSON.parse(readFileSync(new URL('../data/ordlista.json', import.meta.url), 'utf8'));

function nyOversattare() {
  return skapaOversattare(ordlista);
}

test('känd bonus översätts till svenska', () => {
  const o = nyOversattare();
  assert.equal(o.bonus('2× Catch XP'), 'Dubbel XP när du fångar');
});

// Testfall 7.2: bonus som saknas i ordlistan visas på engelska + loggas
test('okänd bonus visas oöversatt och loggas', () => {
  const o = nyOversattare();
  assert.equal(o.bonus('5x Mystery Bonus'), '5x Mystery Bonus');
  assert.ok(o.okandaTermer().includes('5x Mystery Bonus'));
});

test('bonus med asterisk på slutet hittas ändå i ordlistan', () => {
  const o = nyOversattare();
  assert.notEqual(o.bonus('1-hour Lures*'), '1-hour Lures*');
});

test('eventtyp översätts till svensk rubrik', () => {
  const o = nyOversattare();
  assert.equal(o.eventtyp('pokemon-spotlight-hour'), 'Rampljustimme');
  assert.equal(o.eventtyp('community-day'), 'Community Day');
});

test('okänd eventtyp faller tillbaka på oformaterad typ och loggas', () => {
  const o = nyOversattare();
  assert.equal(o.eventtyp('mystery-type'), 'mystery-type');
  assert.ok(o.okandaTermer().includes('mystery-type'));
});

// Testfall 7.1: komplett svensk sammanfattning för Spotlight Hour, max 2 meningar
test('spotlight hour får svensk sammanfattning med Pokémon-namn oöversatt', () => {
  const o = nyOversattare();
  const s = o.sammanfattning({
    eventType: 'pokemon-spotlight-hour',
    name: 'Zubat Spotlight Hour',
    extraData: { spotlight: { name: 'Zubat', canBeShiny: true, bonus: '2× Catch XP' } },
  });
  assert.ok(s.includes('Zubat'));
  assert.ok(s.includes('Dubbel XP när du fångar'));
  assert.ok((s.match(/[.!]/g) || []).length <= 3);
});

test('community day får svensk sammanfattning med spawn-Pokémon', () => {
  const o = nyOversattare();
  const s = o.sammanfattning({
    eventType: 'community-day',
    name: 'Nickit Community Day',
    extraData: { communityday: { spawns: [{ name: 'Nickit' }] } },
  });
  assert.ok(s.includes('Nickit'));
});

test('raidevent får sammanfattning med bossnamn', () => {
  const o = nyOversattare();
  const s = o.sammanfattning({
    eventType: 'raid-battles',
    name: 'Mega Lucario in Mega Raids',
    extraData: { raidbattles: { bosses: [{ name: 'Mega Lucario', canBeShiny: true }] } },
  });
  assert.ok(s.includes('Mega Lucario'));
});

test('raid-hour och raid-day har mallar även utan strukturerad data', () => {
  const o = nyOversattare();
  assert.ok(o.sammanfattning({ eventType: 'raid-hour', name: 'X', extraData: {} }).length > 0);
  assert.ok(o.sammanfattning({ eventType: 'raid-day', name: 'X', extraData: {} }).length > 0);
});

test('eventtyp utan mall ger null (ingen gissad text)', () => {
  const o = nyOversattare();
  assert.equal(o.sammanfattning({ eventType: 'twitch-drops', name: 'X', extraData: {} }), null);
});
