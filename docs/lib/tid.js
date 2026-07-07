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

function dagNyckel(date) {
  const p = stockholmsDelar(date);
  return `${p.year}-${p.month}-${p.day}`;
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
