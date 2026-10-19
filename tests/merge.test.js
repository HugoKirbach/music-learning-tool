import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeStates, isPristine } from '../src/core/merge.js';

const baseState = () => ({
  v: 1, xp: 0, skills: { rythme: 0 }, stats: { exercises: 0 }, streak: { count: 0, last: null, best: 0 }, days: {}, badges: {},
  genres: {}, missions: {}, later: [], notebook: [], project: { genre: 'house' }, settings: { onboarded: false }, review: {},
  program: { startedAt: null, done: {} }, log: [], customDice: [], updatedAt: 0,
});

test('fusion : rien de gagné n\'est perdu, le reste vient du plus récent', () => {
  const pc = { ...baseState(), xp: 300, skills: { rythme: 120 }, updatedAt: 100, project: { genre: 'techno' },
    days: { '2026-10-17': { xp: 100, sessions: 1, exercises: 3, skills: { rythme: 50 } } },
    badges: { first: '2026-10-10' }, notebook: [{ id: 1, date: 10, title: 'A' }], streak: { count: 3, last: '2026-10-17', best: 3 },
    log: [{ d: '2026-10-17', key: 'beat', xp: 20 }], rush: { best: { lune: { stars: 2, acc: 85 } }, learn: { lune: 3 }, lang: 'fr' },
    program: { startedAt: '2026-10-01', done: { 0: '2026-10-01' } }, settings: { onboarded: true, volume: 0.5 } };
  const tel = { ...baseState(), xp: 250, skills: { rythme: 200 }, updatedAt: 200, project: { genre: 'dnb' },
    days: { '2026-10-17': { xp: 40, sessions: 2, exercises: 1 }, '2026-10-18': { xp: 60, sessions: 1, exercises: 2 } },
    badges: { first: '2026-10-12', streak3: '2026-10-18' }, notebook: [{ id: 2, date: 20, title: 'B' }], streak: { count: 4, last: '2026-10-18', best: 4 },
    log: [{ d: '2026-10-17', key: 'beat', xp: 20 }, { d: '2026-10-18', key: 'ear', xp: 10 }],
    rush: { best: { lune: { stars: 3, acc: 80 }, joie: { stars: 1, acc: 62 } }, learn: { lune: 1, joie: 2 }, lang: 'en' },
    program: { startedAt: '2026-10-03', done: { 1: '2026-10-02' } }, settings: { onboarded: true, volume: 0.9 } };
  const m = mergeStates(pc, tel);
  assert.equal(m.xp, 300);
  assert.equal(m.skills.rythme, 200);
  assert.deepEqual(m.days['2026-10-17'], { xp: 100, sessions: 2, exercises: 3, skills: { rythme: 50 } });
  assert.ok(m.days['2026-10-18']);
  assert.equal(m.badges.first, '2026-10-10');
  assert.ok(m.badges.streak3);
  assert.deepEqual(m.notebook.map((x) => x.id), [2, 1]);
  assert.equal(m.streak.count, 4);
  assert.equal(m.log.length, 2);
  assert.deepEqual(m.rush.best.lune, { stars: 3, acc: 85 });
  assert.equal(m.rush.learn.joie, 2);
  assert.equal(m.rush.lang, 'en');
  assert.equal(m.project.genre, 'dnb'); // le plus récent
  assert.equal(m.settings.volume, 0.9);
  assert.equal(m.program.startedAt, '2026-10-01');
  assert.deepEqual(Object.keys(m.program.done).sort(), ['0', '1']);
  assert.deepEqual(mergeStates(tel, pc), { ...m, notebook: m.notebook }); // symétrique
});

test('fusion : une idée supprimée ne revient pas', () => {
  const a = { ...baseState(), xp: 10, notebook: [{ id: 1, date: 1 }, { id: 2, date: 2 }], updatedAt: 1 };
  const b = { ...baseState(), xp: 10, notebook: [{ id: 2, date: 2 }], deleted: [1], updatedAt: 2 };
  assert.deepEqual(mergeStates(a, b).notebook.map((x) => x.id), [2]);
});

test('fusion : un appareil vierge prend tout', () => {
  const full = { ...baseState(), xp: 50, updatedAt: 5 };
  assert.ok(isPristine(baseState()));
  assert.equal(mergeStates(baseState(), full), full);
  assert.equal(mergeStates(full, baseState()), full);
});

test('fusion à trois voies : une modification d\'un seul côté n\'est jamais écrasée', () => {
  const base = { ...baseState(), xp: 10, project: { genre: 'house', bpm: 124, melody: [1] }, settings: { onboarded: true, volume: 0.8 }, updatedAt: 1 };
  const pc = { ...base, project: { ...base.project, bpm: 137 }, updatedAt: 5 };            // le PC change le tempo
  const tel = { ...base, project: { ...base.project, melody: [2] }, settings: { onboarded: true, volume: 0.3 }, notebook: [{ id: 9, date: 9 }], updatedAt: 6 }; // le téléphone (plus récent) change la mélodie
  const m = mergeStates(pc, tel, base);
  assert.equal(m.project.bpm, 137);
  assert.deepEqual(m.project.melody, [2]);
  assert.equal(m.settings.volume, 0.3);
  assert.deepEqual(m.notebook.map((x) => x.id), [9]);
  // sans base : le plus récent gagne champ par champ quand les deux ont changé
  const both = mergeStates({ ...pc, project: { ...pc.project, melody: [3] } }, tel, base);
  assert.deepEqual(both.project.melody, [2]);
  assert.equal(both.project.bpm, 137);
});

test('Nuit au club : meilleures nuits, vinyles et set du jour fusionnés', () => {
  const a = { xp: 10, updatedAt: 1, club: { best: { bar: { stars: 3, score: 900 } }, crate: { house: { n: 2, kind: 'black' } }, nights: 4, daily: { day: '2026-10-19', score: 500 }, vib: false } };
  const b = { xp: 12, updatedAt: 2, club: { best: { bar: { stars: 2, score: 1200 }, warehouse: { stars: 1, score: 300 } }, crate: { house: { n: 1, kind: 'gold' }, trap: { n: 1, kind: 'color' } }, nights: 3, daily: { day: '2026-10-19', score: 800 }, vib: true } };
  const m = mergeStates(a, b);
  assert.deepEqual(m.club.best, { bar: { stars: 3, score: 1200 }, warehouse: { stars: 1, score: 300 } });
  assert.deepEqual(m.club.crate, { house: { n: 2, kind: 'gold' }, trap: { n: 1, kind: 'color' } });
  assert.equal(m.club.nights, 4);
  assert.equal(m.club.daily.score, 800);
});
