import { test } from 'node:test';
import assert from 'node:assert/strict';
import { humToNotes, snapToScale, fitRange } from '../src/core/hum.js';
import { critiqueBass, bassVariants, lineToNotes, notesToLine } from '../src/core/basscritic.js';
import { makeScenario, scoreMix, referenceMix, PROBLEMS } from '../src/core/mixdown.js';
import { TRANSFORMS, remapDegree } from '../src/core/variations.js';
import { weekStart, weekStats, coachPlan } from '../src/core/weekly.js';
import { voiceProgression, eventsAt } from '../src/core/arrange.js';
import { gridFromPatterns } from '../src/core/rhythm.js';
import { GENRES, genreById } from '../src/data/genres.js';

const proj = (gid = 'house') => {
  const g = genreById(gid);
  return { genre: g.id, bpm: g.bpm, swing: g.swing, rootPc: g.rootPc, scale: g.scale, chords: g.prog.map((x) => ({ ...x })), ext: 3, voicing: 'lead', chordStyle: g.chordStyle, bassStyle: g.bassStyle, sounds: { ...g.sounds }, drums: gridFromPatterns(g.drums), kit: 'club', pump: 0.4,
    melody: Array.from({ length: 64 }, (_, i) => (i % 4 === 0 ? { n: [69, 72, 71, 67][(i / 4) % 4], len: 2 } : i % 8 === 6 ? { n: 74, len: 1 } : null)) };
};

test('Fredonne → MIDI : trames vocales → notes calées', () => {
  const bpm = 120, sd = 60 / bpm / 4, frames = [];
  const sung = [{ s: 0, m: 69.3, len: 4 }, { s: 4, m: 71.8, len: 2 }, { s: 8, m: 76.2, len: 4 }, { s: 12, m: 74, len: 4 }];
  for (let t = 0; t < 16 * sd; t += 0.01) {
    const k = Math.floor(t / sd);
    const n = sung.find((x) => k >= x.s && k < x.s + x.len);
    const vib = Math.sin(t * 30) * 0.2;
    frames.push(n ? { t, f0: 440 * Math.pow(2, (n.m + vib - 69) / 12), conf: 0.95, rms: 0.3 } : { t, f0: 0, conf: 0, rms: 0.005 });
  }
  const { notes } = humToNotes(frames, { bpm, start: 0, steps: 16, rootPc: 9, scale: 'minor' });
  assert.deepEqual(notes.map((n) => [n.s, n.n, n.len]), [[0, 69, 4], [4, 72, 2], [8, 76, 4], [12, 74, 4]]);
  assert.equal(snapToScale(70.4, 9, 'minor'), 71);
  const fr = fitRange([{ n: 45 }, { n: 48 }], 67).reduce((a, x) => a + x.n, 0) / 2;
  assert.ok(Math.abs(fr - 67) <= 6, String(fr));
});

test('Labo de basse : critique et variantes', () => {
  const p = proj();
  const v = voiceProgression(p);
  const good = [];
  v.forEach((c, bar) => { const r = 36 + ((c.rootPc - 36) % 12 + 12) % 12; good.push({ s: bar * 16, n: r > 47 ? r - 12 : r, len: 3 }, { s: bar * 16 + 6, n: r > 47 ? r - 12 : r, len: 2 }); });
  const bad = [{ s: 0, n: 37, len: 16 }, { s: 16, n: 70, len: 4 }, { s: 32, n: 20, len: 4 }];
  const cg = critiqueBass(good, v, p.drums.kick, p.rootPc, p.scale);
  const cb = critiqueBass(bad, v, p.drums.kick, p.rootPc, p.scale);
  assert.ok(cg.score > cb.score + 30, `${cg.score} vs ${cb.score}`);
  assert.ok(cb.issues.some((i) => i.type === 'range') && cb.issues.some((i) => i.type === 'leap'));
  const vars = bassVariants(v, p.drums.kick, p.rootPc, p.scale);
  assert.equal(vars.length, 3);
  for (const x of vars) assert.ok(critiqueBass(x.notes, v, p.drums.kick, p.rootPc, p.scale).score >= 70, `${x.id} ${JSON.stringify(critiqueBass(x.notes, v, p.drums.kick, p.rootPc, p.scale).issues)}`);
  assert.equal(lineToNotes(notesToLine(good)).length, good.length);
  const q = { ...p, bassLine: notesToLine(good) };
  assert.equal(eventsAt(q, v, 0).bass[0].note, good[0].n);
});

test('Mixdown : scénario, score parfait sur la référence, mauvais sur le mix cassé', () => {
  for (const g of ['house', 'lofi', 'techno']) {
    const sc = makeScenario(g, 5);
    assert.equal(sc.problems.length, 3);
    assert.equal(scoreMix(sc.ref, sc.ref, sc.problems).score, 100);
    assert.ok(scoreMix(sc.broken, sc.ref, sc.problems).score < 40, `${g} ${scoreMix(sc.broken, sc.ref, sc.problems).score}`);
  }
  assert.ok(PROBLEMS.length >= 8 && referenceMix('house').pump > referenceMix('lofi').pump);
});

test('Remix : chaque transformation produit un projet valide et différent', () => {
  const p = proj('house');
  for (const [id, t] of Object.entries(TRANSFORMS)) {
    const r = t.run(p, 'dnb');
    assert.ok(r.project && r.title && r.what && r.why, id);
    assert.notDeepEqual(r.project, p, id);
    const v = voiceProgression(r.project);
    for (let s = 0; s < 64; s++) eventsAt(r.project, v, s);
  }
  const maj = TRANSFORMS.mode.run(p);
  assert.equal(maj.project.scale, 'major');
  assert.equal(remapDegree(72, 9, 'minor', 'major'), 73); // C (tierce mineure de A) → C#
});

test('Bilan hebdo et coach', () => {
  assert.equal(weekStart('2026-10-18'), '2026-10-12'); // dimanche → lundi précédent
  const s = {
    days: { '2026-10-13': { xp: 120, sessions: 1, exercises: 4, skills: { rythme: 80, oreille: 40 }, ear: { ok: 8, total: 10 } }, '2026-10-15': { xp: 60, exercises: 2, skills: { rythme: 60 } } },
    log: [{ d: '2026-10-13', key: 'beat:ear', genre: 'house', score: 90 }, { d: '2026-10-15', key: 'ear:intervals', genre: null }],
    notebook: [{ date: new Date('2026-10-14T10:00:00').getTime(), type: 'idea' }], review: { 'intervals:6': { box: 0, due: '2026-10-19' } },
  };
  const w = weekStats(s, '2026-10-12');
  assert.equal(w.xp, 180); assert.equal(w.activeDays, 2); assert.equal(w.ideas.length, 1); assert.deepEqual(w.genres, ['house']);
  const prev = weekStats(s, '2026-10-05');
  const c = coachPlan(w, prev, { review: s.review, untriedGenre: GENRES[3] });
  assert.ok(c.plan.length >= 4 && c.plan.every((x) => x.route.startsWith('#/')));
  assert.notEqual(c.weakest, 'rythme');
});
