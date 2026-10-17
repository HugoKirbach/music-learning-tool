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

/** FFT radix-2 en place. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/**
 * Flux spectral : somme des hausses de magnitude (log) sur toutes les fréquences, ~200 images/s.
 * Bien plus robuste que l'énergie globale quand une basse tenue masque la batterie.
 */
export function spectralFlux(samples, sampleRate) {
  const D = Math.max(1, Math.floor(sampleRate / 11025));
  const sr = sampleRate / D;
  const len = Math.floor(samples.length / D);
  const x = new Float32Array(len);
  for (let i = 0; i < len; i++) { let s = 0; for (let k = 0; k < D; k++) s += samples[i * D + k]; x[i] = s / D; }
  const size = 512, hop = Math.max(16, Math.round(sr / 200));
  const win = new Float32Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
  const frames = Math.max(0, Math.floor((len - size) / hop));
  const out = new Float32Array(frames);
  let prev = new Float32Array(size / 2);
  const re = new Float64Array(size), im = new Float64Array(size);
  for (let f = 0; f < frames; f++) {
    const o = f * hop;
    for (let i = 0; i < size; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; }
    fft(re, im);
    let flux = 0;
    const cur = new Float32Array(size / 2);
    for (let k = 1; k < size / 2; k++) {
      cur[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = cur[k] - prev[k];
      if (d > 0) flux += d;
    }
    out[f] = flux;
    prev = cur;
  }
  // retrait de la tendance locale (moyenne glissante ~80 ms)
  const w = 16, res = new Float32Array(frames);
  let acc = 0;
  for (let i = 0; i < frames; i++) {
    acc += out[i]; if (i >= w) acc -= out[i - w];
    res[i] = Math.max(0, out[i] - acc / Math.min(i + 1, w));
  }
  // latence : une attaque apparaît dans le flux quand elle atteint le centre de la fenêtre (size/2)
  return { onset: res, fps: sr / hop, latency: size / 2 / sr };
}

/**
 * Détection de tempo : enveloppe d'attaques à ~200 images/s (indépendante de la fréquence d'échantillonnage),
 * puis recherche exhaustive (pas de 0,1 BPM) du peigne d'impulsions (tempo + phase) qui colle le mieux
 * aux attaques, en moyenne par battement (pas de biais vers les tempos rapides). Légère préférence autour de 120.
 * @returns {{bpm:number, confidence:number, offset:number}} offset = position (s) d'un premier temps probable
 */
export function detectBpm(samples, sampleRate, { min = 70, max = 180 } = {}) {
  const { onset: raw, fps, latency } = spectralFlux(samples, sampleRate);
  const mean0 = raw.reduce((a, b) => a + b, 0) / (raw.length || 1) || 1e-9;
  // Compression logarithmique : les premiers temps de mesure (tout tombe ensemble) ne doivent pas tout écraser
  const onset = raw.map((v) => Math.log1p(v / mean0));
  const n = onset.length;
  const at = (t) => { const i = Math.floor(t); const f = t - i; return i >= 0 && i + 1 < n ? onset[i] * (1 - f) + onset[i + 1] * f : 0; };
  // Score moyen d'un peigne (tempo, phase) ; max sur ±1 trame (tolérance au micro-timing)
  const combScore = (bpm, phase) => {
    const period = (60 * fps) / bpm;
    let s = 0, c = 0;
    for (let t = phase; t < n - 2; t += period) { s += Math.max(at(t - 1), at(t), at(t + 1)); c++; }
    return c ? s / c : 0;
  };
  const evalBpm = (bpm) => {
    const period = (60 * fps) / bpm;
    let best = { s: -1, ph: 0 };
    for (let ph = 0; ph < period; ph += 1) {
      const sc = combScore(bpm, ph);
      if (sc > best.s) best = { s: sc, ph };
    }
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120), 2));
    return { bpm, s: best.s * (0.85 + 0.15 * prior), ph: best.ph, raw: best.s };
  };
  const mean = onset.reduce((a, b) => a + b, 0) / (n || 1) || 1e-9;
  let best = { bpm: 120, s: -Infinity, ph: 0, raw: 0 };
  for (let bpm = min; bpm <= max + 1e-9; bpm += 0.5) {
    const r = evalBpm(bpm);
    if (r.s > best.s) best = r;
  }
  // Half-time (DnB, trap, dubstep) : si le double colle presque aussi bien, on prend le double
  if (best.bpm < 95 && best.bpm * 2 <= max) {
    const dbl = evalBpm(best.bpm * 2);
    if (dbl.raw >= best.raw * 0.75) best = dbl;
  }
  // Affinage au 0,05 BPM près
  const coarse = best.bpm;
  for (let bpm = coarse - 0.6; bpm <= coarse + 0.6; bpm += 0.05) {
    const r = evalBpm(bpm);
    if (r.s > best.s) best = r;
  }
  const confidence = Math.max(0, Math.min(1, (best.raw / mean - 1) / 6));
  return { bpm: Math.round(best.bpm * 10) / 10, confidence, offset: best.ph / fps + latency };
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
