import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLine, analyzeTimbre, timbreHints, serumRecipe, yin } from '../src/core/extract.js';

const SR = 22050;
const bpm = 120, sd = 60 / bpm / 4;
const osc = (wave, ph) => (wave === 'sine' ? Math.sin(2 * Math.PI * ph) : wave === 'square' ? (ph % 1 < 0.5 ? 1 : -1) * 0.6 : 2 * (ph % 1) - 1);

function render(lines, seconds, stereoWidth = 0) {
  const L = new Float32Array(SR * seconds), R = new Float32Array(SR * seconds);
  for (const { notes, wave, amp, start, pluck = false, detune = 0 } of lines) {
    for (const n of notes) {
      const f = 440 * Math.pow(2, (n.n - 69) / 12);
      const a = Math.floor((start + n.s * sd) * SR), len = Math.floor(n.len * sd * SR);
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        const e = Math.min(1, i / (0.004 * SR)) * (pluck ? Math.exp(-t / 0.08) : 1) * Math.min(1, (len - i) / (0.005 * SR));
        const l = osc(wave, f * t * (1 + detune)) * amp * e, r = osc(wave, f * t * (1 - detune)) * amp * e;
        L[a + i] += l; R[a + i] += stereoWidth ? r : l;
      }
    }
  }
  return { L, R };
}

const bassNotes = [{ s: 0, n: 33, len: 4 }, { s: 4, n: 36, len: 4 }, { s: 8, n: 40, len: 4 }, { s: 12, n: 43, len: 4 }];
const leadNotes = [{ s: 0, n: 69, len: 2 }, { s: 3, n: 72, len: 3 }, { s: 6, n: 76, len: 2 }, { s: 10, n: 74, len: 4 }];
const four = (arr) => [0, 1, 2, 3].flatMap((b) => arr.map((x) => ({ ...x, s: x.s + b * 16 })));

test('YIN : 55 Hz et 220 Hz', () => {
  for (const f of [55, 110, 220]) {
    const s = new Float32Array(4096).map((_, i) => osc('sawtooth', (f * i) / SR));
    assert.ok(Math.abs(yin(s, 0, 2048, SR, 30, 500).f0 - f) < f * 0.02);
  }
});

test('Extraction basse + lead dans un mix', () => {
  const { L, R } = render([
    { notes: four(bassNotes), wave: 'sawtooth', amp: 0.5, start: 0.5 },
    { notes: four(leadNotes), wave: 'square', amp: 0.25, start: 0.5, pluck: true },
  ], 10);
  const mono = L.map((v, i) => (v + R[i]) / 2);
  const bass = extractLine(mono, SR, { start: 0.5, stepDur: sd, kind: 'bass', rootPc: 9, scale: 'minor' });
  const hitB = four(bassNotes).filter((t) => bass.notes.some((n) => n.s === t.s && n.n === t.n)).length;
  assert.ok(hitB >= 14, `basse : ${hitB}/16 — ${JSON.stringify(bass.notes.slice(0, 6))}`);
  const lead = extractLine(mono, SR, { start: 0.5, stepDur: sd, kind: 'lead', rootPc: 9, scale: 'minor' });
  const hitL = four(leadNotes).filter((t) => lead.notes.some((n) => Math.abs(n.s - t.s) <= 1 && n.n === t.n)).length;
  assert.ok(hitL >= 12, `lead : ${hitL}/16 — ${JSON.stringify(lead.notes.slice(0, 6))}`);
});

test('Timbre : saw tenue vs carré pluck vs sinus', () => {
  const cases = [['sawtooth', false], ['square', true], ['sine', false]];
  for (const [wave, pluck] of cases) {
    const notes = [{ s: 0, n: 57, len: 8 }];
    const { L, R } = render([{ notes, wave, amp: 0.4, start: 0.2, pluck }], 3);
    const { params, features } = analyzeTimbre(L, R, SR, { notes, start: 0.2, stepDur: sd, kind: 'lead' });
    assert.equal(features.wave, wave, JSON.stringify(features.harmonics));
    assert.equal(features.isPluck, pluck, `${wave} sustain ${features.sustain}`);
    assert.ok(params.amp && timbreHints(features, params, 'lead').length === 4 && serumRecipe(params, 'lead').length >= 4);
  }
});

test('Timbre : largeur stéréo détectée', () => {
  const notes = [{ s: 0, n: 57, len: 8 }];
  const narrow = render([{ notes, wave: 'sawtooth', amp: 0.4, start: 0.2 }], 3);
  const wide = render([{ notes, wave: 'sawtooth', amp: 0.4, start: 0.2, detune: 0.004 }], 3, 1);
  const a = analyzeTimbre(narrow.L, narrow.R, SR, { notes, start: 0.2, stepDur: sd, kind: 'lead' });
  const b = analyzeTimbre(wide.L, wide.R, SR, { notes, start: 0.2, stepDur: sd, kind: 'lead' });
  assert.ok(b.features.width > a.features.width + 0.2 && b.params.osc[0].voices > 1, `${a.features.width} vs ${b.features.width}`);
});

test('Mix réaliste : basse saw mono + lead carré pluck stéréo + kick → timbres distincts', () => {
  const sr = SR;
  const { L, R } = render([
    { notes: four(bassNotes), wave: 'sawtooth', amp: 0.35, start: 0.5 },
    { notes: four(leadNotes), wave: 'square', amp: 0.25, start: 0.5, pluck: true, detune: 0.003 },
  ], 10, 1);
  for (let b = 0; b < 16; b++) { // kick à chaque temps
    const a = Math.floor((0.5 + b * 4 * sd) * sr);
    for (let i = 0; i < sr * 0.15; i++) { const v = 0.5 * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-i / 150)) * i / sr) * Math.exp(-i / (0.05 * sr)); L[a + i] += v; R[a + i] += v; }
  }
  const mono = L.map((v, i) => (v + R[i]) / 2);
  const opts = { start: 0.5, stepDur: sd, rootPc: 9, scale: 'minor' };
  const bass = extractLine(mono, sr, { ...opts, kind: 'bass' });
  const lead = extractLine(mono, sr, { ...opts, kind: 'lead', avoid: bass.notes });
  const hitL = four(leadNotes).filter((t) => lead.notes.some((n) => Math.abs(n.s - t.s) <= 1 && n.n === t.n)).length;
  // Limite connue : une note de lead à l'octave exacte de la basse se confond avec ses harmoniques
  assert.ok(hitL >= 11, `lead : ${hitL}/16 ${JSON.stringify(lead.notes.slice(0, 5))}`);
  const tb = analyzeTimbre(L, R, sr, { notes: bass.notes, start: 0.5, stepDur: sd, kind: 'bass' });
  const tl = analyzeTimbre(L, R, sr, { notes: lead.notes, start: 0.5, stepDur: sd, kind: 'lead', avoid: bass.notes });
  assert.equal(tb.features.wave, 'sawtooth', `basse ${JSON.stringify(tb.features.harmonics)}`);
  assert.ok(tb.features.width < 0.15 && tb.params.osc[0].voices === 1, `largeur basse ${tb.features.width}`);
  assert.ok(!tb.features.isPluck, `basse sustain ${tb.features.sustain}`);
  assert.equal(tl.features.wave, 'square', `lead ${JSON.stringify(tl.features.harmonics)}`);
  assert.ok(tl.features.isPluck && tl.features.attack < 0.05, `lead sustain ${tl.features.sustain} attack ${tl.features.attack}`);
  assert.ok(tl.features.width > 0.15, `largeur lead ${tl.features.width}`);
});
