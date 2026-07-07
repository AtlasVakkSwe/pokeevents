// Validering av ScrapedDuck-data enligt PRD etapp 1.

const OBLIGATORISKA_FALT = ['name', 'eventType', 'start', 'end'];

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

export function valideraEvents(data) {
  if (!Array.isArray(data)) {
    throw new Error('Svaret är inte en JSON-array');
  }
  if (data.length === 0) {
    throw new Error('Svaret är en tom lista');
  }
  data.forEach((event, i) => {
    for (const falt of OBLIGATORISKA_FALT) {
      if (typeof event?.[falt] !== 'string' || event[falt] === '') {
        throw new Error(`Event ${i} saknar fältet "${falt}"`);
      }
    }
  });
  return data;
}
