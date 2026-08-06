import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Bygget skriver filer som ingen ser om workflowen inte committar dem.
// Så hände det: raids-sv.json byggdes varje dygn men lämnades ostagead,
// och sidan visade samma raidbossar (Kyurem) i en månad.
const workflow = readFileSync(new URL('../.github/workflows/uppdatera-events.yml', import.meta.url), 'utf8');
const build = readFileSync(new URL('../scripts/build.js', import.meta.url), 'utf8');

const gitAddRad = workflow.split('\n').find((rad) => rad.trim().startsWith('git add '));

test('workflowen har en git add-rad', () => {
  assert.ok(gitAddRad, 'hittade ingen "git add"-rad i uppdatera-events.yml');
});

test('varje fil bygget skriver till docs/ stageas av workflowen', () => {
  const skrivna = [...build.matchAll(/skrivJson\(\s*'(docs\/[^']+)'/g)].map((m) => m[1]);
  assert.ok(skrivna.length > 0, 'hittade inga docs-filer som build.js skriver');

  const stagade = gitAddRad.trim().replace(/^git add /, '').split(/\s+/);
  const tacksAv = (fil) => stagade.some((s) => s === fil || (s.endsWith('/') && fil.startsWith(s)));

  for (const fil of skrivna) {
    assert.ok(tacksAv(fil), `${fil} byggs men stageas aldrig — ändringen når aldrig sidan`);
  }
});
