// Call & Response : génération de phrases (mélodie, basse, rythme) et notation des réponses. Module pur.
import { scaleNotes, mod } from './theory.js';

export const KINDS = {
  melody: { name: 'Mélodie', emoji: '🎵', skill: 'melodie' },
  bass: { name: 'Basse', emoji: '🎸', skill: 'oreille' },
  rhythm: { name: 'Rythme (pads)', emoji: '🥁', skill: 'rythme' },
};

const RHYTHMS = {
  1: [[0, 4, 8, 12], [0, 4, 8], [0, 2, 4, 8], [0, 8, 12]],
  2: [[0, 3, 6, 8, 12], [0, 2, 4, 6, 8], [0, 4, 6, 8, 10], [0, 3, 8, 11]],
  3: [[0, 3, 6, 10, 12, 14], [0, 2, 3, 6, 8, 11], [1, 4, 6, 9, 12], [0, 3, 5, 8, 10, 13]],
};

export function difficulty(level) {
  return level < 4 ? 1 : level < 9 ? 2 : 3;
}

/** Notes jouables pour la phrase (mélodie : autour de C4 ; basse : autour de C2). */
export function phraseRange(kind, rootPc, scaleId) {
  const center = kind === 'bass' ? 40 : 60;
  const low = center - 2 + mod(rootPc - (center - 2), 12);
  return scaleNotes(rootPc, scaleId, low - (kind === 'bass' ? 0 : 3), low + (kind === 'bass' ? 12 : 12));
}

/**
 * Génère une phrase d'une mesure (16 doubles-croches).
 * @returns {{s:number, n?:number, id?:string, len:number}[]}
 */
export function genPhrase({ kind, rootPc, scale, chordPcs = [], level = 1, rng = Math.random }) {
  const d = difficulty(level);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const rhythm = pick(RHYTHMS[d]);
  if (kind === 'rhythm') {
    const kit = d === 1 ? ['kick', 'snare'] : d === 2 ? ['kick', 'snare', 'hat'] : ['kick', 'snare', 'hat', 'clap'];
    return rhythm.map((s, i) => ({ s, id: i === 0 ? 'kick' : s % 8 === 4 ? 'snare' : pick(kit), len: 1 }));
  }
  const notes = phraseRange(kind, rootPc, scale);
  const ct = notes.filter((n) => chordPcs.includes(mod(n, 12)));
  const root = notes.find((n) => mod(n - rootPc, 12) === 0) ?? notes[0];
  let idx = notes.indexOf(kind === 'bass' ? (ct.find((n) => mod(n, 12) === chordPcs[0]) ?? root) : pick(ct.length ? ct : notes));
  const moves = d === 1 ? [-1, 1, 0] : d === 2 ? [-2, -1, 1, 2] : [-3, -2, -1, 1, 2, 3, 4];
  return rhythm.map((s, k) => {
    if (k > 0) {
      if (kind === 'bass' && s % 4 === 0 && ct.length) idx = notes.indexOf(pick(ct));
      else idx = Math.max(0, Math.min(notes.length - 1, idx + pick(moves)));
    }
    const next = rhythm[k + 1] ?? 16;
    return { s, n: notes[idx], len: Math.min(kind === 'bass' ? 3 : 2, next - s) };
  });
}

const sameSound = (kind, a, b) => (kind === 'rhythm' ? a.id === b.id : mod(a.n, 12) === mod(b.n, 12));

/**
 * Mode « Répète » : chaque note de l'appel doit être rejouée (même hauteur à l'octave près / même pad)
 * à ±1 double-croche. Les notes en trop coûtent des points.
 */
export function scoreRepeat(kind, call, resp) {
  const used = new Set();
  let sum = 0;
  const detail = call.map((c) => {
    let best = null;
    resp.forEach((r, i) => {
      if (used.has(i) || !sameSound(kind, c, r)) return;
      const dt = Math.abs(r.s - c.s);
      if (dt <= 1 && (!best || dt < best.dt)) best = { i, dt };
    });
    if (best) { used.add(best.i); sum += best.dt === 0 ? 1 : 0.75; return best.dt === 0 ? 'ok' : 'late'; }
    return 'miss';
  });
  const extra = resp.length - used.size;
  const score = call.length ? Math.max(0, Math.round(100 * (sum / call.length) - extra * 8)) : 0;
  return { score, detail, extra };
}

/**
 * Mode « Improvise » : une bonne réponse fait écho au rythme de l'appel sans le copier,
 * reste dans la gamme, vise les notes de l'accord sur les temps et se pose à la fin.
 */
export function scoreImprov(kind, call, resp, { rootPc = 0, scale = 'minor', chordPcs = [], scaleSteps = null } = {}) {
  const tips = [];
  if (resp.length < 2) return { score: 0, tips: ['Joue au moins 2 notes dans la mesure de réponse.'], criteria: [] };
  const criteria = [];
  const add = (label, v, w, tip) => { criteria.push({ label, ok: v >= 0.7 }); if (v < 0.7 && tip) tips.push(tip); return v * w; };
  let total = 0;

  // Écho rythmique (ni copie, ni hors sujet)
  const cs = new Set(call.map((c) => c.s));
  const near = resp.filter((r) => cs.has(r.s) || cs.has(r.s - 1) || cs.has(r.s + 1)).length / resp.length;
  const identical = kind === 'rhythm'
    ? call.length === resp.length && call.every((c, i) => resp[i] && resp[i].s === c.s && resp[i].id === c.id)
    : call.length === resp.length && call.every((c, i) => resp[i] && resp[i].s === c.s && resp[i].n === c.n);
  const echo = identical ? 0.4 : near >= 0.3 && near <= 0.9 ? 1 : near > 0.9 ? 0.8 : near / 0.3;
  total += add('Écho rythmique', echo, 30, identical ? 'Tu as copié l’appel : garde le rythme mais change la fin (ou les notes).' : 'Reprends une partie du rythme de l’appel pour qu’on entende la « conversation ».');

  // Densité comparable
  const ratio = resp.length / Math.max(1, call.length);
  total += add('Densité équilibrée', ratio >= 0.5 && ratio <= 1.8 ? 1 : 0.4, 15, ratio < 0.5 ? 'Réponse trop maigre : ajoute quelques notes.' : 'Réponse trop chargée : laisse respirer.');

  if (kind === 'rhythm') {
    const kick1 = resp.some((r) => r.id === 'kick' && r.s <= 1);
    total += add('Kick sur le 1', kick1 ? 1 : 0.3, 25, 'Pose un kick sur le premier temps pour ancrer ta réponse.');
    const varied = new Set(resp.map((r) => r.id)).size >= 2;
    total += add('Variété de sons', varied ? 1 : 0.4, 30, 'Utilise au moins 2 pads différents.');
  } else {
    const steps = scaleSteps || [];
    const inScale = steps.length ? resp.filter((r) => steps.includes(mod(r.n - rootPc, 12))).length / resp.length : 1;
    total += add('Dans la gamme', inScale, 20, 'Certaines notes sortent de la gamme : reste sur les touches de la gamme (active Scale sur le MPC).');
    const strong = resp.filter((r) => r.s % 4 === 0);
    const ct = strong.length ? strong.filter((r) => chordPcs.includes(mod(r.n, 12))).length / strong.length : 0.6;
    total += add('Notes d’accord sur les temps', ct, 20, 'Sur les temps forts, vise une note de l’accord.');
    const last = resp[resp.length - 1];
    const res = mod(last.n - rootPc, 12) === 0 ? 1 : chordPcs.includes(mod(last.n, 12)) ? 0.85 : 0.3;
    total += add('Fin qui se pose', res, 15, 'Termine sur la tonique ou une note de l’accord pour « répondre ».');
  }
  return { score: Math.round(total), tips, criteria };
}

/** Convertit des frappes horodatées (s) en pas de double-croche relatifs au début de la mesure. */
export function quantizeHits(hits, barStart, stepDur, steps = 16) {
  return hits
    .map((h) => ({ ...h, s: Math.round((h.t - barStart) / stepDur) }))
    .filter((h) => h.s >= 0 && h.s < steps)
    .sort((a, b) => a.s - b.s);
}
