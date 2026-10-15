import { test } from 'node:test';
import assert from 'node:assert/strict';
import { degreeChord, slotChord, detectChord, voiceLead, scaleNotes, midiToName, romanFor, qualityFromIntervals, SCALES, HEPTATONIC } from '../src/core/theory.js';

test('convention Ableton : C3 = 60', () => {
  assert.equal(midiToName(60), 'C3');
  assert.equal(midiToName(69), 'A3');
});

test('accords diatoniques de C majeur', () => {
  const names = [0, 1, 2, 3, 4, 5, 6].map((d) => slotChord(0, 'major', { deg: d }).symbol);
  assert.deepEqual(names, ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
  const romans = [0, 1, 2, 3, 4, 5, 6].map((d) => slotChord(0, 'major', { deg: d }).roman);
  assert.deepEqual(romans, ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
});

test('accords de 7e en A mineur', () => {
  assert.equal(slotChord(9, 'minor', { deg: 0 }, 4).symbol, 'Am7');
  assert.equal(slotChord(9, 'minor', { deg: 2 }, 4).symbol, 'Cmaj7');
  assert.equal(slotChord(9, 'minor', { deg: 4 }, 4).symbol, 'Em7');
});

test('emprunt modal : V majeur du mineur harmonique', () => {
  const c = slotChord(9, 'minor', { deg: 4, mode: 'harmonicMinor' });
  assert.equal(c.symbol, 'E');
  assert.equal(c.roman, 'V');
  assert.equal(c.borrowed, true);
});

test('toutes les triades diatoniques sont reconnues', () => {
  for (const sc of HEPTATONIC) for (let d = 0; d < 7; d++) for (const size of [3, 4]) {
    const c = degreeChord(0, sc, d, size);
    assert.ok(c.quality, `${sc} degré ${d} taille ${size} : ${c.intervals}`);
  }
});

test('détection d’accord joué (avec renversement)', () => {
  assert.equal(detectChord([60, 64, 67]).symbol, 'C');
  assert.equal(detectChord([57, 60, 64, 67]).symbol, 'Am7');
  assert.equal(detectChord([64, 67, 72]).symbol, 'C/E');
  assert.equal(detectChord([60]), null);
});

test('voice leading : mouvement minimal', () => {
  const c = voiceLead(null, [0, 4, 7]);
  const f = voiceLead(c, [5, 9, 0]);
  const moved = f.reduce((s, n, i) => s + Math.abs(n - [...c].sort((a, b) => a - b)[i]), 0);
  assert.ok(moved <= 4, `déplacement total ${moved}`);
});

test('gammes', () => {
  assert.deepEqual(scaleNotes(0, 'pentaMinor', 60, 72), [60, 63, 65, 67, 70, 72]);
  assert.equal(Object.keys(SCALES).length, 10);
  assert.equal(romanFor(0, 10, qualityFromIntervals([0, 4, 7])), 'bVII');
});

test('chiffrage en mineur : degrés sans altération, emprunts altérés', () => {
  assert.deepEqual([0, 5, 2, 6].map((d) => slotChord(9, 'minor', { deg: d }).roman), ['i', 'VI', 'III', 'VII']);
  assert.equal(slotChord(0, 'major', { deg: 5, mode: 'minor' }).roman, 'bVI');
  assert.equal(slotChord(0, 'major', { deg: 3, mode: 'minor' }).roman, 'iv');
});
