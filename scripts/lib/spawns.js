// Extraherar vilda Pokémon ur LeekDucks eventsidor (version 1.1 i PRD:n).
// Sidorna grupperar innehåll under <h2 class="event-section-header X">-rubriker;
// vi läser enbart spawns-sektionen så att raidbossar, ägg m.m. inte följer med.

const ENTITETER = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

function avkoda(text) {
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => ENTITETER[m]).trim();
}

export function extraheraSpawns(html) {
  const start = html.indexOf('event-section-header spawns');
  if (start === -1) {
    return [];
  }
  let slut = html.indexOf('event-section-header', start + 30);
  if (slut === -1) {
    slut = html.length;
  }
  const sektion = html.slice(start, slut);

  const spawns = new Map();
  for (const [item] of sektion.matchAll(/<li class="pkmn-list-item".*?<\/li>/gs)) {
    const namnTraff = item.match(/class="pkmn-name">([^<]+)</);
    const bildTraff = item.match(/<img src="(https:\/\/cdn\.leekduck\.com\/[^"]+)"/);
    if (!namnTraff || !bildTraff) {
      continue;
    }
    const namn = avkoda(namnTraff[1]);
    if (!spawns.has(namn)) {
      spawns.set(namn, {
        namn,
        bild: bildTraff[1],
        shiny: item.includes('shiny-icon'),
      });
    }
  }
  return [...spawns.values()];
}
