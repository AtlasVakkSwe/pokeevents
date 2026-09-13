// Berikar rå ScrapedDuck-data till det format sidan visar:
// svensk rubrik, regionsstatus, sammanfattning, Pokémon-lista och bonusar.

import { skapaOversattare } from './oversatt.js';
import { klassaRegion } from './region.js';

// Typer vars mall säger något specifikt om just det eventet. Övriga typer får bara
// en standardtext, och loggas så att Toni kan skriva en riktig i data/beskrivningar.json.
const TYPER_MED_EGEN_MALL = new Set([
  'pokemon-spotlight-hour',
  'community-day',
  'raid-battles',
  'raid-hour',
  'raid-day',
  'max-mondays',
  'go-battle-league',
]);

function tillPokemon(lista) {
  return (lista || []).map((p) => ({
    namn: p.name,
    bild: p.image || '',
    shiny: Boolean(p.canBeShiny),
  }));
}

function pokemonForEvent(event) {
  const extra = event.extraData || {};
  switch (event.eventType) {
    case 'pokemon-spotlight-hour': {
      const s = extra.spotlight || {};
      return tillPokemon(s.list?.length ? s.list : s.name ? [s] : []);
    }
    case 'community-day':
      return tillPokemon(extra.communityday?.spawns);
    case 'raid-battles':
    case 'raid-day':
    case 'raid-hour':
      return tillPokemon(extra.raidbattles?.bosses);
    default:
      return [];
  }
}

export function berikaEvents(rawEvents, { ordlista, regioner, beskrivningar = {} }) {
  const oversattare = skapaOversattare(ordlista);
  const okandaRegioner = new Set();
  const saknarBeskrivning = [];

  const events = rawEvents.map((event) => {
    const region = klassaRegion(event, regioner);
    if (region.status === 'osakert') {
      okandaRegioner.add(region.term);
    }
    const bonusar = (event.extraData?.communityday?.bonuses || []).map((b) =>
      oversattare.bonus(b.text)
    );
    const beskrivning = beskrivningar[event.name];
    if (!beskrivning && !TYPER_MED_EGEN_MALL.has(event.eventType)) {
      saknarBeskrivning.push({ name: event.name, typ: event.eventType, start: event.start, end: event.end, link: event.link || '' });
    }
    return {
      id: event.eventID || event.name,
      name: event.name,
      namn: oversattare.lattlastNamn(event),
      typ: event.eventType,
      typRubrik: oversattare.eventtyp(event.eventType),
      link: event.link || '',
      image: event.image || '',
      start: event.start,
      end: event.end,
      region: region.status,
      sammanfattning: beskrivning || oversattare.sammanfattning(event),
      pokemon: pokemonForEvent(event),
      bonusar,
    };
  });

  return {
    events,
    okandaTermer: [...oversattare.okandaTermer(), ...okandaRegioner],
    saknarBeskrivning,
  };
}
