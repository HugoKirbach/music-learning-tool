// Parcours « Apprendre » : contenu cohérent (chaque exercice a une solution), progression, construction des leçons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NODES, nodeStates, unitStatus, courseProgress, buildLesson, buildCheckpoint, buildJump, buildPractice, checkAnswer,
  completeNode, applyJump, addMisses, xpFor, bonusDone, judgeTaps, resolvePatch, checkGrid, checkRoll, REQUIRED_TOTAL,
} from '../src/core/course.js';
import { mergeCourse } from '../src/core/coursemerge.js';
import { UNITS } from '../src/data/course.js';
import { GEN, rng, liveNote, liveName, parseChordName } from '../src/core/coursegen.js';
import { LIVE_ZONES, SHORTCUTS, comboFromEvent } from '../src/data/ableton.js';
import { paramById, setPath } from '../src/core/synthparams.js';
import { mergeStates } from '../src/core/merge.js';

const lessons = NODES.filter((n) => n.type === 'lesson');
const PART_OF = { control: 'control', browser: 'browser', session: 'session', arrangement: 'arrangement', clip: 'clip', device: 'device' };

/** Fabrique la bonne réponse d'un exercice (pour vérifier qu'il est faisable). */
function solve(it) {
  switch (it.t) {
    case 'mcq': case 'shortcut': return it.a;
    case 'order': return it.items;
    case 'blank': return it.answers;
    case 'number': return String(it.a).replace('.', ',');
    case 'live': return [].concat(it.target)[0];
    case 'keys': return it.exact ? it.target : [...(it.bass != null ? [48 + it.bass] : []), ...it.target.map((pc) => 60 + pc)];
    case 'grid': {
      if (it.rules) return null;
      return Object.fromEntries(it.rows.map((r) => [r, [...(it.target[r] || '')].map((c) => (c === 'x' ? 1 : c === 'g' ? 2 : 0))]));
    }
    case 'roll': return it.target ? it.target.map(([s, m]) => ({ s, m })) : null;
    case 'synth': {
      if (it.match) return resolvePatch(it.match);
      const p = resolvePatch(it.base);
      for (const [id, r] of Object.entries(it.ranges)) setPath(p, paramById(id).path, Array.isArray(r) ? (r[0] + r[1]) / 2 : r);
      return p;
    }
    default: return { ok: true };
  }
}

test('le parcours : 18 unités, chaque unité finit par un contrôle, identifiants uniques', () => {
  assert.equal(UNITS.length, 18);
  const ids = NODES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants en double');
  for (const u of UNITS) {
    assert.equal(u.nodes.at(-1).type, 'checkpoint', u.id);
    assert.ok(u.guide.length >= 3 && u.goal && u.color, u.id);
    assert.ok(u.nodes.filter((n) => n.type === 'lesson').length >= 3, `${u.id} : trop peu de leçons`);
  }
  assert.ok(lessons.length >= 80);
  // chaque ajout de pratique vise une vraie leçon
  return import('../src/data/course-more.js').then(({ MORE }) => { for (const id of Object.keys(MORE)) assert.equal(NODES.find((n) => n.id === id)?.type, 'lesson', id); });
});

test('chaque exercice de chaque leçon est valide et a une solution (plusieurs tirages)', () => {
  let count = 0;
  for (const seed of [1, 2, 3]) {
    for (const n of lessons) {
      const L = buildLesson(n.id, seed);
      assert.ok(L.items.length >= 4, `${n.id} : leçon trop courte`);
      assert.ok(L.items.some((it) => it.t !== 'card'), `${n.id} : aucun exercice`);
      for (const it of L.items) {
        const where = `${n.id} (${it.t}) ${it.q || it.title}`;
        if (it.t === 'card') { assert.ok(it.title && it.text, where); continue; }
        assert.ok(it.q, `${where} : consigne manquante`);
        if (it.t === 'mcq' || it.t === 'shortcut') {
          assert.ok(it.a >= 0 && it.a < it.choices.length, where);
          const labels = it.choices.map((c) => (typeof c === 'string' ? c : c.label));
          assert.equal(new Set(labels).size, labels.length, `${where} : propositions en double ${labels}`);
        }
        if (it.t === 'live') {
          for (const z of [].concat(it.target)) {
            assert.ok(LIVE_ZONES[z], `${where} : zone inconnue ${z}`);
            assert.ok(it.show.includes(PART_OF[LIVE_ZONES[z].part]), `${where} : la zone ${z} n’est pas affichée (${it.show})`);
          }
        }
        if (it.t === 'synth') for (const k of it.knobs) assert.ok(paramById(k), `${where} : potard inconnu ${k}`);
        if (it.t === 'pairs') assert.ok(it.pairs.length >= 3, where);
        const ans = solve(it);
        if (ans == null) continue; // exercices à règles : vérifiés plus bas
        assert.ok(checkAnswer(it, ans).ok, `${where} : la bonne réponse est refusée`);
        count++;
      }
    }
  }
  assert.ok(count > 1000, `seulement ${count} exercices vérifiés`);
});

test('les exercices à règles (grille, piano roll) acceptent une réponse correcte et refusent une mauvaise', () => {
  const fill = lessons.flatMap((n) => buildLesson(n.id, 1).items).find((it) => it.t === 'grid' && it.rules);
  const row = (steps) => Array.from({ length: 16 }, (_, i) => (steps.includes(i) ? 1 : 0));
  assert.ok(checkGrid(fill, { kick: row([0, 4, 8, 12]), snare: row([4, 12, 13, 14, 15]) }).ok);
  assert.equal(checkGrid(fill, { kick: row([0, 4, 8, 12]), snare: row([4, 12]) }).ok, false);
  const bass = lessons.flatMap((n) => buildLesson(n.id, 1).items).find((it) => it.t === 'roll' && it.chords);
  const good = [[0, 45], [4, 41], [8, 36], [12, 43]].map(([s, m]) => ({ s, m }));
  assert.ok(checkRoll(bass, good).ok);
  assert.equal(checkRoll(bass, [{ s: 0, m: 45 }, { s: 4, m: 43 }]).ok, false);
  const hook = lessons.flatMap((n) => buildLesson(n.id, 1).items).find((it) => it.t === 'roll' && it.rules?.some((r) => r.k === 'repeat'));
  const motif = [[0, 57], [2, 60], [4, 64]].map(([s, m]) => ({ s, m }));
  assert.ok(checkRoll(hook, [...motif, ...motif.map((n) => ({ s: n.s + 8, m: n.m }))]).ok);
  assert.equal(checkRoll(hook, [...motif, { s: 8, m: 59 }, { s: 10, m: 60 }]).ok, false, 'Si (59) hors penta');
  const rolling = lessons.flatMap((n) => buildLesson(n.id, 1).items).find((it) => it.t === 'roll' && it.rules?.some((r) => r.k === 'hasStep' && r.steps.length === 12));
  assert.ok(checkRoll(rolling, [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15].map((s) => ({ s, m: 45 }))).ok);
});

test('les contrôles et le test de saut piochent dans les leçons de l’unité', () => {
  for (const u of UNITS) {
    const cp = buildCheckpoint(u.id, 7);
    assert.equal(cp.hearts, 3);
    assert.ok(cp.items.length >= 10, `${u.id} : contrôle trop court`);
    assert.ok(cp.items.every((it) => it.t !== 'card'));
    const ids = new Set(u.nodes.map((n) => n.id));
    assert.ok(cp.items.every((it) => ids.has(it.src)), 'exercice venu d’une autre unité');
  }
  const jump = buildJump({}, 'u7', 3);
  assert.equal(jump.skipped.length, 6);
  assert.ok(jump.items.length >= 12);
  assert.equal(buildPractice({}), null, 'pas d’entraînement sans leçon faite');
});

test('progression : déblocage linéaire, bonus jamais bloquants, contrôle qui ouvre l’unité suivante', () => {
  let c = {};
  let st = nodeStates(c);
  assert.equal(st.current, 'u1-l1');
  assert.equal(st.states['u1-l2'], 'locked');
  c = completeNode(c, 'u1-l1', { acc: 100, perfect: true, day: '2026-11-09' });
  st = nodeStates(c);
  assert.equal(st.states['u1-l1'], 'perfect');
  assert.equal(st.current, 'u1-l2');
  for (const id of ['u1-l2', 'u1-l3', 'u1-l4']) c = completeNode(c, id, { acc: 80, day: '2026-11-09' });
  st = nodeStates(c);
  assert.equal(st.states['u1-lab-otf'], 'open', 'atelier bonus disponible');
  assert.equal(st.current, 'u1-cp', 'les bonus ne bloquent pas le contrôle');
  assert.equal(unitStatus(c, 'u2').open, false);
  c = completeNode(c, 'u1-cp', { acc: 90, day: '2026-11-09' });
  assert.equal(unitStatus(c, 'u1').complete, true);
  assert.equal(unitStatus(c, 'u2').open, true);
  assert.equal(nodeStates(c).current, 'u2-l1');
  const p = courseProgress(c);
  assert.equal(p.done, 5);
  assert.equal(p.total, REQUIRED_TOTAL);
  // rejouer garde le meilleur score
  c = completeNode(c, 'u1-l2', { acc: 95, perfect: true, day: '2026-11-10' });
  assert.deepEqual({ ...c.done['u1-l2'] }, { d: '2026-11-09', n: 2, best: 95, perfect: true });
});

test('test de saut : tout ce qui précède est validé ; erreurs et XP', () => {
  const c = applyJump({}, 'u7', '2026-11-09');
  assert.equal(nodeStates(c).current, 'u7-l1');
  assert.ok(c.done['u6-cp'].skipped);
  assert.equal(c.done['u1-lab-otf'], undefined, 'les bonus sautés restent à faire');
  assert.deepEqual(addMisses(addMisses({}, 'u1-l1', 2), 'u1-l1', 1).miss, { 'u1-l1': 3 });
  const lesson = NODES.find((n) => n.id === 'u1-l1');
  assert.ok(xpFor(lesson, { first: true, perfect: true }) > xpFor(lesson, { first: false }));
  assert.ok(xpFor(NODES.find((n) => n.type === 'checkpoint')) > xpFor(lesson));
  const practice = buildPractice({ done: { 'u1-l1': {}, 'u1-l2': {} }, miss: { 'u1-l2': 5 } }, 1);
  assert.ok(practice.items.length >= 6);
  assert.ok(practice.items.some((it) => it.src === 'u1-l2'));
});

test('ateliers : validés d’après le journal, les étoiles des jeux ou les exports', () => {
  const lab = NODES.find((n) => n.id === 'u5-lab-beat');
  const s = { course: { started: { [lab.id]: { at: 1000 } } }, log: [{ key: 'beat:free', t: 500 }] };
  assert.equal(bonusDone(s, lab), false, 'fait avant le lancement de l’atelier');
  s.log.push({ key: 'beat:constraint', t: 2000 });
  assert.equal(bonusDone(s, lab), true);
  const pads = NODES.find((n) => n.id === 'u1-lab-otf');
  assert.equal(bonusDone({ pads: { best: { otf: { stars: 2 } } } }, pads), true);
  const exp = NODES.find((n) => n.id === 'u17-lab-export');
  assert.equal(bonusDone({ course: { started: { [exp.id]: { at: 1, exports0: 3 } } }, stats: { exports: 4 } }, exp), true);
});

test('vérifications : clavier, nombres, taps', () => {
  const chord = { t: 'keys', mode: 'chord', target: [9, 0, 4], bass: 0 };
  assert.ok(checkAnswer(chord, [48, 57, 64]).ok, 'Am/C');
  assert.equal(checkAnswer(chord, [57, 60, 64]).ok, false, 'bonnes notes mais La en bas');
  assert.ok(checkAnswer({ t: 'keys', mode: 'note', target: [2] }, [74]).ok, 'n’importe quel Ré');
  assert.equal(checkAnswer({ t: 'keys', mode: 'note', exact: true, target: [36] }, [48]).ok, false, 'mauvaise octave');
  assert.ok(checkAnswer({ t: 'keys', mode: 'seq', target: [0, 4, 7] }, [60, 64, 67]).ok);
  assert.equal(checkAnswer({ t: 'keys', mode: 'seq', target: [0, 4, 7] }, [60, 67, 64]).ok, false);
  assert.ok(checkAnswer({ t: 'number', a: 468.75, tol: 2 }, '469').ok);
  assert.ok(checkAnswer({ t: 'number', a: 2, tol: 0.01 }, '2,0').ok);
  assert.equal(checkAnswer({ t: 'number', a: -12, tol: 0 }, 'abc').ok, false);
  const beats = [1, 1.5, 2, 2.5];
  assert.ok(judgeTaps([1.02, 1.49, 2.03, 2.48], beats).ok);
  assert.equal(judgeTaps([1.3, 1.8], beats).ok, false);
  assert.equal(judgeTaps([1, 1.1, 1.2, 1.5, 1.6, 2, 2.1, 2.5, 2.6], beats).ok, false, 'trop de frappes en trop');
});

test('générateurs : notes Ableton, accords, calculs', () => {
  assert.equal(liveNote('C3'), 60);
  assert.equal(liveNote('A0'), 33);
  assert.equal(liveName(36), 'C1');
  assert.deepEqual(parseChordName('Am7').pcs, [9, 0, 4, 7]);
  assert.deepEqual(parseChordName('F#m').pcs, [6, 9, 1]);
  const r = rng(5);
  for (const k of ['beatMs', 'eighthMs', 'dottedMs', 'barSec', 'lfoHz']) {
    const [q] = GEN.calc(r, { kinds: [k], n: 1, bpms: [120] });
    assert.equal(q.a, { beatMs: 500, eighthMs: 250, dottedMs: 375, barSec: 2, lfoHz: 2 }[k]);
  }
  const degs = GEN.degree(rng(1), { key: 'C', degrees: [3], n: 1 });
  assert.equal(degs[0].choices[0], 'F');
  assert.equal(GEN.degree(rng(1), { key: 'A', minor: true, degrees: [0], n: 1 })[0].choices[0], 'Am');
});

test('raccourcis : combinaisons tapées reconnues (QWERTY, AZERTY, Mac)', () => {
  const ev = (o) => ({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...o });
  assert.equal(comboFromEvent(ev({ key: 'd', code: 'KeyD', ctrlKey: true })), 'Mod+D');
  assert.equal(comboFromEvent(ev({ key: 'M', code: 'KeyM', metaKey: true, shiftKey: true })), 'Mod+Shift+M');
  assert.equal(comboFromEvent(ev({ key: 'Tab', code: 'Tab' })), 'Tab');
  assert.equal(comboFromEvent(ev({ key: 'Tab', code: 'Tab', shiftKey: true })), 'Shift+Tab');
  assert.equal(comboFromEvent(ev({ key: ' ', code: 'Space' })), 'Space');
  assert.equal(comboFromEvent(ev({ key: '&', code: 'Digit1', ctrlKey: true })), 'Mod+1', 'AZERTY');
  assert.equal(comboFromEvent(ev({ key: 'a', code: 'KeyQ', ctrlKey: true })), 'Mod+A', 'AZERTY : la touche A');
  assert.equal(comboFromEvent(ev({ key: '∫', code: 'KeyB', metaKey: true, altKey: true })), 'Mod+Alt+B', 'Option sur Mac');
  assert.equal(comboFromEvent(ev({ key: ',', code: 'KeyM', ctrlKey: true })), 'Mod+,', 'virgule AZERTY');
  assert.equal(comboFromEvent(ev({ key: 'Shift', code: 'ShiftLeft', shiftKey: true })), null);
  assert.equal(new Set(SHORTCUTS.map((s) => s.keys)).size, SHORTCUTS.length, 'raccourci en double');
});

test('synchro : la progression du parcours fusionne sans rien perdre', () => {
  const a = { done: { 'u1-l1': { d: '2026-11-01', n: 2, best: 80, perfect: false } }, miss: { 'u1-l1': 3 } };
  const b = { done: { 'u1-l1': { d: '2026-11-03', n: 1, best: 95, perfect: true }, 'u1-l2': { d: '2026-11-03', n: 1, best: 70 } }, miss: { 'u1-l1': 1 } };
  const m = mergeCourse(a, b);
  assert.deepEqual(m.done['u1-l1'], { d: '2026-11-01', n: 2, best: 95, perfect: true });
  assert.ok(m.done['u1-l2']);
  assert.equal(m.miss['u1-l1'], 3);
  const local = { xp: 50, updatedAt: 1, days: { x: {} }, course: a };
  const remote = { xp: 80, updatedAt: 2, days: { y: {} }, course: b };
  assert.ok(mergeStates(local, remote).course.done['u1-l2'], 'mergeStates garde le parcours des deux appareils');
});
