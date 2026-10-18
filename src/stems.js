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

/**
 * « Pack Live » : tout ce qu'il faut pour continuer l'idée dans Ableton —
 * MIDI multipiste (boucle + arrangement s'il existe), pistes WAV, et un LISEZ-MOI (tempo, tonalité, sons, étapes).
 */
export async function exportLivePack(project, { title = 'idee', arrangement = null } = {}) {
  const [{ buildMidi }, { projectToSong }, { arrangementToSong }, { PRESETS }, { NOTE_NAMES, SCALES }, { genreById }] = await Promise.all([
    import('./core/midi.js'), import('./core/arrange.js'), import('./core/arrangement.js'), import('./data/presets.js'), import('./core/theory.js'), import('./data/genres.js'),
  ]);
  toast('📦 Préparation du pack Live…', 'info', 2500);
  const base = `${project.bpm}bpm`;
  const files = [{ name: `${title}-boucle-${base}.mid`, data: buildMidi(projectToSong(project)) }];
  if (arrangement) files.push({ name: `${title}-arrangement-${base}.mid`, data: buildMidi(arrangementToSong(project, arrangement)) });
  for (const [id, name] of LAYERS) {
    const on = { drums: false, bass: false, chords: false, melody: false, [id]: true };
    files.push({ name: `audio/${name}-${base}.wav`, data: encodeWav(await renderProject(project, on)) });
  }
  files.push({ name: `audio/Mix-${base}.wav`, data: encodeWav(await renderProject(project, { drums: true, bass: true, chords: true, melody: true })) });
  const sound = (k) => { const pr = PRESETS[project.sounds[k]]; return pr ? `${pr.name}\n    Serum 2 : ${(pr.serum || []).join('\n    ')}` : project.sounds[k]; };
  const readme = [
    `BeatForge — ${title}`,
    `Style : ${genreById(project.genre).name}`,
    `Tempo : ${project.bpm} BPM${project.swing ? ` (swing ${Math.round(project.swing * 100)} %)` : ''}`,
    `Tonalité : ${NOTE_NAMES[project.rootPc]} ${SCALES[project.scale].name}`,
    '',
    'Dans Ableton Live 12 :',
    `1. Règle le tempo du set sur ${project.bpm}.`,
    '2. Glisse le fichier .mid dans la vue Arrangement : une piste par instrument (Drums, Accords, Basse, Mélodie).',
    '3. Mets un Drum Rack sur la piste Drums (36 kick, 38 snare, 39 clap, 42 hat fermé, 46 hat ouvert) et Serum 2 sur les autres.',
    '4. Les fichiers du dossier audio/ servent de repère : écoute-les, ou glisse-les directement (ils démarrent sur la mesure 1).',
    '',
    'Sons utilisés dans l’app (à recréer dans Serum 2) :',
    `- Accords : ${sound('chords')}`,
    `- Basse : ${sound('bass')}`,
    `- Mélodie : ${sound('lead')}`,
  ].join('\n');
  files.push({ name: 'LISEZ-MOI.txt', data: new TextEncoder().encode(readme) });
  const safe = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'idee';
  download(`${safe}-pack-live-${base}.zip`, zip(files), 'application/zip');
  toast('Pack Live prêt : décompresse-le et ouvre le .mid dans Live 🎛️', 'good', 4000);
  return files.map((f) => f.name);
}
