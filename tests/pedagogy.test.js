import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekId, weekday, skillStates, nextSkills, SKILL_TREE, placementPlan, scorePlacement, tapScore, placementDue, weekFocus, projectProgress, PROJECT_STEPS, addDays } from '../src/core/pedagogy.js';

const S = (extra = {}) => ({ xp: 0, days: {}, log: [], skills: {}, ...extra });

test('semaine : commence le lundi', () => {
  assert.equal(weekId(new Date('2026-10-19T10:00:00')), '2026-10-19'); // lundi
  assert.equal(weekId(new Date('2026-10-25T23:00:00')), '2026-10-19'); // dimanche
  assert.equal(weekId(new Date('2026-10-26T00:30:00')), '2026-10-26');
  assert.equal(weekday(new Date('2026-10-19T10:00:00')), 0);
  assert.equal(addDays('2026-10-19', 6), '2026-10-25');
});

test('arbre : prérequis, preuves, ids uniques', () => {
  const ids = new Set(SKILL_TREE.map((n) => n.id));
  assert.equal(ids.size, SKILL_TREE.length);
  for (const n of SKILL_TREE) for (const r of n.requires) assert.ok(ids.has(r), `${n.id} → ${r}`);
  let st = skillStates(S());
  assert.equal(st.pulse.state, 'available');
  assert.equal(st.eighths.state, 'locked');
  st = skillStates(S({ rush: { best: { lune: { stars: 2 } } }, pads: { best: { otf: { stars: 1 } } } }));
  assert.equal(st.pulse.state, 'acquired');
  assert.equal(st.eighths.state, 'available');
  // une compétence dont les preuves sont réunies reste verrouillée tant que le prérequis manque
  st = skillStates(S({ rush: { best: { jacques: { stars: 1 } } }, pads: { best: { hats8: { stars: 1 } } } }));
  assert.equal(st.eighths.state, 'locked');
  assert.ok(nextSkills(S()).length >= 3);
});

test('test hebdo : notes par domaine, point faible, régularité', () => {
  const plan = placementPlan();
  assert.ok(plan.length >= 14 && plan.some((x) => x.mode === 'tap'));
  const answers = plan.map((x) => (x.mode === 'tap' ? { domain: x.domain, score: 80 } : { domain: x.domain, ok: x.domain !== 'son' }));
  const r = scorePlacement(answers);
  assert.equal(r.scores.son, 0);
  assert.equal(r.scores.melodie, 100);
  assert.equal(r.weakest, 'son');
  assert.equal(r.scores.rythme, 95);
  assert.equal(tapScore([0, 10, -10, 5, 0, 0, 0, 0]), 100);
  assert.ok(tapScore([80, -90, 100, 70, 90, -80, 85, 95]) < 30);
  assert.ok(tapScore([0, 0]) <= 25, 'peu de frappes = note faible');
  const s = S({ placement: { [weekId()]: { scores: r.scores, weakest: 'son' } } });
  assert.equal(placementDue(s), false);
  assert.equal(weekFocus(s), 'sound');
  assert.equal(placementDue(S()), true);
});

test('projet de la semaine : étapes validées par les exercices de la semaine', () => {
  const week = '2026-10-19';
  const s = S({ log: [
    { d: '2026-10-18', key: 'beat:free' }, // avant le début : ne compte pas
    { d: '2026-10-19', key: 'beat:free' }, { d: '2026-10-20', key: 'chords:recipe' }, { d: '2026-10-22', key: 'hum:free' },
  ] });
  const p = projectProgress(s, { week, startedDay: week });
  assert.deepEqual(Object.keys(p.done).sort(), ['beat', 'chords', 'hook']);
  assert.equal(p.finished, false);
  const all = S({ log: PROJECT_STEPS.map((st, i) => ({ d: addDays(week, i), key: st.keys[0].replace(/:$/, ':x') })) });
  assert.equal(projectProgress(all, { week, startedDay: week }).finished, true);
});
