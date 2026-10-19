// Entrée MIDI (Web MIDI API) : branche ton MPC Key 37 en USB (Chrome/Edge sur PC et Android).
// Détection automatique : si l'accès a déjà été accordé, l'app se reconnecte seule au démarrage,
// et les branchements / débranchements sont détectés à chaud.
// Safari / iOS ne supportent pas Web MIDI : l'app reste utilisable au tactile.
import { getState, update, checkBadges } from './store.js';

const handlers = new Set();
const held = new Set();
const statusListeners = new Set();
let access = null;
let fallback = null;
let noteCount = 0;
let lastNames = [];

/** state : 'off' | 'unsupported' | 'denied' | 'nodevice' | 'connected' */
let status = { state: 'off', devices: [] };

export function midiSupported() {
  return typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
}

export function midiStatus() {
  return status;
}

export function midiStatusText(s = status) {
  return {
    off: 'désactivé',
    unsupported: 'non supporté par ce navigateur (utilise Chrome ou Edge)',
    denied: 'accès refusé — autorise le MIDI dans les réglages du site (icône 🔒 de la barre d’adresse)',
    nodevice: 'activé, aucun clavier détecté — branche ton MPC Key 37 en USB',
    connected: `connecté : ${s.devices.join(', ')}`,
  }[s.state];
}

export function onMidiStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

function setStatus(s) {
  status = s;
  statusListeners.forEach((f) => f(s));
}

/** Notifié à chaque (dé)branchement : (nouveaux appareils, appareils retirés). */
let deviceListener = null;
export function onDeviceChange(fn) {
  deviceListener = fn;
}

function bind() {
  const names = [];
  access.inputs.forEach((input) => {
    input.onmidimessage = onMessage;
    if (input.state !== 'disconnected') names.push(input.name || 'Clavier MIDI');
  });
  const added = names.filter((n) => !lastNames.includes(n));
  const removed = lastNames.filter((n) => !names.includes(n));
  lastNames = names;
  setStatus({ state: names.length ? 'connected' : 'nodevice', devices: names });
  if (added.length || removed.length) deviceListener?.(added, removed);
}

/** Demande l'accès MIDI (peut afficher la fenêtre d'autorisation du navigateur). */
export async function enableMidi() {
  if (!midiSupported()) { setStatus({ state: 'unsupported', devices: [] }); return false; }
  if (access) { bind(); return true; }
  try {
    access = await navigator.requestMIDIAccess({ sysex: false });
    access.onstatechange = bind;
    bind();
    if (!getState().settings.midiAuto) update((s) => { s.settings.midiAuto = true; });
    return true;
  } catch (e) {
    setStatus({ state: 'denied', devices: [] });
    return false;
  }
}

/** Au démarrage : se reconnecte sans demander si l'utilisateur l'a déjà autorisé. */
export async function autoEnableMidi() {
  if (!midiSupported()) { setStatus({ state: 'unsupported', devices: [] }); return; }
  let granted = false;
  try {
    const p = await navigator.permissions?.query({ name: 'midi' });
    granted = p?.state === 'granted';
  } catch (e) { /* API permissions indisponible */ }
  if (granted || getState().settings.midiAuto) await enableMidi();
}

// Horloge MIDI (tempo de Live) : 24 tops par noire, + Start / Continue / Stop
const clockListeners = new Set();
export function onClock(fn) { clockListeners.add(fn); return () => clockListeners.delete(fn); }
/** Accès Web MIDI (sorties comprises), null tant que le MIDI n'est pas activé. */
export function midiAccess() { return access; }

function onMessage(e) {
  const [st, d1, d2] = e.data;
  if (st >= 0xf8) {
    const kind = { 0xf8: 'tick', 0xfa: 'start', 0xfb: 'continue', 0xfc: 'stop' }[st];
    if (kind) clockListeners.forEach((f) => f(kind, e.timeStamp || performance.now()));
    return;
  }
  const type = st & 0xf0;
  const channel = st & 0x0f;
  activity.forEach((f) => f());
  const targets = handlers.size ? handlers : fallback ? [fallback] : [];
  if (type === 0x90 && d2 > 0) {
    held.add(d1);
    targets.forEach((h) => h.noteOn?.(d1, d2 / 127, [...held], channel));
    if (++noteCount % 10 === 0) {
      update((s) => { s.stats.midiNotes += 10; });
      checkBadges();
    }
  } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
    held.delete(d1);
    targets.forEach((h) => h.noteOff?.(d1, [...held], channel));
  } else if (type === 0xb0) {
    targets.forEach((h) => h.cc?.(d1, d2 / 127, channel));
  }
}

const activity = new Set();
/** Appelé à chaque message de note / contrôleur (mesure du temps de pratique), sans prendre la main sur les notes. */
export function onMidiActivity(fn) { activity.add(fn); return () => activity.delete(fn); }

/** S'abonner aux notes. Renvoie une fonction de désabonnement. */
export function onMidi(h) {
  handlers.add(h);
  return () => handlers.delete(h);
}

/** Gestionnaire utilisé quand aucun écran n'écoute le MIDI (ex. jouer du piano sur l'accueil). */
export function setMidiFallback(h) {
  fallback = h;
}

export function heldNotes() {
  return [...held];
}

/** Correspondance pads MPC (mapping « Classic ») / Drum Rack (GM) → sons de l'app. */
export function drumForNote(n) {
  if (n === 35 || n === 36) return 'kick';
  if (n === 38 || n === 40) return 'snare';
  if (n === 39) return 'clap';
  if (n === 42 || n === 44) return 'hat';
  if (n === 46) return 'ohat';
  if (n === 37 || (n >= 41 && n <= 55) || n === 82) return 'perc';
  return null;
}
