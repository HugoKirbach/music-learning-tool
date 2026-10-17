// Définition des paramètres du synthé (UI générique, correspondance Serum 2, comparaison de sons). Module pur.
import { withDefaults } from '../data/presets.js';

export const WAVES = [
  { value: 'sawtooth', label: 'Saw' }, { value: 'square', label: 'Carré' },
  { value: 'triangle', label: 'Triangle' }, { value: 'sine', label: 'Sinus' },
];

export const PARAMS = [
  { id: 'wave1', group: 'Oscillateurs', label: 'Osc A', path: 'osc.0.wave', options: WAVES, serum: 'Osc A : choisis la wavetable (Basic Shapes) / sa position', explain: 'La forme d’onde = la matière première. Saw : riche et brillante. Carré : creux, « 8-bit ». Triangle/sinus : doux.' },
  { id: 'voices', group: 'Oscillateurs', label: 'Unison', path: 'osc.0.voices', min: 1, max: 7, step: 1, serum: 'Osc A : UNISON (nombre de voix)', explain: 'Empile plusieurs copies désaccordées : son large (supersaw).' },
  { id: 'detune', group: 'Oscillateurs', label: 'Detune', path: 'osc.0.detune', min: 0, max: 50, step: 1, unit: 'ct', serum: 'Osc A : DETUNE', explain: 'Écart entre les voix d’unison. Peu = chorus, beaucoup = épais et « sale ».' },
  { id: 'wave2', group: 'Oscillateurs', label: 'Osc B', path: 'osc.1.wave', options: WAVES, serum: 'Osc B : forme', explain: 'Un 2e oscillateur ajoute de la couleur (souvent à l’octave).' },
  { id: 'semi2', group: 'Oscillateurs', label: 'Osc B demi-tons', path: 'osc.1.semi', min: -24, max: 24, step: 1, serum: 'Osc B : OCT / SEMI', explain: '+12 = octave au-dessus, +7 = quinte (son « power »).' },
  { id: 'level2', group: 'Oscillateurs', label: 'Osc B niveau', path: 'osc.1.level', min: 0, max: 1, step: 0.01, serum: 'Osc B : LEVEL', explain: '' },
  { id: 'fmIndex', group: 'Oscillateurs', label: 'FM quantité', path: 'fm.index', min: 0, max: 6, step: 0.05, serum: 'Osc A Warp « FM (from B) » (quantité)', explain: 'Modulation de fréquence : ajoute des harmoniques métalliques ou « tine » (e-piano, cloches, basses FM).' },
  { id: 'fmRatio', group: 'Oscillateurs', label: 'FM ratio', path: 'fm.ratio', min: 0.5, max: 8, step: 0.5, serum: 'Osc B : Coarse (ratio de fréquence du modulateur)', explain: 'Ratio entier = son harmonique (piano, orgue). Ratio non entier = cloche, métal.' },
  { id: 'width', group: 'Oscillateurs', label: 'Largeur stéréo', path: 'width', min: 0, max: 1, step: 0.01, serum: 'Osc A : STEREO (largeur de l’unison)', explain: 'Répartit les voix d’unison à gauche et à droite. Garde les basses étroites (mono) !' },
  { id: 'noise', group: 'Oscillateurs', label: 'Bruit', path: 'noise', min: 0, max: 0.3, step: 0.005, serum: 'Oscillateur NOISE (niveau)', explain: 'Un peu de bruit = souffle, air, attaque plus « vivante ».' },
  { id: 'sub', group: 'Oscillateurs', label: 'Sub', path: 'sub', min: 0, max: 1, step: 0.01, serum: 'SUB (sinus une octave sous)', explain: 'Ajoute du poids dans le grave sans salir le reste.' },
  { id: 'ftype', group: 'Filtre', label: 'Type', path: 'filter.type', options: [{ value: 'lowpass', label: 'Passe-bas' }, { value: 'highpass', label: 'Passe-haut' }, { value: 'bandpass', label: 'Passe-bande' }], serum: 'FILTER : MG Low 12/24, High, Band', explain: 'Passe-bas = retire les aigus (le plus utilisé).' },
  { id: 'slope', group: 'Filtre', label: 'Pente', path: 'filter.slope', options: [{ value: 12, label: '12 dB' }, { value: 24, label: '24 dB' }], serum: 'Type de filtre : Low 12 / Low 24 (MG Low 24 = ladder Moog)', explain: '24 dB coupe plus franchement : plus « analogique » et gras. 12 dB est plus doux et ouvert.' },
  { id: 'cutoff', group: 'Filtre', label: 'Cutoff', path: 'filter.cutoff', min: 40, max: 16000, log: true, unit: 'Hz', serum: 'FILTER : CUTOFF', explain: 'Fréquence de coupure : plus bas = plus sombre / étouffé.' },
  { id: 'q', group: 'Filtre', label: 'Résonance', path: 'filter.q', min: 0.1, max: 20, log: true, serum: 'FILTER : RES', explain: 'Accentue la fréquence de coupure : son « acid », sifflant.' },
  { id: 'envAmt', group: 'Filtre', label: 'Env → Cutoff', path: 'filter.envAmt', min: 0, max: 5, step: 0.1, unit: 'oct', serum: 'ENV 2 glissé sur CUTOFF (quantité)', explain: 'L’enveloppe ouvre le filtre à chaque note : c’est ce qui fait un pluck ou un stab.' },
  { id: 'fdecay', group: 'Filtre', label: 'Env filtre decay', path: 'fenv.d', min: 0.01, max: 2, log: true, unit: 's', serum: 'ENV 2 : DECAY', explain: 'Vitesse à laquelle le filtre se referme.' },
  { id: 'attack', group: 'Enveloppe', label: 'Attack', path: 'amp.a', min: 0.001, max: 2, log: true, unit: 's', serum: 'ENV 1 : ATTACK', explain: 'Temps de montée du volume. Court = percussif, long = pad qui « gonfle ».' },
  { id: 'decay', group: 'Enveloppe', label: 'Decay', path: 'amp.d', min: 0.01, max: 3, log: true, unit: 's', serum: 'ENV 1 : DECAY', explain: 'Temps pour descendre au niveau de sustain.' },
  { id: 'sustain', group: 'Enveloppe', label: 'Sustain', path: 'amp.s', min: 0, max: 1, step: 0.01, serum: 'ENV 1 : SUSTAIN', explain: 'Niveau tant que la touche est tenue. 0 = son qui s’éteint seul (pluck).' },
  { id: 'release', group: 'Enveloppe', label: 'Release', path: 'amp.r', min: 0.01, max: 3, log: true, unit: 's', serum: 'ENV 1 : RELEASE', explain: 'Queue après relâchement de la touche.' },
  { id: 'lfoTarget', group: 'LFO & FX', label: 'LFO →', path: 'lfo.target', options: [{ value: 'none', label: 'Off' }, { value: 'cutoff', label: 'Cutoff' }, { value: 'pitch', label: 'Pitch' }, { value: 'amp', label: 'Volume' }], serum: 'LFO 1 glissé sur la destination', explain: 'Le LFO fait bouger un paramètre en boucle : wobble (cutoff), vibrato (pitch), tremolo (volume).' },
  { id: 'lfoRate', group: 'LFO & FX', label: 'LFO vitesse', path: 'lfo.rate', min: 0.1, max: 12, log: true, unit: 'Hz', serum: 'LFO 1 : RATE (ou BPM sync)', explain: '' },
  { id: 'lfoDepth', group: 'LFO & FX', label: 'LFO quantité', path: 'lfo.depth', min: 0, max: 1, step: 0.01, serum: 'Quantité dans la Matrix', explain: '' },
  { id: 'glide', group: 'LFO & FX', label: 'Glide', path: 'glide', min: 0, max: 0.3, step: 0.005, unit: 's', serum: 'PORTA (+ mode Mono / Legato)', explain: 'Glissement de hauteur entre deux notes (acid, 808).' },
  { id: 'chorus', group: 'LFO & FX', label: 'Chorus', path: 'chorus', min: 0, max: 1, step: 0.01, serum: 'FX : CHORUS (Mix)', explain: 'Double le son avec un léger désaccord mouvant : largeur et douceur (pads, e-piano, années 80).' },
  { id: 'delay', group: 'LFO & FX', label: 'Delay', path: 'delay', min: 0, max: 1, step: 0.01, serum: 'FX : DELAY Ping-Pong 1/8 pointé (Mix)', explain: 'Échos synchronisés au tempo (croche pointée) : donne de l’espace et du rythme aux plucks et leads.' },
  { id: 'reverb', group: 'LFO & FX', label: 'Reverb', path: 'reverb', min: 0, max: 1, step: 0.01, serum: 'FX : REVERB (Mix)', explain: 'L’espace. Beaucoup sur les pads, peu (ou pas) sur les basses.' },
  { id: 'drive', group: 'LFO & FX', label: 'Drive', path: 'drive', min: 0, max: 1, step: 0.01, serum: 'FX : DISTORTION', explain: 'Saturation : ajoute des harmoniques et de l’agressivité.' },
];

export const paramById = (id) => PARAMS.find((p) => p.id === id);

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = val;
}

/** Garantit la présence d'un Osc B (niveau 0 si absent) pour l'interface. */
export function normalizeParams(p) {
  const c = withDefaults(p);
  if (!c.osc[1]) c.osc[1] = { wave: 'sawtooth', semi: 12, voices: 1, detune: 0, level: 0 };
  return c;
}

export function norm(def, v) {
  if (def.options) return v;
  if (def.log) return (Math.log(v) - Math.log(def.min)) / (Math.log(def.max) - Math.log(def.min));
  return (v - def.min) / (def.max - def.min);
}

export function fromNorm(def, x) {
  if (def.log) return Math.exp(Math.log(def.min) + x * (Math.log(def.max) - Math.log(def.min)));
  return def.min + x * (def.max - def.min);
}

/** Similarité 0..100 sur une liste de paramètres. */
export function similarity(a, b, ids) {
  let total = 0;
  const detail = {};
  for (const id of ids) {
    const def = paramById(id);
    const va = getPath(a, def.path), vb = getPath(b, def.path);
    let s;
    if (def.options) s = va === vb ? 1 : 0;
    else s = Math.max(0, 1 - Math.abs(norm(def, va) - norm(def, vb)) * 2.5);
    detail[id] = s;
    total += s;
  }
  return { score: Math.round((100 * total) / ids.length), detail };
}

export function formatParam(def, v) {
  if (def.options) return def.options.find((o) => o.value === v)?.label ?? v;
  if (def.unit === 'Hz') return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
  if (def.unit === 's') return v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`;
  if (def.step >= 1) return String(Math.round(v));
  return (Math.round(v * 100) / 100).toString();
}

// Valeurs « franches » utilisées pour les défis (différences audibles).
export const CHALLENGE_VALUES = {
  wave1: ['sawtooth', 'square', 'triangle', 'sine'],
  cutoff: [250, 800, 2500, 8000],
  q: [0.7, 4, 12],
  attack: [0.002, 0.15, 0.8],
  decay: [0.12, 0.5, 1.5],
  sustain: [0, 0.5, 1],
  voices: [1, 3, 7],
  envAmt: [0, 1.5, 3.5],
  lfoTarget: ['none', 'cutoff', 'pitch'],
  release: [0.05, 0.6, 2],
  drive: [0, 0.6],
};
