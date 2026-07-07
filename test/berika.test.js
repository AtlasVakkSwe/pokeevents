import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { berikaEvents } from '../scripts/lib/berika.js';

const ordlista = JSON.parse(readFileSync(new URL('../data/ordlista.json', import.meta.url), 'utf8'));
const regioner = JSON.parse(readFileSync(new URL('../data/regioner.json', import.meta.url), 'utf8'));

const spotlight = {
  eventID: 'spot-1',
  name: 'Zubat Spotlight Hour',
  eventType: 'pokemon-spotlight-hour',
  heading: 'Pokémon Spotlight Hour',
  link: 'https://leekduck.com/events/spot-1/',
  image: 'https://cdn.leekduck.com/assets/img/events/pokemonspotlighthour.jpg',
  start: '2026-07-16T18:00:00.000',
  end: '2026-07-16T19:00:00.000',
  extraData: {
    spotlight: {
      name: 'Zubat',
      canBeShiny: true,
      image: 'https://cdn.leekduck.com/assets/img/pokemon_icons/pokemon_icon_041_00.png',
      bonus: '2× Catch XP',
      list: [{ name: 'Zubat', canBeShiny: true, image: 'https://cdn.leekduck.com/zubat.png' }],
    },
  },
};

const raid = {
  eventID: 'raid-1',
  name: 'Mega Lucario in Mega Raids',
  eventType: 'raid-battles',
  heading: 'Raid Battles',
  link: 'https://leekduck.com/events/raid-1/',
  image: 'https://cdn.leekduck.com/assets/img/events/mega-default.jpg',
  start: '2026-07-13T06:00:00.000',
  end: '2026-07-14T22:00:00.000',
  extraData: {
    raidbattles: {
      bosses: [{ name: 'Mega Lucario', image: 'https://cdn.leekduck.com/lucario.png', canBeShiny: true }],
    },
  },
};

const generiskt = {
  eventID: 'gbl-1',
  name: 'Battle Weekend',
  eventType: 'go-battle-league',
  heading: 'GO Battle League',
  link: 'https://leekduck.com/events/gbl-1/',
  image: 'https://cdn.leekduck.com/gbl.jpg',
  start: '2026-07-10T00:00:00.000Z',
  end: '2026-07-12T00:00:00.000Z',
  extraData: {},
};

test('berikat event behåller originalfält och får svensk rubrik, region och sammanfattning', () => {
  const { events } = berikaEvents([spotlight], { ordlista, regioner });
  const e = events[0];
  assert.equal(e.name, 'Zubat Spotlight Hour');
  assert.equal(e.start, '2026-07-16T18:00:00.000');
  assert.equal(e.typRubrik, 'Rampljustimme');
  assert.equal(e.region, 'galler');
  assert.ok(e.sammanfattning.includes('Zubat'));
});

test('spotlight får pokemonlista med shiny-flagga', () => {
  const { events } = berikaEvents([spotlight], { ordlista, regioner });
  assert.deepEqual(events[0].pokemon, [
    { namn: 'Zubat', bild: 'https://cdn.leekduck.com/zubat.png', shiny: true },
  ]);
});

test('raidevent får bossar som pokemonlista', () => {
  const { events } = berikaEvents([raid], { ordlista, regioner });
  assert.equal(events[0].pokemon[0].namn, 'Mega Lucario');
  assert.equal(events[0].pokemon[0].shiny, true);
});

test('event utan strukturerad data får tom pokemonlista, inte fel', () => {
  const { events } = berikaEvents([generiskt], { ordlista, regioner });
  assert.deepEqual(events[0].pokemon, []);
});

test('community day får översatta bonusar', () => {
  const cd = {
    ...generiskt,
    eventID: 'cd-1',
    name: 'Nickit Community Day',
    eventType: 'community-day',
    extraData: {
      communityday: {
        spawns: [{ name: 'Nickit', image: 'https://cdn.leekduck.com/nickit.png' }],
        bonuses: [{ text: '3x Catch Stardust', image: '' }, { text: '1-hour Lures*', image: '' }],
      },
    },
  };
  const { events } = berikaEvents([cd], { ordlista, regioner });
  assert.ok(events[0].bonusar.includes('Trippelt stjärnstoft när du fångar'));
  assert.ok(events[0].bonusar.includes('Lockmoduler räcker i 1 timme'));
});

test('okända termer samlas ihop för loggning', () => {
  const konstig = {
    ...generiskt,
    eventID: 'k-1',
    eventType: 'pokemon-spotlight-hour',
    extraData: { spotlight: { name: 'Zubat', canBeShiny: false, bonus: 'Weird New Bonus' } },
  };
  const { okandaTermer } = berikaEvents([konstig], { ordlista, regioner });
  assert.ok(okandaTermer.includes('Weird New Bonus'));
});
