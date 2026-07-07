// Byggskript (PRD etapp 1): hämta → validera → berika → skriv docs/events-sv.json.
// Vid fel lämnas tidigare filer orörda och skriptet avslutas med felkod,
// så att sidan aldrig blir tom.

import { readFileSync, writeFileSync } from 'node:fs';
import { valideraEvents } from './lib/validera.js';
import { berikaEvents } from './lib/berika.js';

const EVENTS_URL =
  process.env.EVENTS_URL ||
  'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json';

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

  skrivJson('docs/events-sv.json', { uppdaterad: nu, events });
  console.log(`Klart: docs/events-sv.json med ${events.length} events.`);
}

main().catch((fel) => {
  console.error(`FEL: bygget avbröts, tidigare filer lämnas orörda. ${fel.message}`);
  process.exit(1);
});
