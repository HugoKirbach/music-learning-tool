// Entrée MIDI (Web MIDI API) : branche ton MPC Key 37 en USB (Chrome/Edge sur PC et Android).
// Safari / iOS ne supportent pas Web MIDI : l'app reste utilisable au tactile.
import { update, checkBadges } from './store.js';

const handlers = new Set();
const held = new Set();
let access = null;
let status = 'off';
let statusListeners = new Set();
let noteCount = 0;

export function midiSupported() {
  return typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
}

export function midiStatus() {
  return status;
}

export function onMidiStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

function setStatus(s) {
  status = s;
  statusListeners.forEach((f) => f(s));
}

export async function enableMidi() {
  if (!midiSupported()) { setStatus('unsupported'); return false; }
  if (access) return true;
  try {
    access = await navigator.requestMIDIAccess({ sysex: false });
    const bind = () => {
      let n = 0;
      access.inputs.forEach((input) => { input.onmidimessage = onMessage; n++; });
      setStatus(n ? `${n} entrée(s)` : 'aucun appareil');
    };
    access.onstatechange = bind;
    bind();
    return true;
  } catch (e) {
    setStatus('refusé');
    return false;
  }
}

function onMessage(e) {
  const [st, d1, d2] = e.data;
  const type = st & 0xf0;
  if (type === 0x90 && d2 > 0) {
    held.add(d1);
    handlers.forEach((h) => h.noteOn?.(d1, d2 / 127, [...held]));
    if (++noteCount % 10 === 0) {
      update((s) => { s.stats.midiNotes += 10; });
      checkBadges();
    }
  } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
    held.delete(d1);
    handlers.forEach((h) => h.noteOff?.(d1, [...held]));
  } else if (type === 0xb0) {
    handlers.forEach((h) => h.cc?.(d1, d2 / 127));
  }
}

/** S'abonner aux notes. Renvoie une fonction de désabonnement. */
export function onMidi(h) {
  handlers.add(h);
  return () => handlers.delete(h);
}

export function heldNotes() {
  return [...held];
}
