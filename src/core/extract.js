// Extraction d'éléments d'un morceau (ligne de basse, lead) et analyse de leur timbre → preset de correction.
// Approche sans IA (hors-ligne, sur l'appareil) : isolation par bandes de fréquences, détection de hauteur
// (YIN pour la basse, saillance harmonique pour le lead), puis mesure des harmoniques, de la brillance,
// de l'enveloppe, de la largeur stéréo et du vibrato. Résultat approximatif : à valider à l'oreille. Module pur.
import { withDefaults } from '../data/presets.js';
import { SCALES, mod } from './theory.js';
import { fft } from './audioanalysis.js';

// ---------- Filtres (biquads RBJ, hors-ligne) ----------
function biquad(samples, sr, type, freq, q = 0.707) {
  const w = (2 * Math.PI * freq) / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; } else { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
  const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y; x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

/** Garde une bande de fréquences (pentes 24 dB/oct). */
export function bandPass(samples, sr, low, high) {
  let s = samples;
  if (high) high = Math.min(high, sr * 0.45);
  if (low) s = biquad(biquad(s, sr, 'highpass', low), sr, 'highpass', low);
  if (high) s = biquad(biquad(s, sr, 'lowpass', high), sr, 'lowpass', high);
  return s;
}

// ---------- FFT ----------
export function magnitudeSpectrum(samples, start, size) {
  const re = new Float64Array(size), im = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    const v = samples[start + i] || 0;
    re[i] = v * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  fft(re, im);
  const mag = new Float64Array(size / 2);
  for (let i = 0; i < size / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}

// ---------- Hauteur ----------
/** YIN : fréquence fondamentale d'une trame monophonique. */
export function yin(samples, start, size, sr, fmin = 30, fmax = 1000, thresh = 0.15) {
  const maxTau = Math.min(Math.floor(sr / fmin), Math.floor(size / 2));
  const minTau = Math.max(2, Math.floor(sr / fmax));
  const d = new Float64Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let i = 0; i < size - maxTau; i++) { const x = (samples[start + i] || 0) - (samples[start + i + tau] || 0); s += x * x; }
    d[tau] = s;
  }
  let run = 0;
  const cmnd = new Float64Array(maxTau + 1); cmnd[0] = 1;
  for (let tau = 1; tau <= maxTau; tau++) { run += d[tau]; cmnd[tau] = run ? (d[tau] * tau) / run : 1; }
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (cmnd[t] < thresh) { while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t++; tau = t; break; }
  }
  if (tau < 0) {
    let best = minTau;
    for (let t = minTau; t <= maxTau; t++) if (cmnd[t] < cmnd[best]) best = t;
    if (cmnd[best] > 0.4) return { f0: 0, conf: 0 };
    tau = best;
  }
  const a = cmnd[tau - 1] ?? cmnd[tau], b = cmnd[tau], c = cmnd[tau + 1] ?? cmnd[tau];
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
  return { f0: sr / (tau + (Math.abs(shift) < 1 ? shift : 0)), conf: 1 - b };
}

const freqToMidi = (f) => 69 + 12 * Math.log2(f / 440);
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Note la plus saillante (somme pondérée des harmoniques) dans un spectre. */
function salientNote(mag, sr, size, lo, hi) {
  const binOf = (f) => (f * size) / sr;
  const at = (f) => { const b = binOf(f); const i = Math.floor(b); return i + 1 < mag.length ? Math.max(mag[i], mag[i + 1]) : 0; };
  let best = { m: 0, s: 0 }, total = 0, count = 0;
  for (let m = lo; m <= hi; m++) {
    const f = midiToFreq(m);
    let s = 0;
    for (let h = 1; h <= 5; h++) s += at(f * h) * Math.pow(0.75, h - 1);
    total += s; count++;
    if (s > best.s) best = { m, s };
  }
  // Correction d'octave : fondamentale quasi absente mais octave forte → la vraie note est une octave plus haut
  let m = best.m;
  while (m + 12 <= hi && at(midiToFreq(m)) < 0.3 * at(midiToFreq(m) * 2)) m += 12;
  return { midi: m, conf: best.s / ((total / count) || 1) };
}

function snapToScale(m, rootPc, scale) {
  if (rootPc == null || !SCALES[scale]) return m;
  const steps = SCALES[scale].steps;
  if (steps.includes(mod(m - rootPc, 12))) return m;
  return steps.includes(mod(m + 1 - rootPc, 12)) ? m + 1 : m - 1;
}

/**
 * Relève une ligne (basse ou lead) sur une région de 4 mesures (64 doubles-croches).
 * @param {Float32Array} samples mono
 * @returns {{notes:{s:number,n:number,len:number}[], conf:number, band:Float32Array}}
 */
export function extractLine(samples, sr, { start, stepDur, steps = 64, kind = 'bass', rootPc = null, scale = 'minor', avoid = null }) {
  const s0 = Math.max(0, Math.floor(start * sr) - sr);
  const s1 = Math.min(samples.length, Math.floor((start + stepDur * steps) * sr) + sr);
  const seg = samples.subarray(s0, s1);
  const band = kind === 'bass' ? bandPass(seg, sr, 30, 300) : bandPass(seg, sr, 280, 5000);
  const off = Math.floor(start * sr) - s0;
  const stepLen = Math.floor(stepDur * sr);
  const frame = 4096;
  const rms = [];
  for (let k = 0; k < steps; k++) {
    const a = off + k * stepLen;
    let e = 0;
    for (let i = 0; i < stepLen; i += 2) { const v = band[a + i] || 0; e += v * v; }
    rms.push(Math.sqrt(e / (stepLen / 2)));
  }
  const maxR = Math.max(...rms, 1e-9);
  // Basse : décimation (bande < 300 Hz) pour une détection de hauteur rapide et précise
  const D = kind === 'bass' ? Math.max(1, Math.floor(sr / 5500)) : 1;
  const low = D > 1 ? band.filter((_, i) => i % D === 0) : band;
  const per = [];
  const residual = new Array(steps).fill(0);
  let confSum = 0, confN = 0;
  for (let k = 0; k < steps; k++) {
    if (rms[k] < maxR * 0.12) { per.push(null); continue; }
    const center = off + k * stepLen + Math.floor(stepLen * 0.35);
    let midi, conf;
    if (kind === 'bass') {
      // Fenêtre entièrement dans la double-croche (évite de mélanger avec la note précédente), signal décimé
      const a = Math.floor((off + k * stepLen + stepLen * 0.2) / D);
      const size = Math.min(Math.floor((stepLen * 0.75) / D), 1024);
      const r = yin(low, a, size, sr / D, 35, 330, 0.2);
      if (!r.f0) { per.push(null); continue; }
      midi = Math.round(freqToMidi(r.f0)); conf = r.conf;
    } else {
      const mag = magnitudeSpectrum(band, Math.max(0, center - frame / 2), frame);
      // Atténue les harmoniques de la basse jouée à ce moment (une basse saw « pollue » tout le médium)
      const bn = avoid && avoid.find((x) => k >= x.s && k < x.s + x.len);
      if (bn) {
        const fb = midiToFreq(bn.n);
        for (let h = 2; h * fb < 6000; h++) {
          const bin = Math.round((h * fb * frame) / sr);
          for (let d = -1; d <= 1; d++) if (mag[bin + d] != null) mag[bin + d] *= 0.12;
        }
      }
      const r = salientNote(mag, sr, frame, 61, 92); // bande du lead ≥ 280 Hz
      midi = r.midi; conf = Math.max(0, Math.min(1, (r.conf - 1) / 4));
      let resid = 0;
      for (let i = Math.floor((280 * frame) / sr); i < Math.min(mag.length, Math.floor((5000 * frame) / sr)); i++) resid += mag[i];
      residual[k] = resid;
    }
    if (rootPc != null) midi = snapToScale(midi, rootPc, scale);
    confSum += conf; confN++;
    per.push({ midi, conf, onset: k > 0 && rms[k] > (rms[k - 1] || 0) * 1.6 });
  }
  // Lead : on ne garde que les pas où la hauteur est nette (sinon c'est le fond qui ressort)
  if (kind === 'lead') {
    const confs = per.filter(Boolean).map((p) => p.conf).sort((a, b) => a - b);
    const ref = confs[Math.floor(confs.length * 0.9)] || 0;
    const maxRes = Math.max(...residual, 1e-9);
    for (let k = 0; k < steps; k++) if (per[k] && (per[k].conf < ref * 0.5 || residual[k] < maxRes * 0.22)) per[k] = null;
  }
  // Fusion des pas consécutifs de même hauteur → notes
  const notes = [];
  for (let k = 0; k < steps; k++) {
    const p = per[k];
    if (!p) continue;
    const last = notes[notes.length - 1];
    if (last && last.n === p.midi && last.s + last.len === k && !p.onset) { last.len++; last.conf = (last.conf * (last.len - 1) + p.conf) / last.len; }
    else notes.push({ s: k, n: p.midi, len: 1, conf: p.conf });
  }
  return { notes, conf: confN ? confSum / confN : 0, band, bandOffset: off };
}

// ---------- Timbre ----------
function goertzel(samples, start, size, sr, f) {
  const c = 2 * Math.cos((2 * Math.PI * f) / sr);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < size; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    const s0 = (samples[start + i] || 0) * w + c * s1 - s2; s2 = s1; s1 = s0;
  }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2));
}

function rmsEnvelope(samples, a, b, hop) {
  const env = [];
  for (let i = a; i < b; i += hop) {
    let e = 0;
    for (let j = 0; j < hop; j++) { const v = samples[i + j] || 0; e += v * v; }
    env.push(Math.sqrt(e / hop));
  }
  return env;
}

/** Fondamentale de la basse active à un instant (pour repérer les harmoniques « polluées » par la basse). */
function bassAt(avoid, start, stepDur, t) {
  if (!avoid) return null;
  const step = (t - start) / stepDur;
  const n = avoid.find((x) => step >= x.s && step < x.s + x.len);
  return n ? midiToFreq(n.n) : null;
}

/**
 * Analyse le timbre de l'élément extrait et construit un preset de correction.
 * @param {Float32Array} L canal gauche @param {Float32Array|null} R canal droit (stéréo → largeur)
 * @param {{notes, start, stepDur, kind, avoid?}} o avoid = notes de basse (pour le lead : harmoniques à ignorer)
 */
export function analyzeTimbre(L, R, sr, { notes, start, stepDur, kind = 'bass', avoid = null }) {
  const feats = {};
  if (!notes.length) return { params: null, features: null };
  const lo = kind === 'bass' ? 25 : 200, hi = kind === 'bass' ? 3000 : 12000;

  // Fiabilité d'une harmonique : loin des harmoniques de la basse jouée au même moment
  const reliable = (f, t) => {
    const fb = kind === 'lead' ? bassAt(avoid, start, stepDur, t) : null;
    if (!fb) return true;
    const k = Math.round(f / fb);
    // Seules les premières harmoniques de la basse ont assez d'énergie pour fausser la mesure
    return k > 10 || Math.abs(f - k * fb) > Math.max(6, f * 0.008);
  };

  const gridStart = (n) => Math.floor((start + n.s * stepDur) * sr);

  // Notes d'analyse : les plus fiables (confiance), puis les plus longues ; on agrège (médiane) sur 4 notes max
  const ranked = [...notes].sort((a, b) => (b.conf ?? 1) - (a.conf ?? 1) || b.len - a.len);
  const pool = ranked.slice(0, 4);
  const median = (arr) => { const v = arr.filter((x) => x != null && Number.isFinite(x)).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : null; };

  const measureHarmonics = (n) => {
    const a = gridStart(n);
    const len = Math.max(Math.floor(n.len * stepDur * sr), Math.floor(0.08 * sr));
    const b0 = Math.max(0, a - Math.floor(0.05 * sr));
    const sg = bandPass(L.subarray(b0, Math.min(L.length, a + len + Math.floor(0.1 * sr))), sr, lo, hi);
    const f = midiToFreq(n.n);
    const w = Math.max(Math.ceil((6 * sr) / f), Math.min(2048, Math.floor(len * 0.5)));
    const st0 = a - b0 + Math.floor(0.012 * sr);
    const t = start + (n.s + n.len * 0.3) * stepDur;
    const Hn = Array.from({ length: 12 }, (_, i) => goertzel(sg, st0, w, sr, f * (i + 1)));
    return Hn.map((h, i) => (i === 0 || reliable(f * (i + 1), t) ? h / (Hn[0] || 1e-9) : null));
  };
  const all = pool.map(measureHarmonics);
  const rel = Array.from({ length: 12 }, (_, i) => (i === 0 ? 1 : median(all.map((h) => h[i]))));
  const ok = rel.map((x) => x != null);
  const longest = [...pool].sort((a, b) => b.len - a.len)[0];

  const mono = L; // un seul canal : la somme L+R d'un unison stéréo annule des harmoniques
  const nS = gridStart(longest);
  const nLen = Math.max(Math.floor(longest.len * stepDur * sr), Math.floor(0.08 * sr));
  const s0 = Math.max(0, nS - Math.floor(0.05 * sr));
  const s1 = Math.min(mono.length, nS + nLen + Math.floor(0.6 * sr));
  const seg = bandPass(mono.subarray(s0, s1), sr, lo, hi);
  const nOff = nS - s0;
  const f0 = midiToFreq(longest.n);
  const hStart = nOff + Math.floor(0.012 * sr);
  feats.note = longest.n;
  feats.harmonics = rel.map((x) => (x == null ? null : +x.toFixed(2)));
  const avg = (idx) => { const v = idx.filter((i) => ok[i]).map((i) => rel[i]); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const evenAvg = avg([1, 3, 5]), oddAvg = avg([2, 4, 6]);
  const okUpper = [1, 2, 3, 4, 5, 6, 7].filter((i) => ok[i]);
  const richness = okUpper.reduce((a, i) => a + rel[i], 0) * (7 / Math.max(1, okUpper.length));
  let wave;
  if (richness < 0.25) wave = 'sine';
  else if (evenAvg != null && oddAvg != null && evenAvg < oddAvg * 0.35) wave = (ok[2] ? rel[2] : oddAvg) < 0.2 ? 'triangle' : 'square';
  else wave = 'sawtooth';
  feats.wave = wave;

  // Brillance → cutoff : dernière harmonique fiable audible ; au-delà, centroïde spectral
  let lastH = 1;
  rel.forEach((x, i) => { if (ok[i] && x > 0.06) lastH = i + 1; });
  const mag = magnitudeSpectrum(seg, hStart, 4096);
  let num = 0, den = 0;
  for (let i = 1; i < mag.length; i++) { const f = (i * sr) / 4096; if (f > hi) break; num += f * mag[i]; den += mag[i]; }
  const centroid = den ? num / den : f0 * 2;
  feats.centroid = Math.round(centroid);
  const cutoff = Math.max(150, Math.min(16000, lastH >= 11 ? centroid * 2.2 : f0 * lastH * 1.3));

  // Enveloppe suivie sur les harmoniques de chaque note (ignore le kick et les autres instruments), médiane du pool
  // Durée d'écoute d'une note : jusqu'à la note suivante de l'élément (un pluck « vit » au-delà de son pas d'attaque)
  const sortedNotes = [...notes].sort((a, b) => a.s - b.s);
  const room = (n) => {
    const next = sortedNotes.find((x) => x.s > n.s);
    const gap = next ? (next.s - n.s) * stepDur : 0.6;
    return Math.min(0.6, Math.max(n.len * stepDur, gap));
  };
  const measureEnv = (n) => {
    const a0 = gridStart(n);
    const len = Math.max(Math.floor(room(n) * sr), Math.floor(0.06 * sr));
    const b0 = Math.max(0, a0 - Math.floor(0.05 * sr));
    const sg = bandPass(L.subarray(b0, Math.min(L.length, a0 + len + Math.floor(0.5 * sr))), sr, lo, hi);
    const off0 = a0 - b0;
    const f = midiToFreq(n.n);
    const hop = Math.floor(0.005 * sr);
    const ew = Math.max(Math.floor(0.012 * sr), Math.floor((3 * sr) / f));
    const tNote = start + (n.s + n.len * 0.3) * stepDur;
    const tH = [1, 2, 3, 4, 5, 6].filter((h) => reliable(f * h, tNote)).slice(0, 4);
    if (!tH.length) return null; // toutes ses harmoniques se confondent avec la basse : note inexploitable
    const env = [];
    for (let i = Math.max(0, off0 - Math.floor(ew / 2)); i < sg.length - ew; i += hop) env.push(tH.reduce((acc, h) => acc + goertzel(sg, i, ew, sr, f * h), 0));
    // Plancher (ce qui reste quand l'élément se tait) retiré
    // Plancher : le plus bas entre le 10e centile et le niveau juste avant l'attaque (pré-roll de 50 ms)
    const sorted = [...env].sort((x, y) => x - y);
    const pre = env.slice(0, Math.max(1, Math.floor(0.03 * sr / hop)));
    const floor = Math.min(sorted[Math.floor(sorted.length * 0.1)] || 0, pre.reduce((x, y) => x + y, 0) / pre.length);
    for (let i = 0; i < env.length; i++) env[i] = Math.max(0, env[i] - floor);
    const frames = Math.max(2, Math.min(env.length, Math.floor(len / hop)));
    const peak = Math.max(...env.slice(0, frames), 1e-9);
    const pIdx = env.indexOf(peak);
    // Temps de montée 10 % → 90 % (indépendant du calage de la note sur la grille)
    let i10 = 0, i90 = pIdx;
    for (let i = pIdx; i >= 0; i--) if (env[i] < peak * 0.1) { i10 = i + 1; break; }
    for (let i = i10; i <= pIdx; i++) if (env[i] >= peak * 0.9) { i90 = i; break; }
    const att = Math.max(0, i90 - i10);
    const tail = env.slice(Math.floor(frames * 0.7), frames);
    const sus = Math.min(1, (tail.reduce((x, y) => x + y, 0) / (tail.length || 1)) / peak);
    let d = pIdx;
    const target = sus * peak + (peak - sus * peak) * 0.37;
    while (d < frames - 1 && env[d] > target) d++;
    const after = env.slice(frames, frames + 60);
    const endLevel = env[frames - 1] || 1e-9;
    let r = 0;
    while (r < after.length && after[r] > endLevel * 0.2) r++;
    const late = env.slice(frames + 40, frames + 80);
    return {
      attack: Math.max(0.001, att * 0.005 - (ew / sr) * 0.5),
      decay: Math.max(0.03, (d - pIdx) * 0.005),
      sustain: sus,
      release: Math.max(0.03, Math.min(2.5, r * 0.005)),
      tail: late.length ? (late.reduce((x, y) => x + y, 0) / late.length) / peak : 0,
    };
  };
  // Pour l'enveloppe, on privilégie les notes fiables qui ont le plus de place avant la suivante
  const envPool = [...notes].filter((n) => (n.conf ?? 1) >= 0.5 * (ranked[0].conf ?? 1)).sort((a, b) => room(b) - room(a)).slice(0, 4);
  let envs = (envPool.length ? envPool : pool).map(measureEnv).filter(Boolean);
  if (!envs.length) envs = ranked.slice(4, 10).map(measureEnv).filter(Boolean);
  if (!envs.length) envs = [{ attack: 0.005, decay: 0.3, sustain: 0.6, release: 0.2, tail: 0 }];
  const attack = median(envs.map((e) => e.attack));
  const decay = median(envs.map((e) => e.decay));
  const sustain = median(envs.map((e) => e.sustain));
  const release = median(envs.map((e) => e.release));
  const tailRatio = median(envs.map((e) => e.tail)) || 0;
  Object.assign(feats, { attack, decay, sustain: +sustain.toFixed(2), release });

  // Enveloppe de filtre : plus brillant au début qu'à la fin ?
  const early = magnitudeSpectrum(seg, nOff, 2048), late = magnitudeSpectrum(seg, nOff + Math.floor(nLen * 0.6), 2048);
  const cent = (m) => { let a = 0, b = 0; for (let i = 1; i < m.length; i++) { const f = (i * sr) / 2048; if (f > hi) break; a += f * m[i]; b += m[i]; } return b ? a / b : 1; };
  const brightDrop = cent(early) / Math.max(1, cent(late));
  feats.brightDrop = +brightDrop.toFixed(2);
  const envAmt = brightDrop > 1.25 ? Math.min(4, Math.log2(brightDrop) * 2.2) : 0;

  // Largeur stéréo (Side / Mid) mesurée DANS la bande de l'élément
  let width = 0;
  if (R) {
    const a = Math.max(0, nS), b = Math.min(L.length, nS + nLen);
    const wHi = kind === 'bass' ? 300 : hi; // sous 300 Hz, seule la basse joue
    const bl = bandPass(L.subarray(a, b), sr, lo, wHi), br = bandPass(R.subarray(a, b), sr, lo, wHi);
    let mE = 0, sE = 0;
    for (let i = 0; i < bl.length; i += 2) { const m = bl[i] + br[i], sd = bl[i] - br[i]; mE += m * m; sE += sd * sd; }
    width = Math.min(1, Math.sqrt(sE / (mE || 1)) * 2.5);
  }
  feats.width = +width.toFixed(2);

  // Vibrato : variation de hauteur pendant la note (en cents)
  const pitches = [];
  const pf = kind === 'bass' ? 2048 : 1024;
  for (let i = nOff + Math.floor(nLen * 0.2); i + pf < nOff + nLen; i += Math.floor(pf / 2)) {
    const r = yin(seg, i, pf, sr, f0 * 0.7, f0 * 1.4, 0.25);
    if (r.f0) pitches.push(1200 * Math.log2(r.f0 / f0));
  }
  const meanP = pitches.reduce((a, b) => a + b, 0) / (pitches.length || 1);
  const sdCents = Math.sqrt(pitches.reduce((a, b) => a + (b - meanP) ** 2, 0) / (pitches.length || 1));
  feats.vibrato = Math.round(sdCents);

  // Réverbe : énergie résiduelle longtemps après la fin des notes
  feats.reverb = +Math.min(1, tailRatio * 4).toFixed(2);

  // Glide : notes collées les unes aux autres (legato)
  const legato = notes.filter((n, i) => notes[i + 1] && n.s + n.len === notes[i + 1].s).length / Math.max(1, notes.length - 1);
  feats.legato = +legato.toFixed(2);

  const voices = width > 0.35 ? 5 : width > 0.15 ? 3 : 1;
  const isPluck = sustain < 0.35 && decay < 0.6;
  const params = withDefaults({
    osc: [{ wave, semi: 0, voices, detune: voices > 1 ? 10 + width * 20 : 0, level: 0.85 }, { wave: 'sawtooth', semi: 12, voices: 1, detune: 0, level: 0 }],
    sub: kind === 'bass' && ok[1] && rel[1] < 0.3 && wave !== 'sine' ? 0.35 : 0,
    filter: { type: 'lowpass', cutoff: Math.round(envAmt ? cutoff / Math.pow(2, envAmt * 0.6) : cutoff), q: wave === 'sawtooth' && ok[lastH - 1] && rel[lastH - 1] > 0.25 ? 4 : 1, envAmt: +envAmt.toFixed(1), slope: 24 },
    fenv: { a: 0.002, d: decay, s: 0.1, r: release },
    amp: { a: attack, d: decay, s: isPluck ? Math.min(sustain, 0.2) : sustain, r: release },
    lfo: sdCents > 12 ? { target: 'pitch', rate: 5.5, depth: Math.min(0.5, sdCents / 100) } : { target: 'none', rate: 4, depth: 0 },
    glide: legato > 0.5 ? 0.05 : 0,
    width,
    reverb: kind === 'bass' ? 0 : Math.max(0.1, feats.reverb),
    delay: 0,
    gain: kind === 'bass' ? 0.45 : 0.32,
  });
  feats.isPluck = isPluck;
  return { params, features: feats };
}

const WAVE_FR = { sawtooth: 'Saw (dent de scie)', square: 'Square (carré)', triangle: 'Triangle', sine: 'Sine (sinus)' };
const ms = (s) => (s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(1)} s`);
const hz = (f) => (f >= 1000 ? `${(f / 1000).toFixed(1)} kHz` : `${Math.round(f)} Hz`);

/** Indices progressifs à partir des mesures. */
export function timbreHints(f, p, kind) {
  return [
    {
      title: 'Oscillateur',
      text: `Forme d’onde dominante : ${WAVE_FR[p.osc[0].wave]}. ${f.wave === 'square' ? 'Les harmoniques paires sont faibles : typique du carré.' : f.wave === 'sawtooth' ? 'Harmoniques paires ET impaires présentes : typique de la saw.' : 'Très peu d’harmoniques : son rond.'}${p.osc[0].voices > 1 ? ` Le son est large en stéréo (largeur ${Math.round(f.width * 100)} %) → Unison ${p.osc[0].voices} voix.` : ' Son plutôt mono : pas (ou peu) d’unison.'}${p.sub ? ' Le fondamental est faible : ajoute le SUB.' : ''}`,
    },
    {
      title: 'Filtre',
      text: `Le son ne monte guère au-delà de ${hz(p.filter.cutoff * Math.pow(2, p.filter.envAmt * 0.6))} → filtre passe-bas (Low 24) avec le Cutoff dans cette zone.${p.filter.envAmt ? ` Il est plus brillant à l’attaque qu’à la fin (×${f.brightDrop}) : ENV 2 → Cutoff, Decay ~${ms(p.fenv.d)}.` : ' La brillance reste stable pendant la note : pas d’enveloppe de filtre marquée.'}`,
    },
    {
      title: 'Enveloppe',
      text: `Attack ${ms(f.attack)}, Decay ${ms(f.decay)}, Sustain ${Math.round(p.amp.s * 100)} %, Release ${ms(f.release)}. ${f.isPluck ? 'C’est un son percussif (pluck) : Sustain bas.' : 'Le son tient tant que la note dure : Sustain haut.'}`,
    },
    {
      title: 'Mouvement & effets',
      text: `${p.lfo.target === 'pitch' ? `Vibrato détecté (±${f.vibrato} cents) : LFO → Fine.` : 'Pas de vibrato notable.'} ${p.glide ? 'Notes liées (legato) : Mono + Legato + Porta ~50 ms.' : ''} ${kind === 'bass' ? 'Basse : garde-la mono et sans reverb.' : f.reverb > 0.3 ? 'Queue de réverbe audible : Reverb assez présente.' : 'Peu de réverbe : son plutôt sec.'}`,
    },
  ];
}

/** Recette Serum 2 complète du preset de correction. */
export function serumRecipe(p, kind) {
  const lines = [
    `Menu → Init Preset. ${kind === 'bass' || p.glide ? 'Mode Mono' + (p.glide ? ' + Legato + Porta ~' + Math.round(p.glide * 1000) + ' ms' : '') + '.' : 'Mode Poly.'}`,
    `Osc A : ${WAVE_FR[p.osc[0].wave]} (Basic Shapes)${p.osc[0].voices > 1 ? `, Unison ${p.osc[0].voices}, Detune ~${(p.osc[0].detune / 100).toFixed(2)}, Stereo ${Math.round((p.width ?? 0.5) * 100)} %` : ', Unison 1'}.`,
    p.sub ? `SUB : Sine, niveau ~${Math.round(p.sub * 100)} %.` : null,
    `Filtre : MG Low 24, Cutoff ~${hz(p.filter.cutoff)}, Res ~${Math.round(Math.min(1, (p.filter.q - 0.5) / 10) * 100)} %.`,
    p.filter.envAmt ? `ENV 2 → Cutoff (≈ +${p.filter.envAmt} octaves), Attack 0, Decay ${ms(p.fenv.d)}, Sustain ~10 %.` : null,
    `ENV 1 : Attack ${ms(p.amp.a)}, Decay ${ms(p.amp.d)}, Sustain ${Math.round(p.amp.s * 100)} %, Release ${ms(p.amp.r)}.`,
    p.lfo.target === 'pitch' ? `LFO 1 (~${p.lfo.rate} Hz) → Osc A Fine, quantité faible (vibrato).` : null,
    kind === 'bass' ? 'FX : pas de reverb. Un peu de Distortion si la basse doit s’entendre sur petits haut-parleurs.' : `FX : Reverb ~${Math.round((p.reverb || 0) * 100)} %${p.osc[0].voices > 1 ? ', Chorus léger' : ''}.`,
  ];
  return lines.filter(Boolean);
}
