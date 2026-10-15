import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelFromXp, xpForLevel, updateStreak, hintsByDefault, newBadges } from '../src/core/progress.js';
import { buildSession, stepMatches, genreOfDay } from '../src/core/daily.js';
import { analyzeMelody } from '../src/core/catchy.js';
import { similarity, normalizeParams, PARAMS, getPath } from '../src/core/synthparams.js';
import { PRESETS } from '../src/data/presets.js';
import { MISSIONS } from '../src/data/missions.js';

test('niveaux', () => {
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(99).level, 1);
  assert.equal(levelFromXp(100).level, 2);
  assert.equal(levelFromXp(xpForLevel(10)).level, 10);
});

test('série de jours', () => {
  let s = { count: 0, last: null, best: 0 };
  s = updateStreak(s, '2026-10-14');
  s = updateStreak(s, '2026-10-15');
  assert.equal(s.count, 2);
  s = updateStreak(s, '2026-10-15');
  assert.equal(s.count, 2);
  s = updateStreak(s, '2026-10-18');
  assert.equal(s.count, 1);
  assert.equal(s.best, 2);
});

test('les indices disparaissent avec le niveau', () => {
  assert.equal(hintsByDefault(2), true);
  assert.equal(hintsByDefault(8), false);
  assert.equal(hintsByDefault(8, 'on'), true);
});

test('sessions : déterministes, 3 étapes, ciblent la compétence faible', () => {
  const a = buildSession('2026-10-15#1', {});
  const b = buildSession('2026-10-15#1', {});
  assert.deepEqual(a, b);
  assert.equal(a.steps.length, 3);
  for (let i = 0; i < 50; i++) {
    const s = buildSession('seed' + i, { skills: { rythme: 900, harmonie: 900, melodie: 900, sound: 0, oreille: 900 } });
    assert.equal(s.focus, 'sound');
    assert.ok(s.steps.every((st) => st.route.startsWith('#/')));
  }
  assert.ok(stepMatches({ key: 'mission' }, 'mission:later'));
  assert.ok(genreOfDay('2026-10-15').id);
});

test('catchy-mètre : un motif répété score mieux qu’un nuage aléatoire', () => {
  const chords = [{ pcs: [9, 0, 4] }, { pcs: [5, 9, 0] }, { pcs: [0, 4, 7] }, { pcs: [7, 11, 2] }];
  const motif = [[0, 69], [3, 72], [6, 71], [8, 69]];
  const good = new Array(64).fill(null);
  for (const b of [0, 1, 3]) motif.forEach(([s, n]) => { good[b * 16 + s] = { n, len: 2 }; });
  good[2 * 16] = { n: 72, len: 4 }; good[60] = { n: 69, len: 4 };
  const bad = Array.from({ length: 64 }, (_, i) => (i % 3 === 0 ? { n: 50 + ((i * 7) % 30), len: 1 } : null));
  assert.ok(analyzeMelody(good, chords, 9).score > analyzeMelody(bad, chords, 9).score + 20);
});

test('similarité de sons', () => {
  const a = normalizeParams(PRESETS.pluck.params);
  assert.equal(similarity(a, a, PARAMS.map((p) => p.id)).score, 100);
  const b = JSON.parse(JSON.stringify(a)); b.filter.cutoff = 12000;
  assert.ok(similarity(a, b, ['cutoff']).score < 50);
  for (const p of Object.values(PRESETS)) for (const d of PARAMS) assert.notEqual(getPath(normalizeParams(p.params), d.path), undefined, `${p.name} ${d.id}`);
});

test('missions et badges cohérents', () => {
  const ids = new Set(MISSIONS.map((m) => m.id));
  assert.equal(ids.size, MISSIONS.length);
  const fresh = { xp: 0, stats: { exercises: 1, sessions: 0, earCorrect: 0, beatPerfect: 0, bestCatchy: 0, bestMatch: 0, exports: 0, noHintWins: 0, midiNotes: 0 }, streak: {}, genres: {}, missions: {}, notebook: [], badges: {} };
  assert.deepEqual(newBadges(fresh).map((b) => b.id), ['first']);
});
