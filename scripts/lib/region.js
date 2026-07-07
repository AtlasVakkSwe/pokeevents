// Regionsklassning enligt PRD etapp 5. Regionsfält saknas i datan,
// så klassningen bygger på termer i eventnamn/heading (data/regioner.json).

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matchar term som eget ord (skiftlägesokänsligt), så att t.ex. "asia"
// träffar "Asia-Pacific" men inte råkar träffa inuti andra ord.
function hittaTerm(text, termer) {
  for (const term of termer) {
    const re = new RegExp(`(^|[^\\p{L}])${escapeRegex(term)}([^\\p{L}]|$)`, 'iu');
    if (re.test(text)) {
      return term;
    }
  }
  return null;
}

export function klassaRegion(event, regioner) {
  const text = `${event.name || ''} ${event.heading || ''}`;
  const utesluter = hittaTerm(text, regioner.gallerInte);
  if (utesluter) {
    return { status: 'galler-inte', term: utesluter };
  }
  const tacker = hittaTerm(text, regioner.gallerISverige);
  if (tacker) {
    return { status: 'galler', term: tacker };
  }
  const signal = hittaTerm(text, regioner.regionSignaler);
  if (signal) {
    // Platsbundet event med okänd plats — gissa aldrig grönt.
    return { status: 'osakert', term: `${signal} → ${event.name}` };
  }
  return { status: 'galler', term: null };
}
