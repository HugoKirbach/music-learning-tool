// Lecture d'une idée complète (batterie + accords + basse + mélodie) via le transport.
import { transport, playDrum, playSynth, ensureAudio, now, setPump } from './core/audio.js';
import { eventsAt, voiceProgression } from './core/arrange.js';
import { PRESETS } from './data/presets.js';

export const presetParams = (id) => (PRESETS[id] || PRESETS.pluck).params;

/**
 * @param {() => object} getProject fonction (relue à chaque pas → les modifications s'entendent en direct)
 * @param {{layers?:object, onVisual?:(step:number)=>void, overrides?:object}} opts
 */
export function playProject(getProject, opts = {}) {
  ensureAudio();
  let voiced = null, lastKey = '';
  let lastBass = null;
  const p0 = getProject();
  transport.start((step, time, stepDur) => {
    const p = getProject();
    transport.bpm = p.bpm;
    transport.swing = p.swing;
    const key = JSON.stringify([p.chords, p.rootPc, p.scale, p.ext, p.voicing]);
    if (key !== lastKey) { voiced = voiceProgression(p); lastKey = key; }
    const layers = { drums: true, chords: true, bass: true, melody: true, ...(opts.layers || {}) };
    const mutes = p.mutes || {};
    const ev = eventsAt(p, voiced, step);
    const on = Object.fromEntries(Object.keys(layers).map((k) => [k, layers[k] && !mutes[k]]));
    lastBass = playEvents(p, ev, time, stepDur, on, lastBass);
    opts.onStep?.(step, time, ev);
  }, opts.onVisual, { bpm: p0.bpm, swing: p0.swing, owner: opts.owner || null });
}

// Tête de lecture du lecteur global : les écrans d'édition s'y abonnent pour afficher la position.
const playheadListeners = new Set();
export function onPlayhead(fn) {
  playheadListeners.add(fn);
  return () => playheadListeners.delete(fn);
}
export function emitPlayhead(step) {
  playheadListeners.forEach((f) => f(step));
}

/** Joue les événements d'un pas (batterie, accords, basse, mélodie). Renvoie la dernière note de basse (glide). */
export function playEvents(p, ev, time, stepDur, on = { drums: true, chords: true, bass: true, melody: true }, lastBass = null) {
  setPump(p.pump ?? 0);
  if (on.drums) ev.drums.forEach((d) => playDrum(d.id, time, d.vel, p.kit));
  if (on.chords) {
    const pr = presetParams(p.sounds.chords);
    ev.chords.forEach((c) => c.notes.forEach((n) => playSynth(pr, n, time, c.len * stepDur * 0.95, 0.6)));
  }
  if (on.bass) {
    const pr = presetParams(p.sounds.bass);
    ev.bass.forEach((b) => {
      playSynth(pr, b.note, time, b.len * stepDur * 0.92, 0.8, { send: 0, fromMidi: lastBass });
      lastBass = b.note;
    });
  }
  if (on.melody) {
    const pr = presetParams(p.sounds.lead);
    ev.melody.forEach((m) => playSynth(pr, m.note, time, m.len * stepDur * 0.9, 0.8));
  }
  return lastBass;
}

export function stopAll() {
  transport.stop();
}

/** Joue un accord ponctuellement (aperçu). */
export function previewChord(notes, presetId = 'piano', dur = 1.2, delay = 0) {
  ensureAudio();
  const t = now() + 0.03 + delay;
  notes.forEach((n) => playSynth(presetParams(presetId), n, t, dur, 0.7, { send: 0.3 }));
}

export function previewNote(midi, presetId = 'pluck', dur = 0.35, delay = 0) {
  ensureAudio();
  playSynth(presetParams(presetId), midi, now() + 0.02 + delay, dur, 0.8, { send: 0.2 });
}
