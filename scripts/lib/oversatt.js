// Deterministisk översättning enligt PRD etapp 7: ordlista + mallar, ingen AI.
// Termer som saknas visas oöversatta (hellre engelska än fel svenska) och loggas.

function normalisera(text) {
  return text.replace(/×/g, 'x').replace(/\*+\s*$/, '').trim().toLowerCase();
}

function namnlista(poke) {
  return poke.map((p) => p.name).join(', ');
}

const MANADER = {
  January: 'januari', February: 'februari', March: 'mars', April: 'april', May: 'maj', June: 'juni',
  July: 'juli', August: 'augusti', September: 'september', October: 'oktober', November: 'november', December: 'december',
};

// Steg 1–2 i namnreglerna (spec 2026-09-13, punkt 1): suffix efter " | " och
// formnamn i parentes klipps.
function rensaNamn(name) {
  return name.split(' | ')[0].replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

// Uppräkningsdelen av ett namn: "A, B, and C" → "A, B och C". Pokémon-namn rörs inte.
function ochLista(text) {
  return text.replace(/, and /g, ' och ').replace(/ and /g, ' och ').replace(/Mystery Pokémon/g, 'Hemlig Pokémon');
}

export function skapaOversattare(ordlista) {
  const okanda = new Set();

  const bonusIndex = new Map(
    Object.entries(ordlista.bonusar).map(([nyckel, svensk]) => [normalisera(nyckel), svensk])
  );

  const raidTypIndex = new Map(
    Object.entries(ordlista.raidTyper || {}).map(([nyckel, svensk]) => [nyckel.toLowerCase(), svensk])
  );

  // Lättläst namn (spec punkt 1). Originalet ligger kvar i event.name och visas i
  // detaljvyn; det här är radens namn. Matchar inget mönster returneras det rensade
  // originalet.
  function lattlastNamn(event) {
    const bas = rensaNamn(event.name);
    let m;
    switch (event.eventType) {
      case 'raid-battles':
        m = bas.match(/^(.+?) in (.+)$/);
        if (!m) {
          return bas;
        }
        if (!raidTypIndex.has(m[2].toLowerCase())) {
          okanda.add(m[2]);
          return bas;
        }
        return `${ochLista(m[1])} i ${raidTypIndex.get(m[2].toLowerCase())}`;
      case 'pokemon-spotlight-hour':
        m = bas.match(/^(.+) Spotlight Hour$/);
        return m ? `Rampljustimme: ${ochLista(m[1])}` : bas;
      case 'raid-hour':
        m = bas.match(/^(.+) Raid Hour$/);
        return m ? `Raidtimme: ${ochLista(m[1])}` : bas;
      case 'raid-day': {
        const re = /\s*(?:Super\s+)?(?:Mega\s+)?Raid Day$/;
        if (!re.test(bas)) {
          return bas;
        }
        const x = bas.replace(re, '');
        return x ? `Raiddag: ${ochLista(x)}` : 'Raiddag';
      }
      case 'max-mondays':
        m = bas.match(/^Dynamax (.+) during Max Monday$/);
        return m ? `Max-måndag: ${ochLista(m[1])}` : bas;
      case 'max-battles': {
        const re = /\s*Max Battle Day$/;
        if (!re.test(bas)) {
          return bas;
        }
        const x = bas.replace(re, '');
        return x ? `Max-stridsdag: ${ochLista(x)}` : 'Max-stridsdag';
      }
      case 'community-day':
        m = bas.match(/^(.+) Community Day$/);
        if (!m) {
          return bas;
        }
        return MANADER[m[1]] ? `Community Day i ${MANADER[m[1]]}` : `Community Day: ${ochLista(m[1])}`;
      default:
        return bas;
    }
  }

  function bonus(text) {
    const svensk = bonusIndex.get(normalisera(text));
    if (svensk) {
      return svensk;
    }
    okanda.add(text);
    return text.replace(/\*+\s*$/, '');
  }

  function eventtyp(typ) {
    const svensk = ordlista.eventtyper[typ];
    if (svensk) {
      return svensk;
    }
    okanda.add(typ);
    return typ;
  }

  function sammanfattning(event) {
    const extra = event.extraData || {};
    switch (event.eventType) {
      case 'pokemon-spotlight-hour': {
        const s = extra.spotlight || {};
        let text = `${s.name || 'En Pokémon'} dyker upp extra ofta.`;
        if (s.canBeShiny) {
          text += ' Kan vara shiny! ✨';
        }
        if (s.bonus) {
          text += ` Bonus: ${bonus(s.bonus)}.`;
        }
        return text;
      }
      case 'community-day': {
        const spawns = extra.communityday?.spawns || [];
        const vem = spawns.length > 0 ? ` med ${namnlista(spawns)}` : '';
        return `Community Day${vem}! Extra många dyker upp och det finns bonusar hela tiden.`;
      }
      case 'raid-battles': {
        const bossar = extra.raidbattles?.bosses || [];
        if (bossar.length === 0) {
          return 'Nya Pokémon i raid.';
        }
        let text = `${namnlista(bossar)} finns i raid.`;
        if (bossar.some((b) => b.canBeShiny)) {
          text += ' Kan vara shiny! ✨';
        }
        return text;
      }
      case 'raid-hour':
        return 'Raidtimme! Extra många raider i en timme.';
      case 'raid-day':
        return 'Raiddag! Extra många raider hela dagen.';
      case 'max-mondays': {
        const m = rensaNamn(event.name).match(/^Dynamax (.+) during Max Monday$/);
        return m ? `${ochLista(m[1])} i Max-strider hela dagen.` : 'Max-måndag! Extra Max-strider hela dagen.';
      }
      case 'go-battle-league':
        return 'Nytt i GO Battle League (strider mot andra spelare).';
      case 'max-battles':
        return 'Extra många Max-strider.';
      case 'wild-area':
        return 'Wild Area: massor av Pokémon att fånga och särskilda bonusar.';
      case 'go-pass':
        return 'Samla poäng och få belöningar hela månaden.';
      case 'season':
        return 'Ny säsong med nya Pokémon och bonusar.';
      case 'event':
        if (/\bHatch Day\b/.test(event.name)) {
          return 'Kläckdag! Kläck ägg och få en särskild Pokémon.';
        }
        return extra.generic?.hasSpawns ? 'Särskilda Pokémon dyker upp under eventet. Se listan.' : null;
      default:
        return null;
    }
  }

  function okandaTermer() {
    return [...okanda];
  }

  return { bonus, eventtyp, sammanfattning, lattlastNamn, okandaTermer };
}
