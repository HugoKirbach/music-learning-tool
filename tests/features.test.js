import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectBpm, detectKey, tapBpm, waveformPeaks } from '../src/core/audioanalysis.js';
import { genPhrase, scoreRepeat, scoreImprov, quantizeHits } from '../src/core/phrase.js';
import { reviewUpdate, dueItems, addDays } from '../src/core/srs.js';
import { newArrangement, arrangementToSong, arrangementEventsAt, ARR_CHALLENGES, TEMPLATES, BLOCKS } from '../src/core/arrangement.js';
import { buildMidi, parseMidi } from '../src/core/midi.js';
import { voiceProgression } from '../src/core/arrange.js';
import { gridFromPatterns } from '../src/core/rhythm.js';
import { GENRES } from '../src/data/genres.js';
import { PROGRAM } from '../src/data/program.js';
import { SCALES } from '../src/core/theory.js';

const SR = 22050;
function clickTrack(bpm, seconds, offset = 0.1) {
  const s = new Float32Array(SR * seconds);
  const period = 60 / bpm;
  for (let t = offset; t < seconds; t += period) {
    const i0 = Math.floor(t * SR);
    for (let i = 0; i < 2000 && i0 + i < s.length; i++) s[i0 + i] += Math.sin(i * 0.3) * Math.exp(-i / 300);
  }
  return s;
}

test('BPM : clics à 124 et 90 BPM', () => {
  for (const bpm of [124, 128, 90, 174, 140]) {
    const r = detectBpm(clickTrack(bpm, 20), SR, { min: 70, max: 180 });
    const ok = [bpm, bpm / 2, bpm * 2].some((b) => Math.abs(r.bpm - b) < 0.5);
    assert.ok(ok, `attendu ${bpm}, obtenu ${r.bpm}`);
  }
  assert.equal(tapBpm([0, 500, 1000, 1500]), 120);
  assert.equal(waveformPeaks(new Float32Array(1000), 10).length, 10);
});

test('Tonalité : accords de La mineur', () => {
  const s = new Float32Array(SR * 6);
  const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [57, 60, 64]];
  chords.forEach((c, k) => c.forEach((m) => {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    for (let i = k * 1.5 * SR; i < (k + 1) * 1.5 * SR; i++) s[i] += 0.2 * Math.sin((2 * Math.PI * f * i) / SR);
  }));
  const k = detectKey(s, SR);
  assert.ok((k.rootPc === 9 && k.mode === 'minor') || (k.rootPc === 0 && k.mode === 'major'), JSON.stringify(k));
});

test('Call & Response : génération et notation', () => {
  for (const kind of ['melody', 'bass', 'rhythm']) for (const level of [1, 5, 12]) {
    const p = genPhrase({ kind, rootPc: 9, scale: 'minor', chordPcs: [9, 0, 4], level });
    assert.ok(p.length >= 3 && p.every((n) => n.s >= 0 && n.s < 16));
    assert.equal(scoreRepeat(kind, p, p).score, 100);
  }
  const call = [{ s: 0, n: 69 }, { s: 4, n: 72 }, { s: 8, n: 71 }];
  assert.equal(scoreRepeat('melody', call, [{ s: 1, n: 57 }, { s: 4, n: 72 }]).detail.join(), 'late,ok,miss');
  const good = scoreImprov('melody', call, [{ s: 0, n: 69 }, { s: 4, n: 72 }, { s: 6, n: 74 }, { s: 12, n: 69 }], { rootPc: 9, chordPcs: [9, 0, 4], scaleSteps: SCALES.minor.steps });
  const bad = scoreImprov('melody', call, [{ s: 3, n: 70 }, { s: 13, n: 66 }], { rootPc: 9, chordPcs: [9, 0, 4], scaleSteps: SCALES.minor.steps });
  assert.ok(good.score > bad.score + 20, `${good.score} vs ${bad.score}`);
  const q = quantizeHits([{ t: 10.0 }, { t: 10.26 }, { t: 9.9 }], 10, 0.125);
  assert.deepEqual(q.map((h) => h.s), [0, 2]);
});

test('Révisions espacées', () => {
  const d = '2026-10-17';
  let e = reviewUpdate(undefined, false, d, false);
  assert.deepEqual(e, { box: 0, due: '2026-10-18' });
  assert.equal(dueItems({ 'intervals:7': e }, d).length, 0);
  assert.equal(dueItems({ 'intervals:7': e }, '2026-10-18')[0].value, '7');
  e = reviewUpdate(e, true, '2026-10-18', true);
  assert.deepEqual(e, { box: 1, due: '2026-10-20' });
  for (let i = 0; i < 4; i++) e = e && reviewUpdate(e, true, e.due, true);
  assert.equal(e, null);
  assert.equal(reviewUpdate(undefined, true, d, false), null);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(dueItems({ 'progressions:i – VI – III – VII': { box: 0, due: d } }, d)[0].value, 'i – VI – III – VII');
});

test('Arrangement : modèles, événements, export avec marqueurs, défis', () => {
  const g = GENRES[0];
  const project = { genre: g.id, bpm: g.bpm, rootPc: g.rootPc, scale: g.scale, chords: g.prog, ext: 3, voicing: 'lead', chordStyle: g.chordStyle, bassStyle: g.bassStyle, drums: gridFromPatterns(g.drums), melody: new Array(64).fill(null) };
  for (const t of Object.keys(TEMPLATES)) assert.equal(newArrangement(t).blocks.length, BLOCKS);
  const arr = newArrangement('club');
  const v = voiceProgression(project);
  assert.ok(arrangementEventsAt(project, v, arr, 0).drums.every((d) => d.id === 'kick'));
  const roll = arrangementEventsAt(project, v, arr, 5 * 64 + 60).drums.find((d) => d.id === 'snare');
  assert.ok(roll && roll.vel > 0.8);
  const song = arrangementToSong(project, arr);
  const parsed = parseMidi(buildMidi(song));
  assert.deepEqual(parsed.tracks[0].markers.map((m) => m.text), ['Intro', 'Build', 'Drop', 'Break', 'Build', 'Drop', 'Outro']);
  assert.equal(parsed.tracks[0].markers[1].beat, 64);
  const res = Object.fromEntries(ARR_CHALLENGES.map((c) => [c.id, c.check(arr)]));
  assert.deepEqual(res, { structure: true, tension: true, contrast: true, subtractive: true });
  assert.equal(ARR_CHALLENGES.find((c) => c.id === 'structure').check(newArrangement('loop')), false);
});

test('Programme : 4 semaines de 6 jours + projet', () => {
  assert.equal(PROGRAM.length, 4);
  for (const w of PROGRAM) {
    assert.equal(w.days.length, 6);
    assert.ok(w.project.checklist.length >= 5);
    for (const d of w.days) for (const s of d) assert.ok(s.key && s.route.startsWith('#/') && s.title, JSON.stringify(s));
  }
});

test('BPM : groove house avec hats à contretemps et pad tenu (piège des tempos lents)', () => {
  const sr = 22050, bpm = 124, beat = 60 / bpm;
  const s = new Float32Array(sr * 16);
  for (let i = 0; i < s.length; i++) s[i] += 0.12 * (2 * ((110 * i / sr) % 1) - 1); // pad saw continu
  let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let t = 0.3, k = 0; t < 15.5; t += beat, k++) {
    const a = Math.floor(t * sr), h = Math.floor((t + beat / 2) * sr);
    for (let i = 0; i < sr * 0.2; i++) s[a + i] += 0.7 * Math.sin(2 * Math.PI * (50 + 100 * Math.exp(-i / 125)) * i / sr) * Math.exp(-i / (0.06 * sr));
    for (let i = 0; i < sr * 0.25; i++) s[h + i] += 0.3 * rnd() * Math.exp(-i / (0.06 * sr));
  }
  const r = detectBpm(s, sr);
  assert.ok(Math.abs(r.bpm - 124) < 0.6, `obtenu ${r.bpm}`);
});
