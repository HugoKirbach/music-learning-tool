import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGoal, goalPlan, GOAL_KINDS } from '../src/core/goals.js';
import { weeklySeries, stagnating, bestTempo, trend } from '../src/core/stats.js';
import { CERT_LEVELS } from '../src/core/progress.js';

const base = () => ({ xp: 0, days: {}, skills: { rythme: 0, harmonie: 0, melodie: 0, sound: 0, oreille: 0, autonomie: 0 }, streak: { best: 0 } });

test('Objectif tempo : paliers hebdomadaires linéaires jusqu’à la cible', () => {
  const s = base();
  s.days['2026-10-12'] = { xp: 10, tempo: 100 };
  const g = makeGoal('tempo', 140, 4, s, '2026-10-19');
  assert.equal(g.start, 100);
  assert.equal(g.deadline, '2026-11-15');
  const p = goalPlan(g, s, '2026-10-19');
  assert.deepEqual(p.milestones.map((m) => m.value), [110, 120, 130, 140]);
  assert.equal(p.week, 1);
  assert.equal(p.status, 'ok');
  s.days['2026-10-20'] = { tempo: 112 };
  assert.equal(goalPlan(g, s, '2026-10-20').status, 'ahead');
  // Trois semaines plus tard, toujours à 112 : en retard
  assert.equal(goalPlan(g, s, '2026-11-10').status, 'late');
  s.days['2026-11-11'] = { tempo: 140 };
  const done = goalPlan(g, s, '2026-11-11');
  assert.equal(done.status, 'done');
  assert.equal(done.pct, 100);
});

test('Objectif hebdomadaire (minutes) : mesuré sur la semaine en cours', () => {
  const s = base();
  const g = makeGoal('practice', 120, 2, s, '2026-10-19');
  assert.equal(g.start, 0);
  s.days['2026-10-19'] = { sec: 3600 };
  const p = goalPlan(g, s, '2026-10-21');
  assert.equal(p.current, 60);
  assert.equal(p.milestone, 60);
  assert.equal(p.status, 'ahead');
  assert.equal(GOAL_KINDS.practice.weekly, true);
});

test('Statistiques par semaine, tempo maîtrisé, compétences qui stagnent', () => {
  const s = base();
  s.skills = { rythme: 300, harmonie: 200, melodie: 0, sound: 0, oreille: 0, autonomie: 0 };
  s.days['2026-09-21'] = { xp: 80, skills: { harmonie: 80 }, acc: { n: 2, sum: 140 } };
  s.days['2026-10-13'] = { xp: 120, sec: 900, skills: { rythme: 120 }, acc: { n: 2, sum: 170 }, tempo: 118, ear: { ok: 3, total: 4 } };
  s.days['2026-10-19'] = { xp: 60, skills: { rythme: 60 } };
  const w = weeklySeries(s, 5, '2026-10-19');
  assert.equal(w.length, 5);
  assert.equal(w[4].start, '2026-10-19');
  assert.deepEqual([w[3].minutes, w[3].acc, w[3].tempo, w[3].ear], [15, 85, 118, 75]);
  assert.equal(w[0].acc, 70);
  assert.equal(bestTempo(s), 118);
  const st = stagnating(s, '2026-10-19');
  assert.equal(st[0].skill, 'harmonie');
  assert.ok(!st.some((x) => x.skill === 'melodie'), 'jamais travaillée : pas « en stagnation »');
  assert.equal(trend(weeklySeries(s, 8, '2026-10-19'), 'acc'), 15);
  assert.deepEqual(CERT_LEVELS, [3, 5, 8, 12, 16, 20, 30]);
});

test('Latence : décalage médian, frappes aberrantes ignorées, sources', async () => {
  const { analyzeTaps, inputKind, inputLatency } = await import('../src/core/latency.js');
  const beats = Array.from({ length: 16 }, (_, i) => 1 + i * 0.6);
  const taps = beats.map((b, i) => b + (i === 7 ? 0.2 : 0.06 + ((i % 3) - 1) * 0.008));
  const r = analyzeTaps(taps, beats);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.offset - 60) <= 8, `offset ${r.offset}`);
  assert.equal(r.quality, 'très régulier');
  assert.equal(analyzeTaps(taps.slice(0, 5), beats).ok, false);
  const messy = beats.map((b, i) => b + (i % 2 ? 0.15 : -0.1));
  assert.equal(analyzeTaps(messy, beats).ok, false);
  assert.deepEqual(['p3', 'kSpace', 'midi60', 'm36'].map(inputKind), ['touch', 'key', 'midi', 'midi']);
  assert.equal(inputLatency({ latency: { touch: 80 } }, 'p1'), 0.08);
  assert.equal(inputLatency({}, 'p1'), 0);
});
