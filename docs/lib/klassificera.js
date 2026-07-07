// Klassificering enligt PRD etapp 3: sker vid sidladdning, på tidsobjekt.

import { tolkaTid } from './tid.js';

export function klassificera(events, nu) {
  const pagarNu = [];
  const kommerSnart = [];
  for (const event of events) {
    const startDate = tolkaTid(event.start);
    const endDate = tolkaTid(event.end);
    if (endDate.getTime() < nu.getTime()) {
      continue;
    }
    const berikat = { ...event, startDate, endDate };
    if (startDate.getTime() <= nu.getTime()) {
      pagarNu.push(berikat);
    } else {
      kommerSnart.push(berikat);
    }
  }
  pagarNu.sort((a, b) => a.endDate - b.endDate);
  kommerSnart.sort((a, b) => a.startDate - b.startDate);
  return { pagarNu, kommerSnart };
}
