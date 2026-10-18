// Partage d'une idée par lien : le projet est compressé dans l'adresse (#/listen?i=…), sans serveur.
// Au décodage, chaque valeur est vérifiée : un lien modifié à la main ne peut rien casser.
import { GENRES } from '../data/genres.js';
import { SCALES } from './theory.js';
import { MELODY_STEPS } from './arrange.js';

const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function pipe(bytes, Stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw')));
  return new Uint8Array(await out.arrayBuffer());
}

/** Projet → code court (z… = compressé, j… = texte brut si la compression n'existe pas). */
export async function encodeProject(p) {
  const { mutes, ...rest } = p;
  const bytes = new TextEncoder().encode(JSON.stringify(rest));
  if (typeof CompressionStream !== 'undefined') return 'z' + b64(await pipe(bytes, CompressionStream));
  return 'j' + b64(bytes);
}

export async function decodeProject(code, base) {
  if (!code || code.length > 20000) throw new Error('Lien invalide');
  let bytes = unb64(code.slice(1));
  if (code[0] === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Navigateur trop ancien pour ce lien');
    bytes = await pipe(bytes, DecompressionStream);
  } else if (code[0] !== 'j') throw new Error('Lien invalide');
  return sanitizeProject(JSON.parse(new TextDecoder().decode(bytes)), base);
}

const int = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : d);
const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : d);
const str = (v, ok, d) => (typeof v === 'string' && ok(v) ? v : d);
const note = (x) => (x && typeof x === 'object' ? { n: int(x.n, 0, 127, 60), len: int(x.len, 1, 64, 1) } : null);
const prims = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => ['number', 'string', 'boolean'].includes(typeof v)).slice(0, 12));

/** Reconstruit un projet sûr à partir de données externes ; base = projet par défaut du style. */
export function sanitizeProject(d, base) {
  if (!d || typeof d !== 'object') throw new Error('Lien invalide');
  const p = JSON.parse(JSON.stringify(base));
  p.genre = str(d.genre, (v) => GENRES.some((g) => g.id === v), p.genre);
  p.bpm = int(d.bpm, 50, 200, p.bpm);
  p.swing = num(d.swing, 0, 0.7, p.swing);
  p.rootPc = int(d.rootPc, 0, 11, p.rootPc);
  p.scale = str(d.scale, (v) => !!SCALES[v], p.scale);
  p.ext = int(d.ext, 3, 5, p.ext);
  for (const k of ['voicing', 'chordStyle', 'bassStyle', 'kit']) p[k] = str(d[k], (v) => v.length < 30 && /^[\w-]+$/.test(v), p[k]);
  p.pump = num(d.pump, 0, 1, p.pump);
  if (Array.isArray(d.chords)) p.chords = d.chords.slice(0, 8).map(prims);
  if (d.sounds && typeof d.sounds === 'object') for (const k of Object.keys(p.sounds)) p.sounds[k] = str(d.sounds[k], (v) => v.length < 30 && /^[\w-]+$/.test(v), p.sounds[k]);
  if (d.drums && typeof d.drums === 'object') {
    for (const k of Object.keys(p.drums)) if (Array.isArray(d.drums[k])) p.drums[k] = p.drums[k].map((_, i) => int(d.drums[k][i], 0, 2, 0));
  }
  if (Array.isArray(d.melody)) p.melody = Array.from({ length: MELODY_STEPS }, (_, i) => note(d.melody[i]));
  if (Array.isArray(d.bassLine)) p.bassLine = Array.from({ length: MELODY_STEPS }, (_, i) => note(d.bassLine[i]));
  return p;
}

export function shareUrl(code) {
  return `${location.origin}${location.pathname}#/listen?i=${code}`;
}
