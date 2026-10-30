import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteTimes, barsSeconds, tapTempo, camelot, fromCamelot, compatibleKeys, nearestNote, lowNotes, keyChords } from '../src/core/toolbox.js';

test('boîte à outils : temps de note au tempo', () => {
  const t = noteTimes(120);
  assert.equal(t.find((x) => x.label === '1/4').straight, 500);
  assert.equal(t.find((x) => x.label === '1/8').dotted, 375);
  assert.ok(Math.abs(t.find((x) => x.label === '1/8').triplet - 166.67) < 0.01);
  assert.equal(t.find((x) => x.label === '1/4').hz, 2);
  assert.equal(barsSeconds(120, 4), 8);
});

test('boîte à outils : tap tempo robuste à une frappe ratée', () => {
  const taps = [0, 500, 1000, 1500, 1720, 2000, 2500];
  assert.equal(tapTempo([0, 500]), null);
  assert.equal(tapTempo([0, 500, 1000, 1500, 2000]), 120);
  assert.ok(Math.abs(tapTempo(taps) - 120) < 1);
});

test('boîte à outils : roue Camelot', () => {
  assert.equal(camelot(0, false).code, '8B'); // Do
  assert.equal(camelot(9, true).code, '8A'); // La mineur
  assert.equal(camelot(5, true).code, '4A'); // Fa mineur
  assert.equal(camelot(7, true).code, '6A'); // Sol mineur
  assert.equal(camelot(11, false).code, '1B'); // Si
  for (let pc = 0; pc < 12; pc++) for (const minor of [false, true]) {
    const c = camelot(pc, minor);
    assert.deepEqual(fromCamelot(c.num, c.letter), { pc, minor });
  }
  const comp = compatibleKeys(9, true).map((x) => x.code);
  assert.deepEqual(comp, ['8A', '9A', '7A', '8B', '10A']);
  assert.deepEqual(compatibleKeys(9, true)[3], { pc: 0, minor: false, code: '8B', why: 'Relatif majeur : mêmes notes, plus lumineux' });
});

test('boîte à outils : fréquences et accords', () => {
  assert.deepEqual(nearestNote(440), { midi: 69, cents: 0, freq: 440 });
  assert.equal(nearestNote(43.65).midi, 29); // F0 (Ableton)
  const fa = lowNotes(5, true);
  assert.equal(fa.find((x) => x.midi === 29).role, 'tonique');
  assert.equal(fa.find((x) => x.midi === 36).role, 'quinte');
  assert.deepEqual(keyChords(5, true).map((c) => c.symbol), ['Fm', 'Gdim', 'G#', 'A#m', 'Cm', 'C#', 'D#']);
  assert.equal(keyChords(0, false, 4)[4].symbol, 'G7');
});
