// Tidshantering enligt PRD etapp 2.
// Två format förekommer i datan: med Z (UTC) och utan Z (lokal väggklocka).
// All visning sker i svensk tid (Europe/Stockholm), oberoende av var koden körs.

const TIDSZON = 'Europe/Stockholm';

const delarFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIDSZON,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const datumFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIDSZON,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function stockholmsDelar(date) {
  const delar = {};
  for (const { type, value } of delarFormat.formatToParts(date)) {
    delar[type] = value;
  }
  return delar;
}

// Stockholms UTC-förskjutning (ms) vid en given tidpunkt.
function offsetMs(utcMs) {
  const p = stockholmsDelar(new Date(utcMs));
  const somUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return somUtc - utcMs;
}

export function tolkaTid(str) {
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(str)) {
    return new Date(str);
  }
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) {
    return new Date(str);
  }
  const somUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  // Två pass hanterar att förskjutningen kan ändras vid sommartidsskiften.
  let ts = somUtc - offsetMs(somUtc);
  ts = somUtc - offsetMs(ts);
  return new Date(ts);
}

export function formatKlocka(date) {
  const p = stockholmsDelar(date);
  const timme = String(+p.hour);
  return p.minute === '00' ? timme : `${timme}.${p.minute}`;
}

const DYGN_MS = 24 * 60 * 60 * 1000;

const veckodagFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIDSZON,
  weekday: 'long',
});

const kortDatumFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIDSZON,
  day: 'numeric',
  month: 'long',
});

export function dagNyckel(date) {
  const p = stockholmsDelar(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function arHelg(date) {
  const veckodag = veckodagFormat.format(date);
  return veckodag === 'lördag' || veckodag === 'söndag';
}

export function formatDagRubrik(date, nu) {
  const bas = datumFormat.format(date);
  if (dagNyckel(date) === dagNyckel(nu)) {
    return `Idag · ${bas}`;
  }
  if (dagNyckel(date) === dagNyckel(new Date(nu.getTime() + DYGN_MS))) {
    return `Imorgon · ${bas}`;
  }
  return bas;
}

// Kort tidstext för en kalenderrad, relativt den dag raden står under.
export function formatChip(start, slut, dag) {
  const dagN = dagNyckel(dag);
  const startN = dagNyckel(start);
  const slutN = dagNyckel(slut);
  if (startN === dagN && slutN === dagN) {
    return `kl ${formatKlocka(start)}–${formatKlocka(slut)}`;
  }
  if (startN === dagN) {
    return `från kl ${formatKlocka(start)}`;
  }
  if (slutN === dagN) {
    return `till kl ${formatKlocka(slut)}`;
  }
  if (slut.getTime() - dag.getTime() < 7 * DYGN_MS) {
    return `t.o.m. ${veckodagFormat.format(slut)}`;
  }
  return `t.o.m. ${kortDatumFormat.format(slut)}`;
}

export function formatDatum(date, nu) {
  const dag = dagNyckel(date);
  if (dag === dagNyckel(nu)) {
    return 'Idag';
  }
  if (dag === dagNyckel(new Date(nu.getTime() + 24 * 60 * 60 * 1000))) {
    return 'Imorgon';
  }
  return datumFormat.format(date);
}

export function formatTidsspann(start, slut, nu) {
  if (dagNyckel(start) === dagNyckel(slut)) {
    return `${formatDatum(start, nu)} kl ${formatKlocka(start)}–${formatKlocka(slut)}`;
  }
  return `${formatDatum(start, nu)} kl ${formatKlocka(start)} – ${formatDatum(slut, nu)} kl ${formatKlocka(slut)}`;
}

// Nedräkning (spec: specs/2026-08-07-nedrakning-design.md).
// Minuter och timmar avrundas nedåt: underskattning gör att man kommer för tidigt
// i stället för för sent, och skyndar på när tiden håller på att ta slut.
// Dygn räknas däremot i kalenderdagar och är exakta — se dagSkillnad.
const MINUT_MS = 60 * 1000;

// Antal kalenderdagar mellan två tidpunkter, räknat i svensk tid. Räkningen sker på
// datumkomponenterna och inte på förfluten tid, så varken sommartidsskiften (dygn på
// 23 respektive 25 timmar) eller klockslag kan förskjuta resultatet.
function dagSkillnad(fran, till) {
  const [franAr, franManad, franDag] = dagNyckel(fran).split('-').map(Number);
  const [tillAr, tillManad, tillDag] = dagNyckel(till).split('-').map(Number);
  const franMidnatt = Date.UTC(franAr, franManad - 1, franDag);
  const tillMidnatt = Date.UTC(tillAr, tillManad - 1, tillDag);
  return Math.round((tillMidnatt - franMidnatt) / DYGN_MS);
}

// Ligger målet på ett senare datum räknas det alltid i dagar, oavsett klockslag:
// barn tänker i sömnar, inte i förflutna timmar. Är det fredag står ett event på
// måndag som "om 3 dagar" även sent på fredagskvällen. Klockslaget står bredvid.
function enhet(diffMs, nu, mal) {
  const dagar = dagSkillnad(nu, mal);
  if (dagar >= 1) {
    return { antal: dagar, ental: 'dag', flertal: 'dagar' };
  }
  const minuter = Math.floor(diffMs / MINUT_MS);
  if (minuter < 60) {
    return { antal: minuter, ental: 'minut', flertal: 'minuter' };
  }
  return { antal: Math.floor(minuter / 60), ental: 'timme', flertal: 'timmar' };
}

// Pekar alltid på eventets nästa gräns: starten om det inte börjat, annars slutet.
export function formatNedrakning(start, slut, nu) {
  const pagar = start.getTime() <= nu.getTime();
  const mal = pagar ? slut : start;
  const diff = mal.getTime() - nu.getTime();
  if (pagar && diff <= 0) {
    return 'har slutat';
  }
  if (diff < MINUT_MS) {
    return pagar ? 'slutar strax' : 'börjar nu';
  }
  const { antal, ental, flertal } = enhet(diff, nu, mal);
  const text = `om ${antal} ${antal === 1 ? ental : flertal}`;
  return pagar ? `slutar ${text}` : text;
}
