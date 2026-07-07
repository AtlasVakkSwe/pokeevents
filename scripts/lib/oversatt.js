// Deterministisk översättning enligt PRD etapp 7: ordlista + mallar, ingen AI.
// Termer som saknas visas oöversatta (hellre engelska än fel svenska) och loggas.

function normalisera(text) {
  return text.replace(/×/g, 'x').replace(/\*+\s*$/, '').trim().toLowerCase();
}

function namnlista(poke) {
  return poke.map((p) => p.name).join(', ');
}

export function skapaOversattare(ordlista) {
  const okanda = new Set();

  const bonusIndex = new Map(
    Object.entries(ordlista.bonusar).map(([nyckel, svensk]) => [normalisera(nyckel), svensk])
  );

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
      case 'max-mondays':
        return 'Max-måndag! Extra Max-strider ikväll.';
      case 'go-battle-league':
        return 'Nytt i GO Battle League (strider mot andra spelare).';
      default:
        return null;
    }
  }

  function okandaTermer() {
    return [...okanda];
  }

  return { bonus, eventtyp, sammanfattning, okandaTermer };
}
