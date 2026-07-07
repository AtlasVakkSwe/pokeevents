// Renderar events-sv.json. All extern data sätts som text (textContent),
// aldrig som HTML — se PRD:s säkerhetskrav.

import { formatTidsspann, formatDatum, formatKlocka } from './lib/tid.js';
import { klassificera } from './lib/klassificera.js';

const MAX_POKEMON_I_LISTVY = 6;

const ETIKETTER = {
  galler: { text: 'Gäller i Sverige ✓', klass: 'etikett-galler' },
  'galler-inte': { text: 'Gäller inte här ✗', klass: 'etikett-galler-inte' },
  osakert: { text: 'Osäkert – kolla 🟡', klass: 'etikett-osakert' },
};

function el(tagg, klass, text) {
  const nod = document.createElement(tagg);
  if (klass) {
    nod.className = klass;
  }
  if (text !== undefined) {
    nod.textContent = text;
  }
  return nod;
}

function pokemonNod(p) {
  const li = el('li', 'pokemon');
  if (p.bild) {
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    // Trasig bildlänk: ta bort bilden, namnet står kvar.
    img.addEventListener('error', () => img.remove());
    img.src = p.bild;
    li.append(img);
  }
  if (p.shiny) {
    li.append(el('span', 'pokemon-shiny', '✨'));
  }
  li.append(el('span', 'pokemon-namn', p.namn));
  return li;
}

function pokemonRad(lista) {
  const ul = el('ul', 'pokemonrad');
  for (const p of lista) {
    ul.append(pokemonNod(p));
  }
  return ul;
}

function kortNod(event, nu) {
  const kort = el('article', 'kort');
  if (event.region === 'galler-inte') {
    kort.classList.add('kort-galler-inte');
  }

  if (event.image) {
    const bild = document.createElement('img');
    bild.className = 'kort-bild';
    bild.alt = '';
    bild.loading = 'lazy';
    bild.addEventListener('error', () => bild.remove());
    bild.src = event.image;
    kort.append(bild);
  }

  const kropp = el('div', 'kort-kropp');
  kropp.append(el('p', 'kort-typ', event.typRubrik));
  kropp.append(el('h3', 'kort-namn', event.name));
  kropp.append(el('p', 'kort-tid', '🕐 ' + formatTidsspann(event.startDate, event.endDate, nu)));

  const etikett = ETIKETTER[event.region] || ETIKETTER.osakert;
  kropp.append(el('span', `etikett ${etikett.klass}`, etikett.text));

  const synliga = event.pokemon.slice(0, MAX_POKEMON_I_LISTVY);
  const gomda = event.pokemon.slice(MAX_POKEMON_I_LISTVY);
  if (synliga.length > 0) {
    if (event.pokemonRubrik) {
      kropp.append(el('h4', 'pokemon-rubrik', event.pokemonRubrik));
    }
    kropp.append(pokemonRad(synliga));
  }

  const detaljer = el('div', 'kort-detaljer');
  detaljer.hidden = true;
  if (event.sammanfattning) {
    detaljer.append(el('p', 'kort-sammanfattning', event.sammanfattning));
  }
  if (event.bonusar.length > 0) {
    const ul = el('ul', 'bonuslista');
    for (const bonus of event.bonusar) {
      ul.append(el('li', null, bonus));
    }
    detaljer.append(ul);
  }
  if (gomda.length > 0) {
    detaljer.append(pokemonRad(gomda));
  }
  if (event.raids?.length > 0) {
    detaljer.append(el('h4', 'pokemon-rubrik', 'Raids under eventet:'));
    detaljer.append(pokemonRad(event.raids));
  }
  if (event.link) {
    const lank = el('a', 'kort-lank', 'Mer info (engelska) ↗');
    lank.href = event.link;
    lank.target = '_blank';
    lank.rel = 'noopener';
    detaljer.append(lank);
  }

  if (detaljer.childNodes.length > 0) {
    const knapp = el('button', 'visa-mer', 'Visa mer ▾');
    knapp.type = 'button';
    knapp.setAttribute('aria-expanded', 'false');
    knapp.addEventListener('click', () => {
      const oppen = detaljer.hidden;
      detaljer.hidden = !oppen;
      knapp.textContent = oppen ? 'Visa mindre ▴' : 'Visa mer ▾';
      knapp.setAttribute('aria-expanded', String(oppen));
    });
    kropp.append(knapp);
    kropp.append(detaljer);
  }

  kort.append(kropp);
  return kort;
}

function sektionNod(id, rubrik, events, nu, tomText) {
  const sektion = el('section', `sektion sektion-${id}`);
  const h2 = el('h2', 'sektion-rubrik');
  h2.append(el('span', 'sektion-prick'));
  h2.append(document.createTextNode(rubrik));
  sektion.append(h2);
  if (events.length === 0) {
    sektion.append(el('p', 'status-meddelande', tomText));
    return sektion;
  }
  for (const event of events) {
    sektion.append(kortNod(event, nu));
  }
  return sektion;
}

function visaUppdaterad(iso) {
  const nod = document.getElementById('uppdaterad');
  const datum = new Date(iso);
  if (Number.isNaN(datum.getTime())) {
    return;
  }
  const nu = new Date();
  nod.textContent = `Uppdaterad: ${formatDatum(datum, nu)} kl ${formatKlocka(datum)}`;
}

function raidSektionNod(grupper) {
  const sektion = el('section', 'sektion sektion-raids');
  const h2 = el('h2', 'sektion-rubrik');
  h2.append(el('span', 'sektion-prick'));
  h2.append(document.createTextNode('Raids just nu'));
  sektion.append(h2);

  const kort = el('article', 'kort');
  const kropp = el('div', 'kort-kropp');
  for (const grupp of grupper) {
    kropp.append(el('h3', 'raid-niva', grupp.rubrik));
    kropp.append(pokemonRad(grupp.pokemon));
  }
  kort.append(kropp);
  sektion.append(kort);
  return sektion;
}

// Raids är ett komplement — saknas filen visas sidan utan den sektionen.
async function hamtaRaids() {
  try {
    const svar = await fetch('raids-sv.json', { cache: 'no-cache' });
    if (!svar.ok) {
      return null;
    }
    const data = await svar.json();
    return Array.isArray(data.grupper) && data.grupper.length > 0 ? data.grupper : null;
  } catch {
    return null;
  }
}

async function start() {
  const innehall = document.getElementById('innehall');
  try {
    const [svar, raidGrupper] = await Promise.all([
      fetch('events-sv.json', { cache: 'no-cache' }),
      hamtaRaids(),
    ]);
    if (!svar.ok) {
      throw new Error(`HTTP ${svar.status}`);
    }
    const data = await svar.json();
    const nu = new Date();
    const { pagarNu, kommerSnart } = klassificera(data.events, nu);

    innehall.textContent = '';
    innehall.append(sektionNod('pagar', 'Pågår nu', pagarNu, nu, 'Inget event pågår just nu.'));
    if (raidGrupper) {
      innehall.append(raidSektionNod(raidGrupper));
    }
    innehall.append(
      sektionNod('kommer', 'Kommer snart', kommerSnart, nu, 'Inga fler events är planerade ännu.')
    );
    visaUppdaterad(data.uppdaterad);
  } catch (fel) {
    innehall.textContent = '';
    innehall.append(
      el('p', 'status-meddelande', 'Hoppsan! Det gick inte att ladda events. Testa igen om en stund.')
    );
    console.error(fel);
  }
}

start();
