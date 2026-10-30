// Boîte à outils du studio (module pur) : tempo ↔ millisecondes, tap tempo, roue Camelot (mix harmonique),
// fréquence des notes (accorder un kick ou une basse) et accords d'une tonalité.
import { NOTE_NAMES, midiToFreq, mod, slotChord } from './theory.js';

const VALUES = [['1/1', 4], ['1/2', 2], ['1/4', 1], ['1/8', 0.5], ['1/16', 0.25], ['1/32', 0.125]];

/** Durées de note à un tempo, en ms (normale, pointée, triolet) et en Hz (vitesse de LFO synchronisé). */
export function noteTimes(bpm) {
  const beat = 60000 / bpm;
  return VALUES.map(([label, beats]) => {
    const ms = beat * beats;
    return { label, straight: ms, dotted: ms * 1.5, triplet: (ms * 2) / 3, hz: 1000 / ms };
  });
}

/** Durée de N mesures en 4/4, en secondes. */
export const barsSeconds = (bpm, bars = 1) => (bars * 4 * 60) / bpm;

/** Tempo à partir des instants de frappe (ms) : 8 derniers écarts, frappes ratées (±25 % de la médiane) ignorées. */
export function tapTempo(times) {
  const t = times.slice(-9);
  if (t.length < 3) return null;
  const gaps = t.slice(1).map((x, i) => x - t[i]);
  const med = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  const ok = gaps.filter((g) => Math.abs(g - med) <= med * 0.25);
  const avg = ok.reduce((a, b) => a + b, 0) / ok.length;
  return Math.round((600000 / avg)) / 10;
}

/** Code Camelot d'une tonalité (8B = Do majeur, 8A = La mineur). */
export function camelot(pc, minor) {
  const majorPc = minor ? mod(pc + 3, 12) : mod(pc, 12);
  const num = mod(majorPc * 7 + 7, 12) + 1;
  return { num, letter: minor ? 'A' : 'B', code: `${num}${minor ? 'A' : 'B'}` };
}

/** Tonalité d'un code Camelot. */
export function fromCamelot(num, letter) {
  const majorPc = mod((num - 8) * 7, 12);
  return letter === 'A' ? { pc: mod(majorPc - 3, 12), minor: true } : { pc: majorPc, minor: false };
}

export const keyName = (pc, minor) => `${NOTE_NAMES[mod(pc, 12)]}${minor ? 'm' : ''}`;

/** Tonalités compatibles pour enchaîner deux morceaux (ou moduler) sans que ça frotte. */
export function compatibleKeys(pc, minor) {
  const { num, letter } = camelot(pc, minor);
  const wrap = (n) => mod(n - 1, 12) + 1;
  const other = letter === 'A' ? 'B' : 'A';
  return [
    { ...fromCamelot(num, letter), code: `${num}${letter}`, why: 'Même tonalité' },
    { ...fromCamelot(wrap(num + 1), letter), code: `${wrap(num + 1)}${letter}`, why: '+1 : une quinte au-dessus, ça monte en énergie' },
    { ...fromCamelot(wrap(num - 1), letter), code: `${wrap(num - 1)}${letter}`, why: '−1 : une quinte en dessous, plus posé' },
    { ...fromCamelot(num, other), code: `${num}${other}`, why: letter === 'A' ? 'Relatif majeur : mêmes notes, plus lumineux' : 'Relatif mineur : mêmes notes, plus sombre' },
    { ...fromCamelot(wrap(num + 2), letter), code: `${wrap(num + 2)}${letter}`, why: '+2 : « energy boost » (un ton au-dessus), à doser' },
  ];
}

/** Note la plus proche d'une fréquence (convention Ableton : C3 = 60) et écart en cents. */
export function nearestNote(freq) {
  const exact = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(exact);
  return { midi, cents: Math.round((exact - midi) * 100), freq: midiToFreq(midi) };
}

/** Notes graves utiles pour accorder un kick ou une sub (C0 → B2 en convention Ableton), tonique et quinte repérées. */
export function lowNotes(pc, minor) {
  const fifth = mod(pc + 7, 12);
  return Array.from({ length: 36 }, (_, i) => 24 + i).map((m) => ({
    midi: m, freq: midiToFreq(m), role: mod(m, 12) === mod(pc, 12) ? 'tonique' : mod(m, 12) === fifth ? 'quinte' : mod(m - pc, 12) === (minor ? 3 : 4) ? 'tierce' : null,
  }));
}

/** Accords des 7 degrés d'une tonalité (triades ou septièmes). */
export function keyChords(pc, minor, size = 3) {
  const scale = minor ? 'minor' : 'major';
  return Array.from({ length: 7 }, (_, deg) => slotChord(pc, scale, { deg }, size));
}
