// Extraherar Pokémon-listor ur LeekDucks eventsidor (PRD v1.1–1.2).
// Sidorna grupperar innehåll under <h2 class="event-section-header X">-rubriker;
// vi läser en namngiven sektion i taget så att spawns, raidbossar och ägg
// aldrig blandas ihop.

const ENTITETER = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

function avkoda(text) {
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => ENTITETER[m]).trim();
}

function extraheraSektion(html, sektionsklass) {
  const start = html.indexOf(`event-section-header ${sektionsklass}`);
  if (start === -1) {
    return [];
  }
  let slut = html.indexOf('event-section-header', start + 30);
  if (slut === -1) {
    slut = html.length;
  }
  const sektion = html.slice(start, slut);

  const pokemon = new Map();
  for (const [item] of sektion.matchAll(/<li class="pkmn-list-item".*?<\/li>/gs)) {
    const namnTraff = item.match(/class="pkmn-name">([^<]+)</);
    const bildTraff = item.match(/<img src="(https:\/\/cdn\.leekduck\.com\/[^"]+)"/);
    if (!namnTraff || !bildTraff) {
      continue;
    }
    const namn = avkoda(namnTraff[1]);
    if (!pokemon.has(namn)) {
      pokemon.set(namn, {
        namn,
        bild: bildTraff[1],
        shiny: item.includes('shiny-icon'),
      });
    }
  }
  return [...pokemon.values()];
}

export function extraheraSpawns(html) {
  return extraheraSektion(html, 'spawns');
}

export function extraheraEventRaids(html) {
  return extraheraSektion(html, 'raids');
}
