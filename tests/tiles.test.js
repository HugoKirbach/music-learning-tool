import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, parseChord, parseSeq, buildChart, keyRange, whiteKeys, TileGame, DIFFS, randomLevel, noteLabel, starsFor } from '../src/core/tiles.js';
import { LEVELS, CHAPTERS } from '../src/data/rush.js';

test('notes et accords', () => {
  assert.equal(parseNote('C4'), 60);
  assert.equal(parseNote('F#3'), 54);
  assert.equal(parseNote('Bb4'), 70);
  assert.deepEqual(parseChord('Am7').notes, [57, 60, 64, 67]);
  assert.deepEqual(parseChord('C').notes, [60, 64, 67]);
  assert.deepEqual(parseChord('G7/3').notes, [55, 59, 62, 65]);
  assert.equal(parseChord('F#m/3').label, 'F♯m');
  assert.equal(noteLabel(61, 'both'), 'Do♯ · C♯');
});

test('parseSeq : durées, silences, fractions', () => {
  const p = parseSeq('C4:1 -:0.5 E4+G4=X:1/3 | @F:2');
  assert.equal(p.events.length, 3);
  assert.equal(p.events[1].beat, 1.5);
  assert.equal(p.events[1].label, 'X');
  assert.ok(Math.abs(p.beats - (3.5 + 1 / 3)) < 1e-9);
});

test('tous les niveaux : syntaxe, mesures complètes, tessiture jouable au clavier PC', () => {
  const ids = new Set();
  for (const l of LEVELS) {
    assert.ok(!ids.has(l.id), l.id); ids.add(l.id);
    assert.ok(CHAPTERS.some((c) => c.id === l.ch), l.id);
    assert.ok(l.intro && l.outro && l.studio && l.points.length >= 2, l.id);
    const c = buildChart(l, DIFFS.normal);
    const beats = c.beats - (l.pickup || 0);
    assert.ok(Math.abs(beats / c.meter - Math.round(beats / c.meter)) < 1e-6, `${l.id} : mesures incomplètes (${c.beats} temps)`);
    const r = keyRange(c.lo, c.hi);
    assert.ok(whiteKeys(r.lo, r.hi).length <= 11, `${l.id} : ${whiteKeys(r.lo, r.hi).length} touches blanches`);
    assert.ok(c.notes.length >= 8, l.id);
  }
});

test('jeu : parfait, raté, fausse note, note tenue', () => {
  const chart = buildChart({ bpm: 60, seq: 'C4:1 D4:1 E4:2 F4:1' }, DIFFS.normal);
  const g = new TileGame(chart, DIFFS.normal);
  assert.equal(g.press(60, 0.01).grade, 'perfect');
  assert.equal(g.press(70, 0.5).type, 'wrong');
  g.update(1.5); // D4 raté
  assert.equal(g.notes[1].state, 'miss');
  const h = g.press(64, 2.08);
  assert.equal(h.grade, 'good');
  assert.ok(chart.notes[2].hold);
  g.release(64, 3.9); // tenue jusqu'au bout (tolérance)
  assert.equal(g.notes[2].held, 1);
  g.press(65, 4);
  const r = g.results();
  assert.equal(r.total, 4);
  assert.equal(r.miss, 1);
  assert.equal(r.wrong, 1);
  assert.ok(r.acc > 50 && r.acc < 80, String(r.acc));
  assert.deepEqual(r.weakBars, [1]);
});

test('note tenue relâchée trop tôt : crédit partiel', () => {
  const chart = buildChart({ bpm: 60, seq: 'C4:4' }, DIFFS.normal);
  const g = new TileGame(chart, DIFFS.normal);
  g.press(60, 0);
  g.release(60, 1);
  assert.ok(g.notes[0].held > 0.2 && g.notes[0].held < 0.3);
  assert.equal(g.results().shortHolds, 1);
});

test('accords : chaque note jugée, octave libre au MIDI', () => {
  const chart = buildChart({ bpm: 60, seq: '@C:1' }, DIFFS.normal);
  const g = new TileGame(chart, DIFFS.normal);
  g.press(60, 0); g.press(64 + 12, 0.02, { octaveFree: true }); g.press(67, -0.03);
  assert.equal(g.results().acc, 100);
  assert.equal(starsFor(100), 3);
});

test('rythmes aléatoires : valides pour chaque difficulté', () => {
  for (const d of Object.keys(DIFFS)) {
    for (let s = 1; s < 20; s++) {
      const l = randomLevel(d, s);
      const c = buildChart(l, DIFFS[d]);
      assert.ok(Math.abs(c.beats - 32) < 1e-6, `${d}/${s} : ${c.beats}`);
      const r = keyRange(c.lo, c.hi);
      assert.ok(whiteKeys(r.lo, r.hi).length <= 11);
    }
  }
});

test('niveaux « stabs » : aucune note tenue', async () => {
  const { levelById } = await import('../src/data/rush.js');
  assert.ok(buildChart(levelById('house'), DIFFS.normal).notes.every((n) => !n.hold));
  assert.ok(buildChart(levelById('pulse'), DIFFS.normal).notes.every((n) => n.hold));
});
