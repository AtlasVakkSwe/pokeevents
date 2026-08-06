// Kalendervy v2.0 (spec: specs/2026-07-08-kalendervy-design.md).
// All extern data sätts som text (textContent), aldrig som HTML.

import { formatTidsspann, formatDagRubrik, formatChip, formatKlocka, formatDatum, arHelg, formatNedrakning, dagNyckel } from './lib/tid.js';
import { grupperaKalender } from './lib/kalender.js';

const POKEMONBILD_TYPER = new Set([
  'pokemon-spotlight-hour',
  'raid-battles',
  'raid-day',
  'raid-hour',
  'community-day',
]);

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

function bildNod(url, klass) {
  const img = document.createElement('img');
  img.className = klass;
  img.alt = '';
  img.loading = 'lazy';
  img.addEventListener('error', () => img.remove());
  img.src = url;
  return img;
}

/* ---------- Pokémon-rad (används i sheet och NU-panel) ---------- */

function pokemonNod(p) {
  const li = el('li', 'pokemon');
  if (p.bild) {
    li.append(bildNod(p.bild, ''));
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

function miniPokemonRad(lista, max) {
  const rad = el('div', 'mini-pokemonrad');
  for (const p of lista.slice(0, max)) {
    if (p.bild) {
      rad.append(bildNod(p.bild, 'mini-poke'));
    }
  }
  if (lista.length > max) {
    rad.append(el('span', 'mini-fler', `+${lista.length - max}`));
  }
  return rad;
}

/* ---------- Tickande nedräkningar ---------- */

const TICK_MS = 30 * 1000;
const OMRITNING_MS = 5 * 60 * 1000;

// Sidans egna nedräkningar töms vid varje omritning; sheetens hålls separat
// och töms när sheeten stängs, annars växer registret för varje öppnat event.
const tickare = [];
const sheetTickare = [];
let tickTimer = null;
let senasteRendering = 0;
let renderadDag = null;

function registrera(register, nod, textFn) {
  register.push({ nod, textFn });
  return nod;
}

function tick() {
  const nu = new Date();
  if (renderadDag !== null && dagNyckel(nu) !== renderadDag) {
    ritaOm();
    return;
  }
  for (const post of tickare) {
    post.nod.textContent = post.textFn(nu);
  }
  for (const post of sheetTickare) {
    post.nod.textContent = post.textFn(nu);
  }
}

function startaTick() {
  if (tickTimer === null) {
    tickTimer = setInterval(tick, TICK_MS);
  }
}

function stoppaTick() {
  if (tickTimer !== null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

/* ---------- Bottom sheet ---------- */

let sheetOppen = false;

const backdrop = el('div', 'backdrop');
backdrop.hidden = true;
const sheet = el('div', 'sheet');
sheet.hidden = true;
sheet.setAttribute('role', 'dialog');
sheet.setAttribute('aria-modal', 'true');

function stangSheet() {
  if (!sheetOppen) {
    return;
  }
  sheetOppen = false;
  sheetTickare.length = 0;
  sheet.hidden = true;
  backdrop.hidden = true;
  document.body.style.overflow = '';
}

function oppnaSheet(noder) {
  sheet.textContent = '';
  const stang = el('button', 'sheet-stang', '✕');
  stang.type = 'button';
  stang.setAttribute('aria-label', 'Stäng');
  stang.addEventListener('click', () => history.back());
  sheet.append(stang, ...noder);
  sheet.hidden = false;
  backdrop.hidden = false;
  sheet.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  sheetOppen = true;
  history.pushState({ sheet: true }, '');
}

backdrop.addEventListener('click', () => history.back());
window.addEventListener('popstate', stangSheet);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sheetOppen) {
    history.back();
  }
});

function eventSheet(event, nu) {
  const noder = [];
  if (event.image) {
    noder.push(bildNod(event.image, 'sheet-bild'));
  }
  noder.push(el('p', 'sheet-typ', event.typRubrik));
  noder.push(el('h2', 'sheet-namn', event.name));
  const sheetTid = el('p', 'sheet-tid', '🕐 ' + formatTidsspann(event.startDate, event.endDate, nu) + ' · ');
  sheetTid.append(
    registrera(
      sheetTickare,
      el('span', 'rad-nedrakning', formatNedrakning(event.startDate, event.endDate, nu)),
      (n) => formatNedrakning(event.startDate, event.endDate, n)
    )
  );
  noder.push(sheetTid);
  const etikett = ETIKETTER[event.region] || ETIKETTER.osakert;
  noder.push(el('span', `etikett ${etikett.klass}`, etikett.text));
  if (event.sammanfattning) {
    noder.push(el('p', 'sheet-text', event.sammanfattning));
  }
  if (event.pokemon.length > 0) {
    noder.push(el('h3', 'sheet-rubrik', event.pokemonRubrik || 'Pokémon:'));
    noder.push(pokemonRad(event.pokemon));
  }
  if (event.bonusar.length > 0) {
    noder.push(el('h3', 'sheet-rubrik', 'Bonusar:'));
    const ul = el('ul', 'bonuslista');
    for (const bonus of event.bonusar) {
      ul.append(el('li', null, bonus));
    }
    noder.push(ul);
  }
  if (event.raids?.length > 0) {
    noder.push(el('h3', 'sheet-rubrik', 'Raids under eventet:'));
    noder.push(pokemonRad(event.raids));
  }
  if (event.link) {
    const lank = el('a', 'sheet-lank', 'Mer info (engelska) ↗');
    lank.href = event.link;
    lank.target = '_blank';
    lank.rel = 'noopener';
    noder.push(lank);
  }
  oppnaSheet(noder);
}

function raidSheet(grupper) {
  const noder = [el('h2', 'sheet-namn', 'Raids just nu')];
  for (const grupp of grupper) {
    noder.push(el('h3', 'sheet-rubrik', grupp.rubrik));
    noder.push(pokemonRad(grupp.pokemon));
  }
  oppnaSheet(noder);
}

/* ---------- Kalenderrader ---------- */

/* ---------- Tidsrad: klockslag · nedräkning ---------- */

// nedrakningFn tar ett nu och returnerar texten, så Task 4 kan uppdatera
// enbart nedräkningsnoden utan att röra klockslaget.
function tidsrad(klockText, nedrakningFn, nu, gron) {
  const nod = el('span', gron ? 'rad-tid rad-tid-gron' : 'rad-tid');
  nod.append(el('span', 'rad-klocka', `${klockText} · `));
  nod.append(registrera(tickare, el('span', 'rad-nedrakning', nedrakningFn(nu)), nedrakningFn));
  return nod;
}

function radBild(event) {
  if (POKEMONBILD_TYPER.has(event.typ) && event.pokemon[0]?.bild) {
    return { url: event.pokemon[0].bild, rund: true };
  }
  return event.image ? { url: event.image, rund: false } : null;
}

function rad(event, dagDatum, nu, pagar) {
  const knapp = el('button', 'rad');
  knapp.type = 'button';
  if (event.region === 'galler-inte') {
    knapp.classList.add('rad-dampad');
  }
  const bild = radBild(event);
  if (bild) {
    knapp.append(bildNod(bild.url, bild.rund ? 'rad-bild rad-bild-rund' : 'rad-bild'));
  }
  let namn = event.name;
  if (event.region === 'galler-inte') {
    namn += ' ✗';
  } else if (event.region === 'osakert') {
    namn += ' 🟡';
  }
  const textkolumn = el('span', 'rad-text');
  textkolumn.append(el('span', 'rad-namn', namn));
  textkolumn.append(
    tidsrad(
      formatChip(event.startDate, event.endDate, dagDatum),
      (n) => formatNedrakning(event.startDate, event.endDate, n),
      nu,
      pagar
    )
  );
  knapp.append(textkolumn);
  knapp.append(el('span', 'rad-pil', '›'));
  knapp.addEventListener('click', () => eventSheet(event, nu));
  return knapp;
}

function raidRad(grupper) {
  const alla = grupper.flatMap((g) => g.pokemon);
  const knapp = el('button', 'rad');
  knapp.type = 'button';
  if (alla[0]?.bild) {
    knapp.append(bildNod(alla[0].bild, 'rad-bild rad-bild-rund'));
  }
  const textkolumn = el('span', 'rad-text');
  textkolumn.append(el('span', 'rad-namn', `Raider idag: ${alla[0]?.namn ?? ''} +${Math.max(alla.length - 1, 0)}`));
  const tid = el('span', 'rad-tid rad-tid-gron');
  tid.append(el('span', 'rad-klocka', 'hela dagen'));
  textkolumn.append(tid);
  knapp.append(textkolumn);
  knapp.append(el('span', 'rad-pil', '›'));
  knapp.addEventListener('click', () => raidSheet(grupper));
  return knapp;
}

/* ---------- NU-panel ---------- */

function nuPanelNod(event, nu) {
  const panel = el('button', 'nu-panel');
  panel.type = 'button';
  panel.append(el('span', 'nu-etikett', 'NU'));
  panel.append(el('span', 'nu-namn', event.name));
  panel.append(
    tidsrad(
      formatChip(event.startDate, event.endDate, nu),
      (n) => formatNedrakning(event.startDate, event.endDate, n),
      nu,
      true
    )
  );
  if (event.pokemon.length > 0) {
    panel.append(miniPokemonRad(event.pokemon, 4));
  }
  panel.addEventListener('click', () => eventSheet(event, nu));
  return panel;
}

/* ---------- Pågår hela tiden ---------- */

function stripNod(events, nu) {
  const strip = el('section', 'strip');
  const knapp = el('button', 'strip-knapp');
  knapp.type = 'button';
  knapp.setAttribute('aria-expanded', 'false');
  knapp.textContent = `🔁 Pågår hela tiden (${events.length}) ▾`;
  const lista = el('div', 'strip-lista');
  lista.hidden = true;
  for (const event of events) {
    lista.append(rad(event, nu, nu, true));
  }
  knapp.addEventListener('click', () => {
    const oppen = lista.hidden;
    lista.hidden = !oppen;
    knapp.setAttribute('aria-expanded', String(oppen));
    knapp.textContent = `🔁 Pågår hela tiden (${events.length}) ${oppen ? '▴' : '▾'}`;
  });
  strip.append(knapp, lista);
  return strip;
}

/* ---------- Sidan ---------- */

function visaUppdaterad(iso) {
  const nod = document.getElementById('uppdaterad');
  const datum = new Date(iso);
  if (Number.isNaN(datum.getTime())) {
    return;
  }
  nod.textContent = `Uppdaterad: ${formatDatum(datum, new Date())} kl ${formatKlocka(datum)}`;
}

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
    tickare.length = 0;
    senasteRendering = Date.now();
    renderadDag = dagNyckel(nu);
    const { nuPanel, dagar, alltidPagaende } = grupperaKalender(data.events, nu);

    innehall.textContent = '';

    for (const event of nuPanel) {
      innehall.append(nuPanelNod(event, nu));
    }

    for (const dag of dagar) {
      const arIdag = dag === dagar[0];
      if (!arIdag && dag.events.length === 0) {
        continue;
      }
      const rubrik = el('h2', 'dag-rubrik');
      if (arIdag) {
        rubrik.classList.add('dag-idag');
      } else if (arHelg(dag.datum)) {
        rubrik.classList.add('dag-helg');
      }
      rubrik.textContent = formatDagRubrik(dag.datum, nu) + (arHelg(dag.datum) ? ' 🎉' : '');
      innehall.append(rubrik);

      if (arIdag && raidGrupper) {
        innehall.append(raidRad(raidGrupper));
      }
      for (const event of dag.events) {
        const pagar = event.startDate.getTime() <= nu.getTime();
        innehall.append(rad(event, dag.datum, nu, pagar));
      }
      if (arIdag && dag.events.length === 0 && !raidGrupper && nuPanel.length === 0) {
        innehall.append(el('p', 'status-meddelande', 'Inget särskilt idag.'));
      }
    }

    if (alltidPagaende.length > 0) {
      innehall.append(stripNod(alltidPagaende, nu));
    }

    document.body.append(backdrop, sheet);
    startaTick();
    visaUppdaterad(data.uppdaterad);
  } catch (fel) {
    innehall.textContent = '';
    innehall.append(
      el('p', 'status-meddelande', 'Hoppsan! Det gick inte att ladda events. Testa igen om en stund.')
    );
    console.error(fel);
  }
}

// Stänger en ev. öppen sheet (och unwindar dess history-post så att en Back-tryck
// efteråt lämnar appen i stället för att träffa en övergiven post) och ritar om
// hela sidan mot ett färskt nu.
function ritaOm() {
  if (sheetOppen) {
    stangSheet();
    history.back();
  }
  start();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stoppaTick();
    return;
  }
  // Har det gått länge är hela grupperingen byggd på ett gammalt nu — dagrubriker,
  // vilka events som räknas som pågående och NU-panelen är då fel, inte bara siffran.
  if (Date.now() - senasteRendering > OMRITNING_MS) {
    ritaOm();
    return;
  }
  tick();
  startaTick();
});

start();
