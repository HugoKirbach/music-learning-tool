// Suivre le tempo de Live : l'horloge MIDI (24 tops par noire) règle le tempo de l'idée,
// et Start / Stop dans Live lancent / arrêtent le mini-lecteur.
import { getState, update } from './store.js';
import { transport } from './core/audio.js';
import { onClock } from './midiin.js';
import { playProject } from './player.js';

let ticks = [];
let bpm = null;
let lastSet = 0;
const listeners = new Set();
export const clockBpm = () => bpm;
export function onClockBpm(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** BPM à partir des instants des derniers tops (ms) : moyenne sur 2 temps pour lisser la gigue. */
export function bpmFromTicks(times) {
  if (times.length < 13) return null;
  const span = times[times.length - 1] - times[0];
  const per = span / (times.length - 1);
  return per > 0 ? Math.round((60000 / (per * 24)) * 10) / 10 : null;
}

onClock((kind, t) => {
  const follow = getState().settings.midiSync?.follow;
  if (kind === 'tick') {
    ticks.push(t);
    if (ticks.length > 49) ticks.shift();
    if (ticks.length > 1 && t - ticks[ticks.length - 2] > 500) ticks = [t]; // reprise après une pause
    const b = bpmFromTicks(ticks);
    if (b && Math.abs((bpm || 0) - b) >= 0.1) { bpm = b; listeners.forEach((f) => f(bpm)); }
    if (follow && b && Date.now() - lastSet > 1000) {
      const r = Math.round(b);
      if (r !== getState().project.bpm && r >= 50 && r <= 200) {
        lastSet = Date.now();
        update((s) => { s.project.bpm = r; });
        transport.bpm = r;
      }
    }
  } else if (follow && (kind === 'start' || kind === 'continue')) {
    ticks = [];
    if (!transport.playing) playProject(() => getState().project, { owner: 'mini' });
  } else if (follow && kind === 'stop') {
    if (transport.owner === 'mini') transport.stop();
  }
});
