import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES, challengeOfWeek, checkRules } from '../src/core/challenge.js';
import { GENRES } from '../src/data/genres.js';

test('défis : styles valides, même défi pour tous la même semaine, variété', () => {
  for (const c of CHALLENGES) assert.ok(GENRES.some((g) => g.id === c.genre), c.id);
  assert.equal(challengeOfWeek('2026-10-19').id, challengeOfWeek('2026-10-19').id);
  const ids = new Set(Array.from({ length: 30 }, (_, i) => challengeOfWeek(`2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`).id));
  assert.ok(ids.size >= 5);
});

test('règles vérifiées sur le projet', () => {
  const c = CHALLENGES.find((x) => x.id === 'trois-notes');
  const mel = Array(64).fill(null);
  [60, 62, 64, 60, 62, 64].forEach((n, i) => { mel[i * 4] = { n, len: 2 }; });
  assert.deepEqual(checkRules(c, { melody: mel }).map((r) => r.ok), [true, true]);
  mel[30] = { n: 67, len: 1 };
  assert.deepEqual(checkRules(c, { melody: mel }).map((r) => r.ok), [true, false]);
  const t = CHALLENGES.find((x) => x.id === 'trap-sans-hats');
  assert.equal(checkRules(t, { drums: { hat: [1] } })[0].ok, false);
  assert.equal(checkRules(t, {}).length, 3, 'projet incomplet : pas d’erreur');
});
