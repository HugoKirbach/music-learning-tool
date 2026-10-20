import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, VENUES, MAKERS, planNight, judgeTaps, roundPoints, nextHype, starsFor, totalStars, isOpen, nightXp, pressVinyl, addToCrate, nightConcepts, dailyVenue, roundTime, venueById, noteNameFr, MAX_STARS } from '../src/core/club.js';
import { GENRES } from '../src/data/genres.js';
import { SKILLS } from '../src/core/progress.js';

test('salles et mini-jeux cohérents', () => {
  const ids = GENRES.map((g) => g.id);
  for (const v of VENUES) {
    v.games.forEach((g) => assert.ok(GAMES[g], g));
    v.genres.forEach((g) => assert.ok(ids.includes(g), g));
  }
  for (const [id, g] of Object.entries(GAMES)) {
    assert.ok(SKILLS[g.skill], id);
    assert.ok(MAKERS[id] && g.lesson && g.lab.href.startsWith('#/'), id);
  }
  assert.deepEqual(VENUES.map((v) => v.need), [...VENUES.map((v) => v.need)].sort((a, b) => a - b));
  // Les salles déjà ouvertes avant la mise à jour restent ouvertes (mêmes seuils)
  assert.deepEqual(['bar', 'warehouse', 'beach', 'festival', 'berlin'].map((id) => venueById(id).need), [0, 2, 5, 8, 11]);
  assert.equal(VENUES.length, 9);
  assert.ok(VENUES.at(-1).need <= MAX_STARS - 6, 'la dernière salle reste atteignable');
  dailyVenue('2026-10-19').genres.forEach((g) => assert.ok(ids.includes(g), g));
});

test('nuit déterministe, sans répétition immédiate, difficulté et tempo qui montent', () => {
  const v = venueById('festival');
  const a = planNight(v, 'x'), b = planNight(v, 'x');
  assert.deepEqual(a, b);
  assert.equal(a.length, v.length);
  for (let i = 1; i < a.length; i++) assert.notEqual(a[i].type, a[i - 1].type);
  assert.ok(a.at(-1).bpm > a[0].bpm && a.at(-1).d > a[0].d);
  assert.ok(roundTime(a.at(-1)) < roundTime({ ...a.at(-1), speed: 1 }));
  assert.notDeepEqual(planNight(v, 'y').map((r) => r.type), a.map((r) => r.type));
});

test('générateurs : réponses valides sur beaucoup de tirages', () => {
  const v = venueById('berlin');
  for (let s = 0; s < 60; s++) {
    for (const r of planNight(v, s)) {
      const q = r.q;
      if (r.type === 'pitch') { assert.equal(q.notes[q.answer] > q.notes[1 - q.answer], true); assert.ok(q.gap >= 1); }
      if (r.type === 'mood') assert.equal(q.notes[1] - q.notes[0], q.answer === 0 ? 4 : 3);
      if (r.type === 'hole' && q.what === 'clap') assert.ok([1, 3].includes(q.missing));
      if (r.type === 'genre') { assert.ok(q.genres[q.answer]); assert.equal(new Set(q.genres).size, q.genres.length); }
      if (r.type === 'note') { assert.equal(q.options.length, 3); assert.ok(q.options[q.answer].startsWith(noteNameFr(q.midi) + ' '), q.options[q.answer]); }
      if (r.type === 'tempo') assert.equal(q.bpms[q.answer] > q.bpms[1 - q.answer], true);
      if (r.type === 'simon') assert.ok(q.seq.length >= 3 && q.seq.every((p) => p >= 0 && p < 4));
      if (r.type === 'swing') assert.equal(q.amount > 0, q.answer === 1);
      if (r.type === 'count') assert.equal(String(q.notes.length), q.options[q.answer]);
      if (r.type === 'filter') assert.equal(q.cutoff >= 2400, q.answer === 0);
      if (r.type === 'contour') {
        const dir = q.notes.slice(1).map((n, i) => Math.sign(n - q.notes[i]));
        const want = { up: [1, 1, 1], down: [-1, -1, -1], wave: [1, 1, -1] }[q.kind];
        assert.deepEqual(dir, want, q.kind);
        assert.match(q.options[q.answer], { up: /monte$/, down: /descend$/, wave: /Monte puis/ }[q.kind]);
      }
    }
  }
  const n = MAKERS.note(() => 0.01, 0);
  assert.match(n.options[n.answer], /^Do \(C\)$/);
});

test('notation : frappes, points, ambiance, étoiles, déblocages', () => {
  const beats = [1, 1.5, 2, 2.5];
  assert.deepEqual(judgeTaps([1.04, 1.48, 2.2, 2.51], beats, 100), { hits: 3, offs: [40, -20, 10] });
  assert.equal(judgeTaps([1.01, 1.02], beats, 100).hits, 1, 'un temps ne compte qu’une fois');
  assert.equal(roundPoints(0, 1), 150);
  assert.equal(roundPoints(20, 0), 200);
  assert.equal(nextHype(95, true), 100);
  assert.equal(nextHype(10, false), 0);
  assert.equal(starsFor(false, 10, 10), 0);
  assert.equal(starsFor(true, 9, 10), 3);
  assert.equal(starsFor(true, 8, 10), 2);
  assert.equal(starsFor(true, 7, 10), 1);
  const best = { bar: { stars: 2 } };
  assert.equal(totalStars(best), 2);
  assert.equal(isOpen(venueById('warehouse'), best), true);
  assert.equal(isOpen(venueById('beach'), best), false);
});

test('XP réparti par compétence, vinyles, récap', () => {
  const res = [{ type: 'pitch', ok: true }, { type: 'mood', ok: true }, { type: 'beat', ok: false }, { type: 'mood', ok: true }];
  const x = nightXp(res, 2);
  assert.deepEqual(x, { total: 29, skills: { oreille: 13, harmonie: 16 } });
  assert.equal(nightXp(res, 2, true).total, 49);
  assert.equal(nightXp(res, 0).total, 9);
  const v = venueById('bar');
  assert.equal(pressVinyl(v, 's', 0), null);
  const g = pressVinyl(v, 's', 3);
  assert.equal(g.kind, 'gold');
  assert.ok(v.genres.includes(g.genre));
  let crate = addToCrate({}, { genre: 'house', kind: 'color' });
  crate = addToCrate(crate, { genre: 'house', kind: 'black' });
  assert.deepEqual(crate.house, { n: 2, kind: 'color' });
  assert.deepEqual(nightConcepts(res).map((c) => c.type), ['beat', 'pitch', 'mood']);
});
