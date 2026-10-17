// Analyse audio d'un morceau de référence : tempo (BPM), premier temps, tonalité, forme d'onde. Module pur.

/** Enveloppe d'énergie (RMS) par trames. */
export function energyEnvelope(samples, sampleRate, hop = 512) {
  const n = Math.floor(samples.length / hop);
  const env = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    const o = f * hop;
    for (let i = 0; i < hop; i++) { const x = samples[o + i]; s += x * x; }
    env[f] = Math.sqrt(s / hop);
  }
  return { env, fps: sampleRate / hop };
}

/** Fonction d'attaque : hausse du log-énergie (les coups de kick/snare ressortent). */
export function onsetStrength(env) {
  const out = new Float32Array(env.length);
  let prev = Math.log(1e-6 + env[0]);
  for (let i = 1; i < env.length; i++) {
    const cur = Math.log(1e-6 + env[i]);
    out[i] = Math.max(0, cur - prev);
    prev = cur;
  }
  // centrage (moyenne glissante retirée) pour éviter que les passages forts dominent
  const w = 16;
  const res = new Float32Array(out.length);
  let acc = 0;
  for (let i = 0; i < out.length; i++) {
    acc += out[i];
    if (i >= w) acc -= out[i - w];
    res[i] = Math.max(0, out[i] - acc / Math.min(i + 1, w));
  }
  return res;
}

/**
 * Détection de tempo par autocorrélation de la fonction d'attaque.
 * @returns {{bpm:number, confidence:number, offset:number}} offset = position (s) d'un premier temps probable
 */
export function detectBpm(samples, sampleRate, { min = 70, max = 180 } = {}) {
  const { env, fps } = energyEnvelope(samples, sampleRate);
  const onset = onsetStrength(env);
  const n = onset.length;
  const minLag = Math.floor((60 * fps) / max);
  const maxLag = Math.ceil((60 * fps) / min);
  const ac = new Float32Array(maxLag + 2);
  for (let lag = Math.max(1, minLag - 1); lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = lag; i < n; i++) s += onset[i] * onset[i - lag];
    ac[lag] = s / (n - lag);
  }
  // Score d'un tempo : autocorrélation au battement + à 2 et 4 battements (renforce le bon tempo)
  const at = (x) => { const i = Math.floor(x); const f = x - i; return (ac[i] || 0) * (1 - f) + (ac[i + 1] || 0) * f; };
  let best = { lag: minLag, score: -1 };
  let total = 0, count = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * fps) / lag;
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 125) / 0.9, 2)); // préférence douce autour de 125
    const sc = (at(lag) + 0.5 * accAt(onset, lag * 2) + 0.25 * accAt(onset, lag * 4)) * (0.6 + 0.4 * prior);
    total += sc; count++;
    if (sc > best.score) best = { lag, score: sc };
  }
  // Interpolation parabolique
  const l = best.lag;
  const y0 = ac[l - 1] || 0, y1 = ac[l], y2 = ac[l + 1] || 0;
  const denom = y0 - 2 * y1 + y2;
  const shift = denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / denom)) : 0;
  let bpm = (60 * fps) / (l + shift);
  while (bpm < min) bpm *= 2;
  while (bpm > max) bpm /= 2;
  // Affinage fin : peigne d'impulsions (période + phase) qui colle le mieux aux attaques, ±3 % autour de l'estimation
  const comb = (b) => {
    const period = (60 * fps) / b;
    let best = 0;
    for (let ph = 0; ph < period; ph += 0.5) {
      let s = 0;
      for (let t = ph; t < n - 1; t += period) {
        const i = Math.floor(t), f = t - i;
        s += onset[i] * (1 - f) + onset[i + 1] * f;
      }
      if (s > best) best = s;
    }
    return best;
  };
  let fine = { bpm, s: comb(bpm) };
  for (let b = bpm * 0.97; b <= bpm * 1.03; b += 0.05) {
    const s = comb(b);
    if (s > fine.s) fine = { bpm: b, s };
  }
  bpm = fine.bpm;
  const confidence = Math.max(0, Math.min(1, (best.score / (total / count || 1) - 1) / 3));

  // Phase : décalage qui aligne le mieux une grille de noires sur les attaques
  const period = (60 * fps) / bpm;
  let bestPhase = 0, bestSum = -1;
  for (let ph = 0; ph < period; ph += 0.5) {
    let s = 0;
    for (let t = ph; t < n; t += period) s += onset[Math.round(t)] || 0;
    if (s > bestSum) { bestSum = s; bestPhase = ph; }
  }
  return { bpm: Math.round(bpm * 10) / 10, confidence, offset: bestPhase / fps };
}

function accAt(onset, lag) {
  const l = Math.round(lag);
  if (l >= onset.length) return 0;
  let s = 0;
  for (let i = l; i < onset.length; i++) s += onset[i] * onset[i - l];
  return s / (onset.length - l);
}

// Profils de Krumhansl-Kessler
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function corr(a, b) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db || 1);
}

/** Chromagramme moyen par l'algorithme de Goertzel (notes MIDI 36 à 83). */
export function chroma(samples, sampleRate, { frames = 60, size = 4096 } = {}) {
  const dec = Math.max(1, Math.floor(sampleRate / 11025));
  const sr = sampleRate / dec;
  const len = Math.floor(samples.length / dec);
  const chr = new Float64Array(12);
  const step = Math.max(size, Math.floor((len - size) / frames));
  const coeffs = [];
  for (let m = 36; m <= 83; m++) {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    coeffs.push({ pc: m % 12, c: 2 * Math.cos((2 * Math.PI * f) / sr) });
  }
  const buf = new Float32Array(size);
  for (let start = 0; start + size <= len; start += step) {
    for (let i = 0; i < size; i++) {
      let s = 0;
      for (let k = 0; k < dec; k++) s += samples[(start + i) * dec + k];
      buf[i] = (s / dec) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    for (const { pc, c } of coeffs) {
      let s1 = 0, s2 = 0;
      for (let i = 0; i < size; i++) { const s0 = buf[i] + c * s1 - s2; s2 = s1; s1 = s0; }
      chr[pc] += Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2));
    }
  }
  return [...chr];
}

/** Estimation de tonalité (Krumhansl-Schmuckler). */
export function detectKey(samples, sampleRate) {
  const c = chroma(samples, sampleRate);
  const results = [];
  for (let r = 0; r < 12; r++) {
    const rot = c.slice(r).concat(c.slice(0, r));
    results.push({ rootPc: r, mode: 'major', score: corr(rot, MAJOR) });
    results.push({ rootPc: r, mode: 'minor', score: corr(rot, MINOR) });
  }
  results.sort((a, b) => b.score - a.score);
  return { ...results[0], confidence: Math.max(0, Math.min(1, (results[0].score - results[1].score) * 8)), alternatives: results.slice(1, 3) };
}

/** Pics min/max pour dessiner la forme d'onde. */
export function waveformPeaks(samples, width) {
  const per = Math.max(1, Math.floor(samples.length / width));
  const out = [];
  for (let x = 0; x < width; x++) {
    let lo = 0, hi = 0;
    for (let i = x * per; i < Math.min(samples.length, (x + 1) * per); i += 4) {
      const v = samples[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    out.push([lo, hi]);
  }
  return out;
}

/** Tap tempo : moyenne des intervalles récents (ms) → BPM. */
export function tapBpm(times) {
  if (times.length < 3) return null;
  const recent = times.slice(-8);
  const gaps = recent.slice(1).map((t, i) => t - recent[i]);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return Math.round((60000 / avg) * 10) / 10;
}
