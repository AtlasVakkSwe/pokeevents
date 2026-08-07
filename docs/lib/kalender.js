// Dagindelad kalendergruppering (spec: specs/2026-07-08-kalendervy-design.md).
// Sker vid sidladdning i svensk tid, så sidan är korrekt även om dygnsbygget uteblir.

import { tolkaTid, dagNyckel } from './tid.js';

const DYGN_MS = 24 * 60 * 60 * 1000;
const LANGKORARTYPER = new Set(['season', 'go-pass', 'go-battle-league', 'twitch-drops']);
const MAX_LANGD_LANGKORARE = 14 * DYGN_MS;
const MAX_LANGD_NU_PANEL = DYGN_MS + 60 * 1000;

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

    // En rad per event: kalendern visar vad som börjar, plus vad som gäller idag.
    // Ett pågående event hör hemma under Idag, där raden namnger slutdagen och räknar
    // ner till den. Ett kommande hör hemma under sin startdag, där nedräkningen och
    // dagrubriken säger samma sak. Att upprepa eventet på fler dagar gav antingen tom
    // upprepning eller en rad vars siffra räknade från nu men stod under en annan dag.
    if (pagar) {
      laggTill(idag, new Date(nu), event);
    } else {
      laggTill(dagNyckel(startDate), startDate, event);
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
