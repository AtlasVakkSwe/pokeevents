// Validering av ScrapedDuck-data enligt PRD etapp 1.

// Fält som måste finnas – annars är datan trasig och bygget stoppas.
const OBLIGATORISKA_FALT = ['name', 'eventType'];
// Fält som LeekDuck ibland lämnar tomma (event utan fastställt datum).
// Sådana event hoppas över i stället för att stoppa hela dygnsbygget.
const DATUMFALT = ['start', 'end'];

function saknas(objekt, falt) {
  return typeof objekt?.[falt] !== 'string' || objekt[falt] === '';
}

export function valideraRaids(data) {
  if (!Array.isArray(data)) {
    throw new Error('Raid-svaret är inte en JSON-array');
  }
  if (data.length === 0) {
    throw new Error('Raid-svaret är en tom lista');
  }
  data.forEach((raid, i) => {
    for (const falt of ['name', 'tier']) {
      if (typeof raid?.[falt] !== 'string' || raid[falt] === '') {
        throw new Error(`Raid ${i} saknar fältet "${falt}"`);
      }
    }
  });
  return data;
}

export function valideraEvents(data, { varna = () => {} } = {}) {
  if (!Array.isArray(data)) {
    throw new Error('Svaret är inte en JSON-array');
  }
  if (data.length === 0) {
    throw new Error('Svaret är en tom lista');
  }
  data.forEach((event, i) => {
    for (const falt of OBLIGATORISKA_FALT) {
      if (saknas(event, falt)) {
        throw new Error(`Event ${i} saknar fältet "${falt}"`);
      }
    }
  });
  const daterade = data.filter((event) => {
    const saknade = DATUMFALT.filter((falt) => saknas(event, falt));
    if (saknade.length > 0) {
      varna(`Hoppar över "${event.name}": saknar ${saknade.join(' och ')}.`);
      return false;
    }
    return true;
  });
  if (daterade.length === 0) {
    throw new Error('Inget event har datum – behåller tidigare data');
  }
  return daterade;
}
