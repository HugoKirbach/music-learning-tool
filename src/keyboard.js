// ⌨️ Disposition du clavier de l'ordinateur (AZERTY, QWERTY, QWERTZ).
// Les touches « piano » et « pads » sont repérées par leur EMPLACEMENT (la forme du piano reste la même sur tous les
// claviers) ; seul le nom affiché change avec la disposition. Les raccourcis à lettre (Maj + lettre, Ctrl + K…)
// suivent, eux, le caractère tapé. Réglages › Général › Clavier : Automatique, AZERTY, QWERTY ou QWERTZ.
import { getState } from './store.js';

/** Nom de la touche à un emplacement donné, quand il diffère du QWERTY américain. */
const NAMES = {
  qwerty: { Semicolon: ';', Quote: '\'', BracketLeft: '[', BracketRight: ']', Comma: ',', Period: '.', Slash: '/' },
  azerty: { KeyA: 'Q', KeyQ: 'A', KeyW: 'Z', KeyZ: 'W', KeyM: ',', Semicolon: 'M', Quote: 'Ù', BracketLeft: '^', BracketRight: '$', Comma: ';', Period: ':', Slash: '!' },
  qwertz: { KeyY: 'Z', KeyZ: 'Y', Semicolon: 'Ö', Quote: 'Ä', BracketLeft: 'Ü', BracketRight: '+', Comma: ',', Period: '.', Slash: '-' },
};
export const KB_OPTIONS = [{ value: 'auto', label: 'Auto' }, { value: 'azerty', label: 'AZERTY' }, { value: 'qwerty', label: 'QWERTY' }, { value: 'qwertz', label: 'QWERTZ' }];
export const KB_NAMES = { azerty: 'AZERTY', qwerty: 'QWERTY', qwertz: 'QWERTZ' };

/** Touches du piano à l'ordinateur, du Do au Do (emplacements) : rangée du milieu = blanches, rangée du dessus = noires. */
export const PIANO_CODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK'];
/** Demi-ton joué par un évènement clavier (0 = Do), ou −1. */
export const pianoIndex = (e) => PIANO_CODES.indexOf(e.code);

// ---------- Détection ----------
const STORE = 'beatforge.kb';
const guess = () => {
  const lang = (typeof navigator !== 'undefined' && navigator.language || '').toLowerCase();
  if (/^fr(?!-ca)/.test(lang) && !/^fr-ch/.test(lang)) return 'azerty';
  if (/^de/.test(lang) || /^fr-ch/.test(lang)) return 'qwertz';
  return 'qwerty';
};
let detected = null;
try { const v = localStorage.getItem(STORE); if (NAMES[v]) detected = v; } catch (e) { /* stockage indisponible */ }
if (!detected) detected = guess();
const listeners = new Set();
function setDetected(v) {
  if (!NAMES[v] || v === detected) return;
  detected = v;
  try { localStorage.setItem(STORE, v); } catch (e) { /* noop */ }
  listeners.forEach((f) => f(kbLayout()));
}
/** D'après une frappe : la touche à l'emplacement du Q américain écrit « a » sur un AZERTY. */
export function learnLayout(e) {
  if (!e || !e.code || typeof e.key !== 'string' || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if ((e.code === 'KeyQ' && k === 'a') || (e.code === 'KeyA' && k === 'q') || (e.code === 'KeyW' && k === 'z') || (e.code === 'Semicolon' && k === 'm')) setDetected('azerty');
  else if ((e.code === 'KeyY' && k === 'z') || (e.code === 'KeyZ' && k === 'y')) setDetected('qwertz');
  else if ((e.code === 'KeyQ' && k === 'q') || (e.code === 'KeyA' && k === 'a')) { if (detected === 'azerty') setDetected('qwerty'); }
  else if (e.code === 'KeyY' && k === 'y' && detected === 'qwertz') setDetected('qwerty');
}
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', learnLayout, { capture: true, passive: true });
  navigator.keyboard?.getLayoutMap?.().then((map) => {
    const q = map.get('KeyQ'), y = map.get('KeyY');
    setDetected(q === 'a' ? 'azerty' : y === 'z' ? 'qwertz' : q === 'q' ? 'qwerty' : detected);
  }).catch(() => {});
}

/** Disposition utilisée : celle des Réglages, ou celle détectée. */
export function kbLayout() {
  const pref = getState().settings.kbLayout;
  return NAMES[pref] ? pref : detected;
}
export const detectedLayout = () => detected;
/** Prévenu quand la disposition détectée change (première frappe sur un clavier différent). */
export function onLayout(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Nom affiché de la touche située à cet emplacement (« KeyA » → « Q » sur un AZERTY). */
export function keyLabel(code, layout = kbLayout()) {
  const n = (NAMES[layout] || NAMES.qwerty)[code] ?? NAMES.qwerty[code];
  if (n) return n;
  return String(code).replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, '');
}
export const keyLabels = (codes, sep = ' ', layout = kbLayout()) => codes.map((c) => keyLabel(c, layout)).join(sep);
/** Remplace les repères {KeyA} d'un texte par le nom de la touche sur le clavier de l'utilisateur. */
export const fmtKeys = (text, layout = kbLayout()) => (typeof text === 'string' ? text.replace(/\{((?:Key|Digit)[A-Z0-9]|Semicolon|Quote|Comma|Period|Slash|BracketLeft|BracketRight)\}/g, (_, c) => keyLabel(c, layout)) : text);
