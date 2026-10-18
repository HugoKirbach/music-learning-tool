// Export audio : pistes séparées (batterie, basse, accords, mélodie) + mix, en WAV dans un fichier ZIP.
import { renderOffline } from './core/audio.js';
import { voiceProgression, eventsAt } from './core/arrange.js';
import { playEvents } from './player.js';
import { download, toast } from './ui.js';
import { encodeWav, zip } from './core/wav.js';

export const stemsSupported = () => !!(window.OfflineAudioContext || window.webkitOfflineAudioContext);

const LAYERS = [['drums', 'Batterie'], ['bass', 'Basse'], ['chords', 'Accords'], ['melody', 'Melodie']];

/** Rend `loops` passages de la boucle de 4 mesures, avec seulement les couches demandées. */
export function renderProject(p, on, { loops = 2, tail = 2.5 } = {}) {
  const stepDur = 60 / p.bpm / 4;
  const steps = 64 * loops;
  return renderOffline(steps * stepDur + tail, (t0) => {
    const voiced = voiceProgression(p);
    let lastBass = null;
    for (let s = 0; s < steps; s++) {
      const t = t0 + s * stepDur + (s % 2 === 1 ? (p.swing || 0) * stepDur * 0.66 : 0);
      lastBass = playEvents(p, eventsAt(p, voiced, s), t, stepDur, on, lastBass);
    }
  });
}

/** Exporte les 4 pistes + le mix (2 passages de la boucle) dans un ZIP prêt à glisser dans Live. */
export async function exportStems(project, title = 'idee') {
  toast('🎚️ Rendu des pistes audio…', 'info', 2500);
  const files = [];
  const base = `${project.bpm}bpm`;
  for (const [id, name] of LAYERS) {
    const on = { drums: false, bass: false, chords: false, melody: false, [id]: true };
    files.push({ name: `${name}-${base}.wav`, data: encodeWav(await renderProject(project, on)) });
  }
  files.push({ name: `Mix-${base}.wav`, data: encodeWav(await renderProject(project, { drums: true, bass: true, chords: true, melody: true })) });
  const safe = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'idee';
  download(`${safe}-pistes-${base}.zip`, zip(files), 'application/zip');
  toast('Pistes exportées : décompresse le ZIP et glisse les WAV dans Live 🎛️', 'good', 4000);
  return files;
}
