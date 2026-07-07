// Grupperar aktuella raidbossar per nivå med svenska rubriker.
// Nivåordningen följer ordlistans raidNivaer (svåraste först);
// okända nivåer hamnar sist, visas oöversatta och loggas.

export function berikaRaids(raids, { ordlista }) {
  const nivaer = ordlista.raidNivaer || {};
  const kandaOrdning = Object.keys(nivaer);
  const okanda = new Set();

  const perNiva = new Map();
  for (const raid of raids) {
    if (!perNiva.has(raid.tier)) {
      perNiva.set(raid.tier, []);
    }
    perNiva.get(raid.tier).push({
      namn: raid.name,
      bild: raid.image || '',
      shiny: Boolean(raid.canBeShiny),
    });
  }

  const tiers = [...perNiva.keys()].sort((a, b) => {
    const ia = kandaOrdning.indexOf(a);
    const ib = kandaOrdning.indexOf(b);
    return (ia === -1 ? kandaOrdning.length : ia) - (ib === -1 ? kandaOrdning.length : ib);
  });

  const grupper = tiers.map((tier) => {
    let rubrik = nivaer[tier];
    if (!rubrik) {
      okanda.add(tier);
      rubrik = tier;
    }
    return { rubrik, pokemon: perNiva.get(tier) };
  });

  return { grupper, okandaTermer: [...okanda] };
}
