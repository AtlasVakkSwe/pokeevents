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

// Lättlästa namn (spec: specs/2026-09-13-lattlast-kalender-design.md, punkt 1)
function namn(name, eventType) {
  return nyOversattare().lattlastNamn({ name, eventType });
}

test('raidrotation: "X in 5-star Raid Battles" blir "X i 5-stjärniga raider"', () => {
  assert.equal(namn('Xerneas in 5-star Raid Battles', 'raid-battles'), 'Xerneas i 5-stjärniga raider');
});

test('formnamn i parentes klipps ur radnamnet', () => {
  assert.equal(namn('Zacian (Hero of Many Battles) in 5-star Raid Battles', 'raid-battles'), 'Zacian i 5-stjärniga raider');
});

test('Mega- och Shadow-raider', () => {
  assert.equal(namn('Mega Beedrill in Mega Raids', 'raid-battles'), 'Mega Beedrill i Mega-raider');
  assert.equal(namn('Shadow Thundurus (Incarnate Forme) in Shadow Raids', 'raid-battles'), 'Shadow Thundurus i Shadow-raider');
});

test('"and" i uppräkning blir "och"', () => {
  assert.equal(
    namn('Xurkitree, Pheromosa, and Buzzwole in 5-star Raid Battles', 'raid-battles'),
    'Xurkitree, Pheromosa och Buzzwole i 5-stjärniga raider'
  );
});

test('okänd raidnivå lämnar namnet orört (utom klipp) och loggas', () => {
  const o = nyOversattare();
  assert.equal(o.lattlastNamn({ name: 'Groudon in Primal Raids', eventType: 'raid-battles' }), 'Groudon in Primal Raids');
  assert.ok(o.okandaTermer().includes('Primal Raids'));
});

test('rampljustimme sätter typen först', () => {
  assert.equal(namn('Houndour and Houndoom Spotlight Hour', 'pokemon-spotlight-hour'), 'Rampljustimme: Houndour och Houndoom');
  assert.equal(namn('Mystery Pokémon Spotlight Hour', 'pokemon-spotlight-hour'), 'Rampljustimme: Hemlig Pokémon');
});

test('raidtimme, raiddag och Max-stridsdag', () => {
  assert.equal(namn('Zamazenta (Hero of Many Battles) Raid Hour', 'raid-hour'), 'Raidtimme: Zamazenta');
  assert.equal(namn('Staraptor Super Mega Raid Day', 'raid-day'), 'Raiddag: Staraptor');
  assert.equal(namn('Super Mega Raid Day', 'raid-day'), 'Raiddag');
  assert.equal(namn('Gigantamax Cinderace Max Battle Day', 'max-battles'), 'Max-stridsdag: Gigantamax Cinderace');
  assert.equal(namn('Max Battle Day', 'max-battles'), 'Max-stridsdag');
});

test('Max-måndag', () => {
  assert.equal(namn('Dynamax Rhyhorn during Max Monday', 'max-mondays'), 'Max-måndag: Rhyhorn');
});

test('Community Day med månad eller Pokémon', () => {
  assert.equal(namn('October Community Day', 'community-day'), 'Community Day i oktober');
  assert.equal(namn('Nickit Community Day', 'community-day'), 'Community Day: Nickit');
});

test('suffix efter " | " klipps även för typer utan mönster', () => {
  assert.equal(namn('Great League and Little Cup | Twilight Trails', 'go-battle-league'), 'Great League and Little Cup');
  assert.equal(namn('Harvest Festival 2026: Applin Picking', 'event'), 'Harvest Festival 2026: Applin Picking');
});
