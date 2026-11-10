// Petites fabriques pour écrire le parcours de façon compacte (voir src/data/course*.js).
// Les QCM s'écrivent avec la BONNE réponse en premier : elles sont mélangées à la construction de la leçon.
import { GRIDS, chordMidi } from '../core/coursegen.js';

/** Fiche de cours (nouvelle notion). visual : dessin ; demo : boutons d'écoute ; tip : astuce encadrée. */
export const card = (title, text, extra = {}) => ({ t: 'card', title, text, ...extra });
/** QCM : Q('Question', ['bonne', 'fausse', 'fausse'], 'explication', { play, visual… }). */
export const Q = (q, choices, explain = null, extra = {}) => ({ t: 'mcq', q, choices, explain, ...extra });
/** Associer les paires. */
export const P = (q, pairs, extra = {}) => ({ t: 'pairs', q, pairs, ...extra });
/** Remettre dans l'ordre. */
export const O = (q, items, explain = null, extra = {}) => ({ t: 'order', q, items, explain, ...extra });
/** Texte à trous : 'Le [filtre] coupe les [aigus].' + mots pièges. */
export const B = (text, bank = [], explain = null, extra = {}) => ({ t: 'blank', q: extra.q || 'Complète la phrase', text, bank, explain, ...extra });
/** Réponse chiffrée. */
export const N = (q, a, { tol = 0, unit = '', explain = null, ...extra } = {}) => ({ t: 'number', q, a, tol, unit, explain, ...extra });
/** Où cliques-tu ? (maquette de Live) */
export const L = (q, target, show, explain = null, extra = {}) => ({ t: 'live', q, target, show, explain, ...extra });
/** Clavier : une note, un accord ou une suite. */
export const K = (q, mode, target, extra = {}) => ({ t: 'keys', q, mode, target, labels: 'c', ...extra });
/** Boîte à rythmes : groove de référence (GRIDS) ou modèle écrit. */
export const G = (q, spec, extra = {}) => ({ t: 'grid', q, ...(typeof spec === 'string' ? GRIDS[spec] : spec), ...extra });
/** Piano roll. */
export const R = (q, extra = {}) => ({ t: 'roll', q, lo: 48, hi: 72, steps: 16, bpm: 110, p: 'pluck', ...extra });
/** Synthé à régler. */
export const S = (q, knobs, extra = {}) => ({ t: 'synth', q, knobs, ...extra });
/** Taper en rythme. */
export const T = (q, extra = {}) => ({ t: 'tap', q, bpm: 100, mode: 'beat', beats: 8, ...extra });
/** Générateur d'exercices (voir GEN dans src/core/coursegen.js). */
export const gen = (name, opts = {}) => ({ gen: name, ...opts });

/** Unité : identifiant, titre, nœuds (leçons, ateliers, missions) ; le contrôle final est ajouté automatiquement. */
export function unit(id, meta, nodes) {
  return { id, ...meta, nodes: [...nodes.map((n) => ({ ...n, id: n.id.startsWith(`${id}-`) ? n.id : `${id}-${n.id}` })), { id: `${id}-cp`, type: 'checkpoint', title: meta.final ? 'Examen final' : 'Contrôle de l’unité', icon: meta.final ? '🎓' : '🏆', desc: '12 exercices de toute l’unité, 3 cœurs. Réussis-le pour débloquer la suite.' }] };
}
export const lesson = (id, title, icon, ex, extra = {}) => ({ id, type: 'lesson', title, icon, ex, ...extra });
/** Atelier : un écran existant de l'app (Lab, Piano Rush, Pad Rush…) avec un objectif. */
export const lab = (id, title, icon, href, check, desc, extra = {}) => ({ id, type: 'lab', title, icon, href, check, desc, ...extra });
/** Mission studio : à faire dans Ableton / Serum / sur le clavier, avec sa checklist. */
export const studio = (id, title, icon, steps, why, extra = {}) => ({ id, type: 'studio', title, icon, steps, why, tool: 'ableton', ...extra });

// ---------- Sons de démonstration (interprétés par src/learn/kit.js) ----------
/** Une progression d'accords, 2 temps par accord. */
export const prog = (syms, { bpm = 100, p = 'piano', beats = 2 } = {}) => ({ k: 'notes', bpm, p, notes: syms.flatMap((s, i) => chordMidi(s).map((m) => [m, i * beats, beats * 0.95, 0.7])) });
/** Une boucle de batterie (16 pas par ligne : x = coup, g = ghost). */
export const drums = (grid, { bpm = 120, kit = 'club', bars = 2, pump = 0, pad = null } = {}) => ({ k: 'drums', grid, bpm, kit, bars, pump, pad });
/** Des notes : [midi, début (temps), durée (temps), vélocité]. */
export const notes = (list, { bpm = 110, p = 'pluck' } = {}) => ({ k: 'notes', notes: list, bpm, p });
/** Un son de synthé (réglages par-dessus le patch de départ, ou preset) joué sur quelques notes. */
export const synth = (over, list = [[48, 0, 1], [55, 1, 1], [60, 2, 2]], extra = {}) => ({ k: 'synth', over: typeof over === 'string' ? null : over, preset: typeof over === 'string' ? over : null, notes: list, bpm: 100, ...extra });
