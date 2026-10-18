// Fredonne → MIDI : transforme une suite de mesures de hauteur (micro) en notes calées sur la gamme et le tempo. Module pur.
import { SCALES, mod } from './theory.js';

export const freqToMidiF = (f) => 69 + 12 * Math.log2(f / 440);

function median(arr) {
  const v = [...arr].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
}

/** Note de la gamme la plus proche d'une hauteur (fractionnaire). */
export function snapToScale(m, rootPc, scale) {
  const steps = SCALES[scale]?.steps;
  if (!steps || rootPc == null) return Math.round(m);
  let best = Math.round(m), bestD = Infinity;
  for (let c = Math.floor(m) - 2; c <= Math.ceil(m) + 2; c++) {
    if (!steps.includes(mod(c - rootPc, 12))) continue;
    const d = Math.abs(c - m);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/**
 * @param {{t:number, f0:number, conf:number, rms:number}[]} frames t en secondes depuis le début de l'enregistrement
 * @param {{bpm:number, start:number, steps:number, rootPc?:number, scale?:string, octaveShift?:number, minConf?:number}} o
 *        start = instant (s) du 1er temps de la zone à transcrire
 * @returns {{notes:{s:number,n:number,len:number}[], voiced:number}}
 */
export function humToNotes(frames, { bpm, start, steps = 32, rootPc = null, scale = 'minor', minConf = 0.75 }) {
  const sd = 60 / bpm / 4;
  const maxRms = Math.max(1e-9, ...frames.map((f) => f.rms));
  // 1) trames voisées → hauteur continue, lissée (médiane sur 5)
  const v = frames.map((f) => (f.f0 > 60 && f.f0 < 1500 && f.conf >= minConf && f.rms > maxRms * 0.08 ? freqToMidiF(f.f0) : null));
  const sm = v.map((x, i) => {
    if (x == null) return null;
    const w = v.slice(Math.max(0, i - 2), i + 3).filter((y) => y != null);
    return median(w);
  });
  // 2) par double-croche : hauteur médiane des trames de ce pas (si assez de trames voisées)
  const per = [];
  let voiced = 0;
  for (let k = 0; k < steps; k++) {
    const a = start + k * sd, b = a + sd;
    const inStep = frames.map((f, i) => (f.t >= a && f.t < b ? sm[i] : undefined)).filter((x) => x !== undefined);
    const vs = inStep.filter((x) => x != null);
    if (!inStep.length || vs.length < Math.max(1, inStep.length * 0.4)) { per.push(null); continue; }
    voiced++;
    // attaque : montée de volume au début du pas
    const rmsIn = frames.filter((f) => f.t >= a && f.t < b).map((f) => f.rms);
    const rmsPrev = frames.filter((f) => f.t >= a - sd && f.t < a).map((f) => f.rms);
    const onset = rmsPrev.length && Math.max(...rmsIn) > 1.8 * (rmsPrev.reduce((x, y) => x + y, 0) / rmsPrev.length + 1e-9);
    per.push({ m: median(vs), onset });
  }
  // 3) hauteur → note de la gamme ; fusion des pas identiques consécutifs (sauf nouvelle attaque)
  const notes = [];
  for (let k = 0; k < steps; k++) {
    const p = per[k];
    if (!p) continue;
    const n = snapToScale(p.m, rootPc, scale);
    const last = notes[notes.length - 1];
    if (last && last.n === n && last.s + last.len === k && !p.onset) last.len++;
    else notes.push({ s: k, n, len: 1 });
  }
  // 4) notes isolées très courtes entre deux notes identiques = glissando de la voix → absorbées
  for (let i = notes.length - 2; i >= 1; i--) {
    const a = notes[i - 1], b = notes[i], c = notes[i + 1];
    if (b.len === 1 && a.n === c.n && a.s + a.len === b.s && b.s + 1 === c.s) { a.len += 1 + c.len; notes.splice(i, 2); }
  }
  return { notes, voiced };
}

/** Ramène une ligne chantée dans une tessiture donnée (par octaves entières, autour de `center`). */
export function fitRange(notes, center = 67) {
  if (!notes.length) return notes;
  const avg = notes.reduce((a, n) => a + n.n, 0) / notes.length;
  const shift = Math.round((center - avg) / 12) * 12;
  return notes.map((n) => ({ ...n, n: n.n + shift }));
}
