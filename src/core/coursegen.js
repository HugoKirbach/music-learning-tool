// Générateurs d'exercices du parcours : chaque appel fabrique des exercices concrets (seedés, donc reproductibles).
// Module pur (pas de DOM ni d'audio) : les sons sont décrits par des objets `play` interprétés par src/learn/kit.js.
import { SCALES, mod, degreeChord } from './theory.js';
import { SHORTCUTS, shortcutById, LIVE_ZONES } from '../data/ableton.js';

// ---------- Hasard reproductible ----------
export function rng(seed = 1) {
  let a = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export function shuffle(r, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** n éléments distincts au hasard. */
export const sample = (r, arr, n) => shuffle(r, arr).slice(0, n);

// ---------- Noms de notes (Ableton : C3 = 60) ----------
const FR = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const frName = (pc) => FR[mod(pc, 12)];
export const enName = (pc) => EN[mod(pc, 12)];
/** « Ré (D) » */
export const noteName = (pc) => `${frName(pc)} (${enName(pc)})`;
/** Convention Ableton : 60 → C3. */
export const liveName = (m) => `${EN[mod(m, 12)]}${Math.floor(m / 12) - 2}`;
/** 'C3' → 60, 'F#1' → 42, 'Bb2' → 58 (convention Ableton). */
export function liveNote(s) {
  const m = /^([A-G])([#b♯♭]?)(-?\d)$/.exec(String(s).trim());
  if (!m) throw new Error(`Note invalide : ${s}`);
  return PC[m[1]] + ({ '#': 1, '♯': 1, b: -1, '♭': -1 }[m[2]] || 0) + (Number(m[3]) + 2) * 12;
}
/** 'C' → 0, 'F#' → 6, 'Bb' → 10. */
export const pcOf = (s) => mod(PC[s[0]] + ({ '#': 1, '♯': 1, b: -1, '♭': -1 }[s.slice(1)] || 0), 12);

// ---------- Accords ----------
export const QUALITIES = {
  maj: { name: 'majeur', iv: [0, 4, 7], sym: '' },
  min: { name: 'mineur', iv: [0, 3, 7], sym: 'm' },
  dim: { name: 'diminué', iv: [0, 3, 6], sym: 'dim' },
  aug: { name: 'augmenté', iv: [0, 4, 8], sym: 'aug' },
  sus2: { name: 'sus2', iv: [0, 2, 7], sym: 'sus2' },
  sus4: { name: 'sus4', iv: [0, 5, 7], sym: 'sus4' },
  maj7: { name: 'majeur 7', iv: [0, 4, 7, 11], sym: 'maj7' },
  m7: { name: 'mineur 7', iv: [0, 3, 7, 10], sym: 'm7' },
  dom7: { name: 'septième de dominante', iv: [0, 4, 7, 10], sym: '7' },
};
/** 'Am' → { root: 9, q: 'min', pcs: [9, 0, 4] } ; accepte C, Am, F#m, Bb, Cmaj7, Dm7, G7, Bdim, Csus4. */
export function parseChordName(sym) {
  const m = /^([A-G][#b]?)(maj7|m7|m|dim|aug|sus2|sus4|7)?$/.exec(sym);
  if (!m) throw new Error(`Accord inconnu : ${sym}`);
  const q = { undefined: 'maj', m: 'min', dim: 'dim', aug: 'aug', sus2: 'sus2', sus4: 'sus4', maj7: 'maj7', m7: 'm7', 7: 'dom7' }[m[2]];
  const root = pcOf(m[1]);
  return { root, q, pcs: QUALITIES[q].iv.map((i) => mod(root + i, 12)), name: `${noteName(root).replace(/ \(.+\)/, '')} ${QUALITIES[q].name}`, sym };
}
/** Notes MIDI d'un accord en position serrée autour de C3 (60). */
export function chordMidi(sym, base = 57) {
  const c = parseChordName(sym);
  let r = base + mod(c.root - base, 12);
  return QUALITIES[c.q].iv.map((i) => r + i);
}

// ---------- Fabriques d'exercices ----------
/** QCM : la 1re proposition est la bonne ; elles sont mélangées à la construction de la leçon. */
const mcq = (q, right, wrong, extra = {}) => ({ t: 'mcq', q, choices: [right, ...wrong], ...extra });

const NOTES_WHITE = [0, 2, 4, 5, 7, 9, 11];

export const GEN = {
  /** Trouve une note sur le clavier (classe de hauteur : n'importe quelle octave). */
  findNote(r, { pcs = NOTES_WHITE, labels = 'c', n = 3 } = {}) {
    return sample(r, pcs, Math.min(n, pcs.length)).map((pc) => ({
      t: 'keys', mode: 'note', target: [pc], labels, q: `Trouve le ${noteName(pc)}`,
      explain: pc === 0 ? 'Les Do sont juste à gauche de chaque groupe de 2 touches noires.' : pc === 5 ? 'Les Fa sont juste à gauche de chaque groupe de 3 touches noires.' : null,
    }));
  },
  /** Quelle est la note allumée ? */
  nameNote(r, { pcs = NOTES_WHITE, n = 2, lang = 'both' } = {}) {
    return sample(r, pcs, Math.min(n, pcs.length)).map((pc) => {
      const label = lang === 'en' ? enName : lang === 'fr' ? frName : noteName;
      const wrong = sample(r, pcs.filter((x) => x !== pc), 3).map(label);
      return mcq('Quelle est la note allumée ?', label(pc), wrong, { visual: { k: 'keyboard', lit: [48 + pc + (pc < 5 ? 12 : 0)], lo: 48, hi: 71 } });
    });
  },
  /** Joue une note précise (octave comprise, convention Ableton). */
  exactNote(r, { notes = ['C3'], lo = 48, hi = 72, octaveButtons = false, n = 2 } = {}) {
    return sample(r, notes, Math.min(n, notes.length)).map((s) => ({
      t: 'keys', mode: 'note', exact: true, target: [liveNote(s)], lo, hi, octaveButtons, labels: 'oct',
      q: `Joue le ${s} (${frName(liveNote(s))} de l’octave ${s.slice(-1)})`,
      explain: 'Dans Ableton, le Do central est C3 (note MIDI 60). Chaque octave ajoute ou retire 12.',
    }));
  },
  /** Nombre de demi-tons entre deux notes. */
  semitones(r, { n = 2, max = 12 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = Math.floor(r() * 7);
      const st = 1 + Math.floor(r() * max);
      const pa = NOTES_WHITE[a];
      out.push({ t: 'number', q: `Combien de demi-tons de ${noteName(pa)} jusqu’au ${noteName(pa + st)} au-dessus ?`, a: st, tol: 0, unit: 'demi-tons',
        visual: { k: 'keyboard', lit: [60 + pa, 60 + pa + st], lo: 60, hi: 84 }, explain: 'Compte chaque touche (blanche ET noire) en partant de la première, sans la compter.' });
    }
    return out;
  },
  /** Joue une gamme, note par note. */
  scale(r, { roots = ['C'], scale = 'major', n = 1 } = {}) {
    return sample(r, roots, Math.min(n, roots.length)).map((rt) => {
      const root = pcOf(rt);
      const st = SCALES[scale].steps;
      const target = [...st.map((s) => mod(root + s, 12)), root];
      return { t: 'keys', mode: 'seq', target, labels: 'c', q: `Joue la gamme de ${noteName(root)} ${SCALES[scale].name.split(' (')[0].toLowerCase()}, en montant, jusqu’à la tonique suivante`,
        explain: `Les notes : ${target.map((p) => enName(p)).join(' – ')}.` };
    });
  },
  /** Quelle note n'est pas dans la gamme ? */
  notInScale(r, { roots = ['C', 'A'], scale = 'major', n = 2 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const root = pcOf(pick(r, roots));
      const st = SCALES[scale].steps.map((s) => mod(root + s, 12));
      const outside = Array.from({ length: 12 }, (_, k) => k).filter((k) => !st.includes(k));
      const right = pick(r, outside);
      out.push(mcq(`Quelle note n’est PAS dans la gamme de ${noteName(root)} ${SCALES[scale].name.split(' (')[0].toLowerCase()} ?`, noteName(right), sample(r, st, 3).map(noteName),
        { explain: `La gamme : ${st.map(enName).join(' ')}.` }));
    }
    return out;
  },
  /** Construis un accord sur le clavier (n'importe quel renversement). */
  chord(r, { chords = ['C', 'Am', 'F', 'G'], n = 3 } = {}) {
    return sample(r, chords, Math.min(n, chords.length)).map((sym) => {
      const c = parseChordName(sym);
      return { t: 'keys', mode: 'chord', target: c.pcs, labels: 'c', q: `Joue l’accord de ${c.name} (${sym})`,
        explain: `${sym} = ${c.pcs.map(enName).join(' + ')} : fondamentale, ${['maj7', 'm7', 'dom7'].includes(c.q) ? 'tierce, quinte et septième' : 'tierce et quinte'}.` };
    });
  },
  /** Majeur ou mineur (ou plus) à l'oreille. */
  chordEar(r, { qualities = ['maj', 'min'], n = 3 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const q = pick(r, qualities);
      const root = 55 + Math.floor(r() * 9);
      const notes = QUALITIES[q].iv.map((iv) => root + iv);
      out.push(mcq('Écoute : quel type d’accord ?', QUALITIES[q].name, qualities.filter((x) => x !== q).map((x) => QUALITIES[x].name), {
        play: { k: 'chord', notes, p: 'epiano' }, autoplay: true, ear: `chord:${q}`,
        explain: { maj: 'Majeur : lumineux, stable (tierce majeure, 4 demi-tons).', min: 'Mineur : plus sombre, mélancolique (tierce mineure, 3 demi-tons).', dim: 'Diminué : tendu, instable (deux tierces mineures).', aug: 'Augmenté : flottant, étrange (deux tierces majeures).', sus2: 'Sus : ni majeur ni mineur, en suspens.', sus4: 'Sus : ni majeur ni mineur, en suspens.', maj7: 'Majeur 7 : rêveur, jazzy.', m7: 'Mineur 7 : doux, lo-fi, deep house.', dom7: '7 de dominante : bluesy, veut se résoudre.' }[q],
      }));
    }
    return out;
  },
  /** Gamme majeure ou mineure à l'oreille. */
  scaleEar(r, { n = 2 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const minor = r() < 0.5;
      const root = 57 + Math.floor(r() * 6);
      const st = SCALES[minor ? 'minor' : 'major'].steps;
      const notes = [...st, 12].map((s, k) => [root + s, k * 0.5, 0.5]);
      out.push(mcq('Écoute cette gamme : majeure ou mineure ?', minor ? 'Mineure' : 'Majeure', [minor ? 'Majeure' : 'Mineure'], {
        play: { k: 'notes', notes, bpm: 132, p: 'pluck' }, autoplay: true, ear: `scale:${minor ? 'min' : 'maj'}`,
        explain: minor ? 'La 3e note est proche de la 2e (tierce mineure) : couleur sombre.' : 'La 3e note est loin de la 1re (tierce majeure) : couleur lumineuse.' }));
    }
    return out;
  },
  /** Accord d'un degré dans une tonalité. */
  degree(r, { key = 'C', minor = false, degrees = [0, 3, 4, 5], n = 2, play = false } = {}) {
    const root = pcOf(key);
    const scale = minor ? 'minor' : 'major';
    const R = minor ? ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'] : ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const symOf = (d) => { const c = degreeChord(root, scale, d); return enName(c.rootPc).replace('♯', '#') + { maj: '', min: 'm', dim: 'dim' }[c.quality.q]; };
    return sample(r, degrees, Math.min(n, degrees.length)).map((d) => {
      const sym = symOf(d);
      if (play) {
        const c = parseChordName(sym);
        return { t: 'keys', mode: 'chord', target: c.pcs, labels: 'c', q: `En ${noteName(root)} ${minor ? 'mineur' : 'majeur'}, joue l’accord du degré ${R[d]}`, explain: `Le degré ${R[d]} est ${sym} (${c.pcs.map(enName).join(' + ')}).` };
      }
      const wrong = sample(r, [0, 1, 2, 3, 4, 5].filter((x) => x !== d), 3).map(symOf);
      return mcq(`En ${noteName(root)} ${minor ? 'mineur' : 'majeur'}, quel est l’accord du degré ${R[d]} ?`, sym, wrong, { explain: `On part de la ${d + 1}e note de la gamme et on empile des tierces dans la gamme : ${sym}.` });
    });
  },
  /** Intervalles à l'oreille. */
  intervalEar(r, { set = [3, 4, 7, 12], n = 3 } = {}) {
    const NAMES = { 1: 'Demi-ton', 2: 'Seconde (ton)', 3: 'Tierce mineure', 4: 'Tierce majeure', 5: 'Quarte', 6: 'Triton', 7: 'Quinte', 9: 'Sixte majeure', 10: 'Septième mineure', 12: 'Octave' };
    const out = [];
    for (let i = 0; i < n; i++) {
      const st = pick(r, set);
      const a = 55 + Math.floor(r() * 8);
      out.push(mcq('Écoute ces deux notes : quel intervalle ?', NAMES[st], set.filter((x) => x !== st).map((x) => NAMES[x]), {
        play: { k: 'notes', notes: [[a, 0, 1], [a + st, 1, 1.5]], bpm: 100, p: 'piano' }, autoplay: true, ear: `interval:${st}`,
        explain: { 3: 'Tierce mineure : 3 demi-tons, couleur triste.', 4: 'Tierce majeure : 4 demi-tons, couleur joyeuse.', 5: 'Quarte : 5 demi-tons (« Al-lons » de la Marseillaise).', 7: 'Quinte : 7 demi-tons, très stable (Star Wars).', 12: 'Octave : la même note, plus aiguë.', 2: 'Un ton = 2 demi-tons.', 1: 'Demi-ton : deux touches voisines.', 6: 'Triton : 6 demi-tons, très tendu.', 9: 'Sixte majeure : 9 demi-tons.', 10: 'Septième mineure : 10 demi-tons.' }[st],
      }));
    }
    return out;
  },
  /** Contour d'une mélodie. */
  contourEar(r, { n = 3 } = {}) {
    const kinds = { up: 'Elle monte', down: 'Elle descend', wave: 'Elle monte puis redescend' };
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = pick(r, Object.keys(kinds));
      const sc = [0, 2, 4, 5, 7, 9, 11, 12];
      const idx = k === 'up' ? [0, 1, 2, 4, 5] : k === 'down' ? [7, 5, 4, 2, 0] : [0, 2, 4, 2, 0];
      const base = 60 + Math.floor(r() * 3) * 2;
      out.push(mcq('Écoute la mélodie : que fait-elle ?', kinds[k], Object.keys(kinds).filter((x) => x !== k).map((x) => kinds[x]), {
        play: { k: 'notes', notes: idx.map((j, s) => [base + sc[j], s * 0.5, 0.5]), bpm: 110, p: 'pluck' }, autoplay: true, ear: `contour:${k}` }));
    }
    return out;
  },
  /** Quelle forme d'onde ? (à l'oreille ou à l'œil) */
  wave(r, { mode = 'ear', waves = ['sine', 'sawtooth', 'square', 'triangle'], n = 2 } = {}) {
    const NAMES = { sine: 'Sinus', sawtooth: 'Dent de scie (saw)', square: 'Carré (square)', triangle: 'Triangle' };
    return sample(r, waves, Math.min(n, waves.length)).map((w) => {
      const wrong = waves.filter((x) => x !== w).map((x) => NAMES[x]);
      if (mode === 'see') return mcq('Quelle forme d’onde vois-tu ?', NAMES[w], wrong, { visual: { k: 'wave', wave: w } });
      return mcq('Écoute : quelle forme d’onde ?', NAMES[w], wrong, {
        play: { k: 'synth', over: { osc: [{ wave: w, semi: 0, voices: 1, detune: 0, level: 1 }], filter: { cutoff: 16000, q: 0.5 }, amp: { a: 0.01, d: 0.3, s: 0.8, r: 0.15 }, reverb: 0, gain: 0.45 }, notes: [[48, 0, 1.6]] }, autoplay: true, ear: `wave:${w}`,
        explain: { sine: 'Sinus : pur et rond, une seule harmonique (sub, sifflement).', sawtooth: 'Scie : la plus brillante et riche, toutes les harmoniques (leads, supersaw, basses).', square: 'Carré : creux, « boisé », 8-bit (harmoniques impaires).', triangle: 'Triangle : doux, un peu plus de présence que le sinus.' }[w] });
    });
  },
  /** Filtre ouvert ou fermé ? */
  filterEar(r, { n = 2 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const open = r() < 0.5;
      out.push(mcq('Écoute : le filtre passe-bas est-il ouvert ou fermé ?', open ? 'Ouvert : son brillant' : 'Fermé : son étouffé', [open ? 'Fermé : son étouffé' : 'Ouvert : son brillant'], {
        play: { k: 'synth', over: { osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 1 }], filter: { cutoff: open ? 9000 : 350, q: 1 }, amp: { a: 0.01, d: 0.3, s: 0.8, r: 0.2 }, reverb: 0.1 }, notes: [[48, 0, 0.5], [55, 0.5, 0.5], [60, 1, 1]] }, autoplay: true, ear: `filter:${open}`,
        explain: open ? 'Cutoff haut : les aigus passent, le son est brillant.' : 'Cutoff bas : les aigus sont coupés, le son est sourd, « derrière une porte ».' }));
    }
    return out;
  },
  /** Attaque courte ou longue, release long ou court. */
  envEar(r, { n = 2 } = {}) {
    const kinds = {
      pluck: { label: 'Percussif (pluck)', amp: { a: 0.003, d: 0.25, s: 0, r: 0.15 } },
      pad: { label: 'Lent qui gonfle (pad)', amp: { a: 0.8, d: 0.5, s: 0.8, r: 1.2 } },
      organ: { label: 'Net et tenu (orgue)', amp: { a: 0.005, d: 0.1, s: 1, r: 0.05 } },
    };
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = pick(r, Object.keys(kinds));
      out.push(mcq('Écoute l’enveloppe de ce son : comment est-il ?', kinds[k].label, Object.keys(kinds).filter((x) => x !== k).map((x) => kinds[x].label), {
        play: { k: 'synth', over: { osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 1 }], filter: { cutoff: 2500, q: 0.7 }, amp: kinds[k].amp, reverb: 0.15 }, notes: [[57, 0, 1.5], [60, 2, 1.5]], bpm: 100 }, autoplay: true, ear: `env:${k}`,
        explain: { pluck: 'Attaque immédiate, sustain à 0 : le son s’éteint tout seul.', pad: 'Attaque lente et release long : le son gonfle puis traîne.', organ: 'Attaque immédiate, sustain au maximum : le son reste tant que la touche est tenue, puis s’arrête net.' }[k] }));
    }
    return out;
  },
  /** Le plus rapide (tempo) à l'oreille. */
  tempoEar(r, { n = 1 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = 80 + Math.floor(r() * 30), b = a + 25 + Math.floor(r() * 25);
      const fastFirst = r() < 0.5;
      out.push(mcq('Écoute A puis B : lequel a le tempo le plus rapide ?', fastFirst ? 'A' : 'B', [fastFirst ? 'B' : 'A'], {
        plays: [{ label: 'A', play: { k: 'click', bpm: fastFirst ? b : a, beats: 6 } }, { label: 'B', play: { k: 'click', bpm: fastFirst ? a : b, beats: 6 } }],
        explain: 'Plus de battements par minute (BPM) = clics plus rapprochés.' }));
    }
    return out;
  },
  /** Plus fort / plus faible : la vélocité. */
  velocityEar(r, { n = 1 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const loudFirst = r() < 0.5;
      const mk = (v) => ({ k: 'notes', notes: [[60, 0, 1, v], [64, 0, 1, v], [67, 0, 1, v]], p: 'epiano' });
      out.push(mcq('Même accord, deux frappes : laquelle a la plus forte vélocité ?', loudFirst ? 'A' : 'B', [loudFirst ? 'B' : 'A'], {
        plays: [{ label: 'A', play: mk(loudFirst ? 1 : 0.3) }, { label: 'B', play: mk(loudFirst ? 0.3 : 1) }],
        explain: 'Vélocité forte = plus fort, et souvent plus brillant (l’instrument ouvre son filtre).' }));
    }
    return out;
  },
  /** Calculs de producteur (tempo → millisecondes, mesures → secondes). */
  calc(r, { kinds = ['beatMs'], n = 2, bpms = [100, 120, 125, 128, 140, 150] } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = pick(r, kinds);
      const bpm = pick(r, bpms);
      const beat = 60000 / bpm;
      const Q = {
        beatMs: [`À ${bpm} BPM, combien dure une noire (un temps) en millisecondes ?`, beat, 'ms', `60 000 ÷ ${bpm} = ${Math.round(beat)} ms.`],
        eighthMs: [`À ${bpm} BPM, quel delay en ms pour une croche (1/8) ?`, beat / 2, 'ms', `Une noire = 60 000 ÷ ${bpm} = ${Math.round(beat)} ms ; une croche = la moitié.`],
        sixteenthMs: [`À ${bpm} BPM, combien dure une double croche (1/16) en ms ?`, beat / 4, 'ms', `Une noire ÷ 4 = ${Math.round(beat / 4)} ms.`],
        dottedMs: [`À ${bpm} BPM, quel delay en ms pour une croche pointée (1/8 dotted) ?`, beat * 0.75, 'ms', `Croche pointée = 3/4 de noire = ${Math.round(beat * 0.75)} ms.`],
        barSec: [`À ${bpm} BPM, combien de secondes dure une mesure de 4 temps ?`, (4 * 60) / bpm, 's', `4 temps × 60 ÷ ${bpm} = ${((4 * 60) / bpm).toFixed(2).replace('.', ',')} s.`],
        lfoHz: [`À ${bpm} BPM, un LFO synchronisé sur la noire (1/4) tourne à combien de Hz ?`, bpm / 60, 'Hz', `${bpm} battements par minute ÷ 60 = ${(bpm / 60).toFixed(2).replace('.', ',')} par seconde.`],
      }[k];
      const tol = Q[2] === 'ms' ? 2 : 0.05;
      out.push({ t: 'number', q: Q[0], a: Math.round(Q[1] * 100) / 100, tol, unit: Q[2], explain: Q[3] });
    }
    return out;
  },
  /** Notes de batterie General MIDI (Drum Rack). */
  drumNotes(r, { n = 2 } = {}) {
    const D = [[36, 'Kick', 'C1'], [38, 'Snare', 'D1'], [39, 'Clap', 'D#1'], [42, 'Hi-hat fermé', 'F#1'], [46, 'Hi-hat ouvert', 'A#1']];
    return sample(r, D, n).map(([note, name, oct]) => mcq(`Dans un Drum Rack (standard GM), sur quelle note est le ${name.toLowerCase()} ?`, `${note} (${oct})`, sample(r, D.filter((d) => d[0] !== note), 3).map((d) => `${d[0]} (${d[2]})`),
      { explain: 'Kick 36 (C1), snare 38 (D1), clap 39 (D#1), hat fermé 42 (F#1), hat ouvert 46 (A#1) : la convention GM, la même sur le MPC.' }));
  },
  /** Raccourcis : « appuie sur… » ou « que fait… ». */
  shortcut(r, { ids = SHORTCUTS.map((s) => s.id), n = 3, reverse = false } = {}) {
    return sample(r, ids, Math.min(n, ids.length)).map((id) => {
      const s = shortcutById(id);
      const others = sample(r, SHORTCUTS.filter((x) => x.id !== id && x.keys !== s.keys), 3);
      if (reverse) return { t: 'mcq', q: `Dans Live, que fait ${s.keys.replace('Mod', 'Ctrl/Cmd')} ?`, choices: [s.action, ...others.map((o) => o.action)], keycaps: s.keys };
      return { t: 'shortcut', q: s.action, keys: s.keys, choices: [s.keys, ...others.map((o) => o.keys)], capture: s.capture !== false };
    });
  },
  /** Où est… ? dans la maquette de Live. */
  where(r, { zones, n = 2, show } = {}) {
    return sample(r, zones, Math.min(n, zones.length)).map((z) => ({ t: 'live', q: `Clique sur : ${LIVE_ZONES[z].name}`, target: z, show: show || [LIVE_ZONES[z].part === 'browser' ? 'browser' : LIVE_ZONES[z].part === 'control' ? 'control' : LIVE_ZONES[z].part], explain: LIVE_ZONES[z].desc }));
  },
  /** Lire une position d'Ableton (mesure.temps.double-croche). */
  position(r, { n = 2 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const bar = 1 + Math.floor(r() * 8), beat = 1 + Math.floor(r() * 4), six = 1 + Math.floor(r() * 4);
      const ask = pick(r, ['mesure', 'temps']);
      const right = ask === 'mesure' ? bar : beat;
      const wrong = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== right)).slice(0, 3).map(String);
      out.push(mcq(`Live affiche la position ${bar}.${beat}.${six}. Quel est le numéro de ${ask === 'mesure' ? 'la mesure' : 'temps'} ?`, String(right), wrong,
        { explain: `Format : mesure.temps.double-croche → mesure ${bar}, temps ${beat}, double croche ${six}.` }));
    }
    return out;
  },
  /** Relatif mineur / majeur. */
  relative(r, { n = 2 } = {}) {
    const keys = ['C', 'G', 'D', 'F', 'A', 'E'];
    return sample(r, keys, n).map((k) => {
      const pc = pcOf(k);
      const rel = mod(pc + 9, 12);
      return mcq(`Quel est le relatif mineur de ${noteName(pc)} majeur ?`, `${noteName(rel)} mineur`, sample(r, [2, 4, 5, 7, 11].map((d) => mod(pc + d, 12)), 3).map((x) => `${noteName(x)} mineur`),
        { explain: 'Le relatif mineur commence sur la 6e note de la gamme majeure (3 demi-tons sous la tonique) et utilise les mêmes notes.' });
    });
  },
  /** Grille de batterie à reproduire à l'oreille (le modèle est caché). */
  gridEar(r, { patterns = ['otf', 'backbeat'], n = 1 } = {}) {
    return sample(r, patterns, n).map((id) => ({ ...GRIDS[id], t: 'grid', ear: true, q: `Écoute et reproduis : ${GRIDS[id].name}` }));
  },
  /** Rythme lu sur la grille : combien de coups ? */
  countHits(r, { n = 1 } = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = 3 + Math.floor(r() * 6);
      const steps = sample(r, Array.from({ length: 16 }, (_, j) => j), k).sort((a, b) => a - b);
      const row = Array.from({ length: 16 }, (_, j) => (steps.includes(j) ? 'x' : '.')).join('');
      out.push({ t: 'number', q: 'Combien de coups de hi-hat dans cette mesure ?', a: k, tol: 0, visual: { k: 'grid', rows: { hat: row } }, explain: 'Chaque case allumée = une double croche jouée.' });
    }
    return out;
  },
};

/** Grooves de référence (16 pas : x = coup, g = ghost note). */
export const GRIDS = {
  otf: { name: 'four on the floor', rows: ['kick'], target: { kick: 'x...x...x...x...' }, bpm: 120 },
  backbeat: { name: 'backbeat', rows: ['kick', 'snare', 'hat'], target: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, bpm: 96, kit: 'acoustic' },
  house: { name: 'groove house', rows: ['kick', 'clap', 'hat'], target: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.' }, bpm: 124 },
  offhat: { name: 'hats à contretemps', rows: ['kick', 'hat'], target: { kick: 'x...x...x...x...', hat: '..x...x...x...x.' }, bpm: 122 },
  boombap: { name: 'boom bap', rows: ['kick', 'snare', 'hat'], target: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, bpm: 90, kit: 'lofi' },
  techno: { name: 'techno', rows: ['kick', 'hat', 'ohat', 'clap'], target: { kick: 'x...x...x...x...', hat: 'xxxxxxxxxxxxxxxx', ohat: '..x...x...x...x.', clap: '....x.......x...' }, bpm: 130, kit: 'hard' },
};

/** Liste des générateurs (pour les tests). */
export const GEN_IDS = Object.keys(GEN);
