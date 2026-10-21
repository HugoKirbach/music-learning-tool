// Lecture d'une maquette (core/demosong.js) via le transport : batterie, synthés, riser, filtre général, sidechain.
import { transport, ensureAudio, playDrum, playSynth, playRiser, masterFilterAt, setPump, renderOffline } from './core/audio.js';
import { presetParams } from './player.js';

/** Lance la maquette ; onStep(pas) suit la lecture (affichage), onEnd à la fin. Renvoie stop(). */
export function playDemo(song, { onStep, onEnd } = {}) {
  ensureAudio();
  const byStep = new Map();
  for (const e of song.events) {
    const k = Math.floor(e.t + 1e-9);
    if (!byStep.has(k)) byStep.set(k, []);
    byStep.get(k).push(e);
  }
  const last = {};
  let ended = false;
  transport.start((step, time, sd) => {
    if (step >= song.steps) {
      if (!ended) { ended = true; setTimeout(() => { if (transport.owner === 'demo') { transport.stop(); setPump(0); } onEnd?.(); }, 1500); }
      return;
    }
    for (const e of byStep.get(step) || []) {
      const t = time + (e.t - step) * sd;
      if (e.kind === 'drum') playDrum(e.id, t, e.vel, song.kit);
      else if (e.kind === 'note') {
        playSynth(presetParams(e.preset), e.midi, t, e.len * sd * 0.95, e.vel, { send: e.send ?? undefined, fromMidi: e.glide ? last[e.track] ?? null : null, ch: 1 });
        last[e.track] = e.midi;
      } else if (e.kind === 'riser') playRiser(t, e.len * sd);
      else if (e.kind === 'filter') masterFilterAt(t, e.to, e.len ? e.from : null, e.len * sd);
      else if (e.kind === 'pump') setPump(e.amount);
    }
  }, (s) => onStep?.(s), { bpm: song.bpm, swing: 0, owner: 'demo' });
  return () => { transport.stop(); setPump(0); };
}

/** Rendu audio hors temps réel de toute la maquette (export WAV, mesures). */
export function renderDemo(song, { tail = 2.5, fromBar = 0, toBar = song.bars } = {}) {
  const sd = 60 / song.bpm / 4;
  const a = fromBar * 16, b = toBar * 16;
  return renderOffline((b - a) * sd + tail, (t0) => {
    const last = {};
    // Réglages en cours au début de l'extrait (filtre, sidechain)
    for (const e of song.events) if (e.t < a && e.kind === 'pump') setPump(e.amount);
    for (const e of song.events) {
      if (e.t < a || e.t >= b) continue;
      const t = t0 + (e.t - a) * sd;
      if (e.kind === 'drum') playDrum(e.id, t, e.vel, song.kit);
      else if (e.kind === 'note') {
        playSynth(presetParams(e.preset), e.midi, t, e.len * sd * 0.95, e.vel, { send: e.send ?? undefined, fromMidi: e.glide ? last[e.track] ?? null : null });
        last[e.track] = e.midi;
      } else if (e.kind === 'riser') playRiser(t, e.len * sd);
      else if (e.kind === 'filter') masterFilterAt(t, e.to, e.len ? e.from : null, e.len * sd);
      else if (e.kind === 'pump') setPump(e.amount);
    }
    setPump(0);
  });
}
