// 🔊 Volume égalisé : les sons des exercices n'ont pas tous le même niveau (un sub, un pad filtré, une supersaw…).
// Chaque son est mesuré une fois, hors temps réel, à travers la vraie chaîne de sortie ; on en tire un gain qui
// ramène tout au même niveau perçu. La mesure est faite à l'avance (à l'affichage de l'exercice) et gardée en mémoire.
import { renderOffline } from '../core/audio.js';
import { getState } from '../store.js';

/** Niveau visé (RMS pondéré sur la fenêtre de 100 ms la plus forte) : le niveau médian des sons du parcours. */
export const LEVEL_TARGET = 0.21;
const MIN_K = 0.4, MAX_K = 2.2;   // jamais plus de −8 dB / +7 dB de correction
const RATE = 22050, WINDOW = 0.1, SECONDS = 1.6;
const STORE = 'beatforge.levels.v1';

const cache = new Map();          // clé → gain
const pending = new Map();        // clé → promesse
const queue = [];
let busy = false, loaded = false;

export const levelingOn = () => getState().settings.leveling !== false;

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const keyOf = (spec) => hash(JSON.stringify(spec, (k, v) => (k === 'lv' ? undefined : v)));

function load() {
  if (loaded) return;
  loaded = true;
  try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem(STORE) || '{}'))) if (v >= MIN_K && v <= MAX_K) cache.set(k, v); } catch (e) { /* cache illisible : on remesure */ }
}
let saveT = null;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries([...cache].slice(-500)))); } catch (e) { /* stockage plein */ } }, 800);
}

/** Niveau d'un rendu : RMS (graves atténués, comme l'oreille) de la fenêtre la plus forte, et crête. */
export function loudness(left, right, rate) {
  const n = left.length;
  const a = Math.exp((-2 * Math.PI * 120) / rate); // passe-haut 1 pôle à 120 Hz
  const win = Math.max(1, Math.round(WINDOW * rate)), hop = Math.max(1, win >> 1);
  let lp = 0, peak = 0, best = 0;
  const sq = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (left[i] + (right ? right[i] : left[i])) * 0.5;
    const ax = Math.abs(x);
    if (ax > peak) peak = ax;
    lp = a * lp + (1 - a) * x;
    const y = x - lp * 0.75; // les graves comptent encore pour un quart : un sub ne doit pas être poussé à fond
    sq[i] = y * y;
  }
  for (let s = 0; s + win <= n; s += hop) {
    let sum = 0;
    for (let i = s; i < s + win; i++) sum += sq[i];
    if (sum > best) best = sum;
  }
  return { rms: Math.sqrt(best / win), peak };
}

/** Gain qui ramène un son mesuré au niveau visé. */
export function gainFor({ rms, peak }, target = LEVEL_TARGET) {
  if (!(rms > 1e-4)) return 1;
  let k = target / rms;
  if (peak * k > 0.95) k = 0.95 / peak;
  return Math.round(Math.max(MIN_K, Math.min(MAX_K, k)) * 100) / 100;
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const { key, schedule, resolve } = queue.shift();
    let k = 1;
    try {
      const buf = await renderOffline(SECONDS, schedule, { sampleRate: RATE });
      k = gainFor(loudness(buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : null, RATE));
      cache.set(key, k);
      save();
    } catch (e) { /* pas de rendu hors-ligne sur ce navigateur : son joué tel quel */ }
    pending.delete(key);
    resolve(k);
    await new Promise((r) => setTimeout(r, 0));
  }
  busy = false;
}

/**
 * Mesure un son à l'avance. schedule(t0, k) programme le son (comme pour le jouer) avec le gain k.
 * Renvoie une promesse du gain à appliquer.
 */
export function measure(spec, schedule) {
  load();
  if (typeof window === 'undefined' || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) return Promise.resolve(1);
  const key = keyOf(spec);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (pending.has(key)) return pending.get(key);
  const p = new Promise((resolve) => queue.push({ key, schedule: (t0) => schedule(t0, 1), resolve }));
  pending.set(key, p);
  setTimeout(pump, 0);
  return p;
}

/** Gain connu pour ce son (1 tant qu'il n'est pas mesuré, ou si l'égalisation est coupée). */
export function levelOf(spec) {
  if (!levelingOn()) return 1;
  load();
  return cache.get(keyOf(spec)) ?? 1;
}
