// Byggskript (PRD etapp 1): hämta → validera → berika → skriv docs/events-sv.json.
// Vid fel lämnas tidigare filer orörda och skriptet avslutas med felkod,
// så att sidan aldrig blir tom.

import { readFileSync, writeFileSync } from 'node:fs';
import { valideraEvents, valideraRaids } from './lib/validera.js';
import { berikaEvents } from './lib/berika.js';
import { berikaRaids } from './lib/berikaRaids.js';
import { extraheraSpawns, extraheraEventRaids } from './lib/spawns.js';

const EVENTS_URL =
  process.env.EVENTS_URL ||
  'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json';
const RAIDS_URL =
  process.env.RAIDS_URL ||
  'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json';

const ROT = new URL('..', import.meta.url);

function lasJson(relativSokvag) {
  return JSON.parse(readFileSync(new URL(relativSokvag, ROT), 'utf8'));
}

function skrivJson(relativSokvag, data) {
  writeFileSync(new URL(relativSokvag, ROT), JSON.stringify(data, null, 2) + '\n');
}

async function main() {
  console.log(`Hämtar ${EVENTS_URL} ...`);
  const svar = await fetch(EVENTS_URL);
  if (!svar.ok) {
    throw new Error(`Hämtningen misslyckades: HTTP ${svar.status}`);
  }
  const rawEvents = valideraEvents(await svar.json());
  console.log(`OK: ${rawEvents.length} events hämtade och validerade.`);

  const nu = new Date().toISOString();
  skrivJson('data/events-raw.json', { hamtad: nu, events: rawEvents });

  const ordlista = lasJson('data/ordlista.json');
  const regioner = lasJson('data/regioner.json');
  const { events, okandaTermer } = berikaEvents(rawEvents, { ordlista, regioner });

  if (okandaTermer.length > 0) {
    console.log('Okända termer (komplettera data/ordlista.json eller data/regioner.json):');
    for (const term of okandaTermer) {
      console.log(`  - ${term}`);
    }
    skrivJson('data/okanda-termer.json', { uppdaterad: nu, termer: okandaTermer });
  }

  // Spawn-listor (PRD version 1.1): för events som har vilda spawns men saknar
  // strukturerad Pokémon-data hämtas eventsidans spawns-sektion från LeekDuck.
  // Fel på en enskild sida är inte fatalt — kortet visas då utan lista.
  for (let i = 0; i < rawEvents.length; i++) {
    const raw = rawEvents[i];
    const event = events[i];
    if (event.pokemon.length > 0 || !raw.extraData?.generic?.hasSpawns || !raw.link) {
      continue;
    }
    try {
      const sida = await fetch(raw.link);
      if (!sida.ok) {
        throw new Error(`HTTP ${sida.status}`);
      }
      const sidHtml = await sida.text();
      const spawns = extraheraSpawns(sidHtml);
      if (spawns.length > 0) {
        event.pokemon = spawns;
        event.pokemonRubrik = 'Finns att fånga:';
        console.log(`Spawns: ${spawns.length} Pokémon för "${raw.name}".`);
      }
      const eventRaids = extraheraEventRaids(sidHtml);
      if (eventRaids.length > 0) {
        event.raids = eventRaids;
        console.log(`Raids: ${eventRaids.length} bossar för "${raw.name}".`);
      }
    } catch (fel) {
      console.error(`VARNING: kunde inte hämta spawns för "${raw.name}": ${fel.message}`);
    }
  }

  skrivJson('docs/events-sv.json', { uppdaterad: nu, events });
  console.log(`Klart: docs/events-sv.json med ${events.length} events.`);

  // Raids är ett komplement — misslyckas hämtningen behålls förra versionen
  // och eventbygget räknas ändå som lyckat.
  try {
    const raidSvar = await fetch(RAIDS_URL);
    if (!raidSvar.ok) {
      throw new Error(`HTTP ${raidSvar.status}`);
    }
    const raids = valideraRaids(await raidSvar.json());
    const { grupper, okandaTermer: okandaNivaer } = berikaRaids(raids, { ordlista });
    for (const niva of okandaNivaer) {
      console.log(`Okänd raidnivå (komplettera raidNivaer i data/ordlista.json): ${niva}`);
    }
    skrivJson('docs/raids-sv.json', { uppdaterad: nu, grupper });
    console.log(`Klart: docs/raids-sv.json med ${raids.length} bossar.`);
  } catch (fel) {
    console.error(`VARNING: raids kunde inte uppdateras, förra versionen behålls. ${fel.message}`);
  }
}

main().catch((fel) => {
  console.error(`FEL: bygget avbröts, tidigare filer lämnas orörda. ${fel.message}`);
  process.exit(1);
});
