// Sortie MIDI : l'app joue aussi (ou seulement) sur tes vrais instruments — Live + Serum 2 via un port virtuel
// (loopMIDI sous Windows, IAC sous macOS) ou directement le MPC. Canaux : 1 mélodie, 2 accords, 3 basse, 10 batterie.
import { getState, update } from './store.js';
import { setMidiSink, now, ensureAudio } from './core/audio.js';
import { enableMidi, midiAccess } from './midiin.js';

// Batterie : notes General MIDI / Drum Rack d'Ableton
export const DRUM_NOTES = { kick: 36, snare: 38, clap: 39, hat: 42, ohat: 46, perc: 37, rim: 37, tom: 45, cowbell: 56, conga: 63, shaker: 70, crash: 49 };

let port = null;
const toPerf = (t) => performance.now() + Math.max(0, (t - now()) * 1000);
const v127 = (v) => Math.max(1, Math.min(127, Math.round((v ?? 0.8) * 127)));

const sink = {
  drum(id, time, vel) {
    const n = DRUM_NOTES[id];
    if (!port || n == null) return;
    const at = toPerf(time);
    port.send([0x99, n, v127(vel)], at);
    port.send([0x89, n, 0], at + 60);
  },
  note(ch, midi, vel, time, dur) {
    if (!port) return;
    const at = toPerf(time);
    port.send([0x90 | (ch - 1), midi, v127(vel)], at);
    port.send([0x80 | (ch - 1), midi, 0], at + Math.max(20, dur * 1000));
  },
  on(ch, midi, vel, time) { port?.send([0x90 | (ch - 1), midi, v127(vel)], toPerf(time)); },
  off(ch, midi, time) { port?.send([0x80 | (ch - 1), midi, 0], toPerf(time)); },
};

export function listOutputs() {
  const a = midiAccess();
  return a ? [...a.outputs.values()].map((o) => ({ id: o.id, name: o.name })) : [];
}

/** Applique les réglages (Profil › Studio). */
export async function applyMidiOut() {
  const cfg = getState().settings.midiOut || {};
  if (!cfg.enabled) { port = null; setMidiSink(null); return { ok: false }; }
  ensureAudio();
  if (!midiAccess()) await enableMidi();
  const a = midiAccess();
  const outs = a ? [...a.outputs.values()] : [];
  port = outs.find((o) => o.id === cfg.id) || outs.find((o) => /loop|iac|virtual|live/i.test(o.name)) || outs[0] || null;
  if (port && port.id !== cfg.id) update((s) => { s.settings.midiOut = { ...cfg, id: port.id }; });
  setMidiSink(port ? sink : null, !!cfg.mute);
  return { ok: !!port, name: port?.name || null };
}

/** Coupe toutes les notes (sécurité si une note reste bloquée dans Live). */
export function panic() {
  if (!port) return;
  for (let ch = 0; ch < 16; ch++) port.send([0xb0 | ch, 123, 0]);
}
