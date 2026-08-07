// Dagindelad kalendergruppering (spec: specs/2026-07-08-kalendervy-design.md).
// Sker vid sidladdning i svensk tid, så sidan är korrekt även om dygnsbygget uteblir.

import { tolkaTid, dagNyckel } from './tid.js';

const DYGN_MS = 24 * 60 * 60 * 1000;
const LANGKORARTYPER = new Set(['season', 'go-pass', 'go-battle-league', 'twitch-drops']);
const MAX_LANGD_LANGKORARE = 14 * DYGN_MS;
const MAX_LANGD_NU_PANEL = DYGN_MS + 60 * 1000;

// Nästa kalenderdags nyckel. Räknas på datumkomponenterna och aldrig genom att lägga
// till 24 timmar, så sommartidsskiftets 23- och 25-timmarsdygn inte kan få stegningen
// att hoppa över eller upprepa en dag.
function nastaDag(nyckel) {
  const [ar, manad, dag] = nyckel.split('-').map(Number);
  const nasta = new Date(Date.UTC(ar, manad - 1, dag) + DYGN_MS);
  const tva = (n) => String(n).padStart(2, '0');
  return `${nasta.getUTCFullYear()}-${tva(nasta.getUTCMonth() + 1)}-${tva(nasta.getUTCDate())}`;
}

export function grupperaKalender(events, nu) {
  const nuPanel = [];
  const alltidPagaende = [];
  const perDag = new Map();

  const idag = dagNyckel(nu);
  perDag.set(idag, { nyckel: idag, datum: new Date(nu), events: [] });

  function laggTill(nyckel, datum, event) {
    if (!perDag.has(nyckel)) {
      perDag.set(nyckel, { nyckel, datum, events: [] });
    }
    perDag.get(nyckel).events.push(event);
  }

  for (const raw of events) {
    const startDate = tolkaTid(raw.start);
    const endDate = tolkaTid(raw.end);
    if (endDate.getTime() < nu.getTime()) {
      continue;
    }
    const event = { ...raw, startDate, endDate };
    const langd = endDate.getTime() - startDate.getTime();
    const pagar = startDate.getTime() <= nu.getTime();
    const arLangkorare = LANGKORARTYPER.has(event.typ) || langd > MAX_LANGD_LANGKORARE;

    if (arLangkorare) {
      if (pagar) {
        alltidPagaende.push(event);
      } else {
        laggTill(dagNyckel(startDate), startDate, event);
      }
      continue;
    }

    if (pagar && langd <= MAX_LANGD_NU_PANEL) {
      nuPanel.push(event);
      continue;
    }

    // Ett event visas de dagar det är aktivt, räknat från idag. Tidigare visades bara
    // startdag, slutdag och Idag; en dag där eventet pågick men varken började eller
    // slutade saknades helt. Det gjorde dels att en helgdag mitt i ett event kunde se
    // tom ut, dels att slutdagsraden läste som om eventet hörde till just den dagen.
    const sista = dagNyckel(endDate);
    for (let nyckel = pagar ? idag : dagNyckel(startDate); nyckel <= sista; nyckel = nastaDag(nyckel)) {
      laggTill(nyckel, tolkaTid(`${nyckel}T12:00:00`), event);
    }
  }

  const dagar = [...perDag.values()].sort((a, b) => (a.nyckel < b.nyckel ? -1 : 1));
  for (const dag of dagar) {
    dag.events.sort((a, b) => a.startDate - b.startDate);
  }
  nuPanel.sort((a, b) => a.endDate - b.endDate);
  alltidPagaende.sort((a, b) => a.endDate - b.endDate);

  return { nuPanel, dagar, alltidPagaende };
}
