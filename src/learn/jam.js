// 🎵 Le morceau de la leçon : chaque bonne réponse ajoute une piste à une boucle (kick, hats, clap, basse, accords,
// mélodie) et joue la mesure suivante ; une erreur en retire une. À la fin, on écoute le morceau « gagné ».
// Les sons passent par une tranche à part : niveau réglable (Réglages › Sons de validation) et coupure nette.
import { ensureAudio, now, playSynth, playDrum, createChannel } from '../core/audio.js';
import { presetParams } from '../player.js';
import { getState } from '../store.js';

export const JAM_LAYERS = [
  { id: 'kick', name: 'Kick', emoji: '🥁' },
  { id: 'hats', name: 'Hats', emoji: '✨' },
  { id: 'clap', name: 'Clap', emoji: '👏' },
  { id: 'bass', name: 'Basse', emoji: '🎸' },
  { id: 'chords', name: 'Accords', emoji: '🎹' },
  { id: 'lead', name: 'Mélodie', emoji: '🎵' },
];
export const JAM_MAX = JAM_LAYERS.length;

/** Niveau des sons de validation par rapport aux exercices (Réglages › Général). */
export const SFX_LEVELS = { soft: 0.4, normal: 0.6, off: 0 };

// Un morceau par partie du parcours. chords : 4 mesures ; bass : pas joués (x) sur la fondamentale, (o) à l'octave ;
// lead : [pas, note, durée en pas] par mesure.
const SONGS = [
  { // 1 · Les fondations : house douce en Do majeur
    bpm: 118, kit: 'club', pBass: 'pluckbass', pChords: 'epiano', pLead: 'marimba',
    kick: 'x...x...x...x...', hats: '..x...x...x...x.', clap: '....x.......x...',
    bass: ['x..x..x...x.x...', 'x..x..x...x.x...', 'x..x..x...x.x...', 'x..x..x...x.o.x.'],
    roots: [36, 33, 29, 31], chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], stab: 'x.....x...x.....',
    lead: [[[0, 76, 2], [4, 79, 2], [8, 76, 2], [12, 72, 4]], [[0, 76, 2], [4, 72, 2], [8, 69, 4]], [[0, 72, 2], [4, 77, 2], [8, 72, 2], [12, 69, 4]], [[0, 74, 2], [4, 71, 2], [8, 74, 2], [12, 79, 4]]],
  },
  { // 2 · Ableton Live : house en La mineur
    bpm: 124, kit: 'club', pBass: 'moogbass', pChords: 'stab', pLead: 'pluck',
    kick: 'x...x...x...x...', hats: '..x...x...x...xx', clap: '....x.......x...',
    bass: ['..x...x...x...x.', '..x...x...x...x.', '..x...x...x...x.', '..x...x...x..xo.'],
    roots: [33, 29, 36, 31], chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]], stab: '...x..x......x..',
    lead: [[[0, 69, 2], [3, 72, 2], [6, 76, 4], [12, 72, 2]], [[0, 69, 2], [3, 72, 2], [6, 77, 4], [12, 72, 2]], [[0, 67, 2], [3, 72, 2], [6, 76, 4], [12, 79, 2]], [[0, 74, 2], [3, 71, 2], [6, 67, 4], [12, 71, 2]]],
  },
  { // 3 · Composer : pop en Sol majeur (I-V-vi-IV)
    bpm: 108, kit: 'acoustic', pBass: 'pluckbass', pChords: 'piano', pLead: 'bell',
    kick: 'x.....x.x.......', hats: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...',
    bass: ['x.....x.x.....x.', 'x.....x.x.....x.', 'x.....x.x.....x.', 'x.....x.x...o...'],
    roots: [31, 38, 28, 36], chords: [[55, 59, 62], [57, 62, 66], [55, 59, 64], [55, 60, 64]], stab: 'x.......x.......',
    lead: [[[0, 71, 3], [4, 74, 3], [8, 79, 6]], [[0, 78, 3], [4, 74, 3], [8, 69, 6]], [[0, 76, 3], [4, 71, 3], [8, 67, 6]], [[0, 72, 3], [4, 76, 3], [8, 79, 3], [12, 78, 4]]],
  },
  { // 4 · Le synthé à la main : synthwave en Ré mineur
    bpm: 100, kit: 'k808', pBass: 'moogbass', pChords: 'warmpad', pLead: 'squarelead',
    kick: 'x...x...x...x...', hats: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...',
    bass: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.o.o.'],
    roots: [38, 34, 29, 36], chords: [[62, 65, 69], [58, 62, 65], [57, 60, 65], [55, 60, 64]], stab: 'x...............',
    lead: [[[0, 74, 4], [6, 77, 2], [8, 81, 6]], [[0, 77, 4], [6, 74, 2], [8, 70, 6]], [[0, 72, 4], [6, 77, 2], [8, 81, 6]], [[0, 79, 4], [6, 76, 2], [8, 72, 4], [12, 76, 4]]],
  },
  { // 5 · Produire un morceau : club en Fa mineur
    bpm: 128, kit: 'hard', pBass: 'fmbass', pChords: 'supersaw', pLead: 'trancelead',
    kick: 'x...x...x...x...', hats: '..x...x...x...x.', clap: '....x.......x...',
    bass: ['..xx..xx..xx..xx', '..xx..xx..xx..xx', '..xx..xx..xx..xx', '..xx..xx..xo..xo'],
    roots: [29, 25, 32, 27], chords: [[53, 56, 60], [53, 56, 61], [51, 56, 60], [51, 55, 58]], stab: '..x...x...x...x.',
    lead: [[[0, 72, 2], [3, 75, 2], [6, 77, 2], [10, 80, 2], [12, 77, 3]], [[0, 73, 2], [3, 77, 2], [6, 80, 2], [10, 77, 2], [12, 73, 3]], [[0, 72, 2], [3, 75, 2], [6, 80, 2], [10, 84, 2], [12, 80, 3]], [[0, 70, 2], [3, 75, 2], [6, 79, 2], [10, 82, 2], [12, 79, 3]]],
  },
];
export const songFor = (part) => SONGS[Math.max(0, Math.min(SONGS.length - 1, (part || 1) - 1))];

const level = () => {
  const st = getState().settings;
  if ((st.volume ?? 0.8) <= 0) return 0;
  return SFX_LEVELS[st.sfx || 'soft'] ?? SFX_LEVELS.soft;
};
const patch = (id, k = 1, wet = 0.08) => { const p = JSON.parse(JSON.stringify(presetParams(id))); p.gain *= k; p.delay = 0; p.chorus = Math.min(p.chorus || 0, 0.2); p.reverb = wet; return p; };

// ---------- Programmation (petit séquenceur annulable, tranche dédiée) ----------
let job = null;
function channels(k) {
  const drums = createChannel('drum'), synth = createChannel('synth');
  const db = 20 * Math.log10(Math.max(0.001, k));
  drums.set({ vol: db }); synth.set({ vol: db });
  return { drums, synth };
}
/** Coupe le morceau en cours (fondu de 40 ms). */
export function stopJam() {
  if (!job) return;
  clearInterval(job.timer);
  const { ch } = job;
  ch.drums.set({ vol: -80 }); ch.synth.set({ vol: -80 });
  setTimeout(() => { ch.drums.destroy(); ch.synth.destroy(); }, 400);
  const done = job.done;
  job = null;
  done?.();
}
function run(events, dur, k, done) {
  stopJam();
  ensureAudio();
  const ch = channels(k);
  const t0 = now() + 0.05;
  const evs = [...events].sort((a, b) => a.t - b.t);
  let i = 0;
  const j = { timer: null, ch, done, end: t0 + dur };
  const tick = () => {
    const horizon = now() + 0.25;
    while (i < evs.length && t0 + evs[i].t < horizon) { evs[i].fn(t0 + evs[i].t, ch); i++; }
    if (i >= evs.length && now() > j.end) {
      clearInterval(j.timer);
      if (job === j) { job = null; setTimeout(() => { ch.drums.destroy(); ch.synth.destroy(); }, 1500); done?.(); }
    }
  };
  j.timer = setInterval(tick, 50);
  job = j;
  tick();
}

/** Événements d'une mesure du morceau, avec les `layers` premières pistes. `fresh` : piste qui vient d'arriver (mise en avant). */
function barEvents(song, bar, layers, at = 0, fresh = -1) {
  const sd = 60 / song.bpm / 4;
  const b = ((bar % 4) + 4) % 4;
  const evs = [];
  const on = (i) => layers > i;
  const up = (i) => (fresh === i ? 1.25 : 1);
  const each = (pat, fn) => [...pat].forEach((c, s) => { if (c !== '.') evs.push({ t: at + s * sd, fn: (t, ch) => fn(t, ch, c, s) }); });
  if (on(0)) each(song.kick, (t, ch) => playDrum('kick', t, 0.95 * up(0), song.kit, ch.drums.input));
  if (on(1)) each(song.hats, (t, ch, c, s) => playDrum('hat', t, (s % 4 === 2 ? 0.6 : 0.4) * up(1), song.kit, ch.drums.input));
  if (on(2)) each(song.clap, (t, ch) => playDrum('clap', t, 0.7 * up(2), song.kit, ch.drums.input));
  if (on(3)) {
    const p = patch(song.pBass, 0.95 * up(3), 0);
    each(song.bass[b], (t, ch, c) => playSynth(p, song.roots[b] + (c === 'o' ? 12 : 0), t, sd * 1.6, 0.8, { out: ch.synth.input, send: 0 }));
  }
  if (on(4)) {
    const p = patch(song.pChords, 0.55 * up(4));
    const long = [...song.stab].filter((c) => c === 'x').length <= 2;
    each(song.stab, (t, ch) => song.chords[b].forEach((m) => playSynth(p, m, t, long ? sd * 7.5 : sd * 1.8, 0.7, { out: ch.synth.input, send: 0.08 })));
  }
  if (on(5)) {
    const p = patch(song.pLead, 0.6 * up(5), 0.1);
    for (const [s, m, len] of song.lead[b]) evs.push({ t: at + s * sd, fn: (t, ch) => playSynth(p, m, t, len * sd * 0.9, 0.75, { out: ch.synth.input, send: 0.1 }) });
  }
  return evs;
}

/**
 * Crée le morceau d'une leçon. count() : pistes gagnées ; good() / bad() : réponse juste / fausse (avec le son) ;
 * finale() : le morceau complet gagné ; onChange(n, sens) pour l'affichage.
 */
export function createJam({ part = 1, onChange = null } = {}) {
  const song = songFor(part);
  let layers = 0, bar = 0, best = 0;
  const barDur = (60 / song.bpm) * 4;
  return {
    song,
    count: () => layers,
    best: () => best,
    /** Bonne réponse : une piste de plus, et la mesure suivante du morceau. */
    good() {
      const fresh = layers < JAM_MAX ? layers : -1;
      layers = Math.min(JAM_MAX, layers + 1);
      best = Math.max(best, layers);
      onChange?.(layers, 1);
      const k = level();
      if (!k) return;
      const evs = barEvents(song, bar, layers, 0, fresh);
      // Tant que le kick n'est pas seul : une petite note de réussite par-dessus, dans la tonalité
      if (layers < 4) {
        const p = patch('marimba', 0.7, 0.1);
        const top = song.chords[bar % 4];
        evs.push({ t: 0, fn: (t, ch) => playSynth(p, top[1] + 12, t, 0.12, 0.6, { out: ch.synth.input, send: 0.1 }) });
        evs.push({ t: 60 / song.bpm / 2, fn: (t, ch) => playSynth(p, top[2] + 12, t, 0.2, 0.6, { out: ch.synth.input, send: 0.1 }) });
      }
      bar++;
      run(evs, barDur * 0.98, k);
    },
    /** Erreur : la dernière piste s'en va (petite chute dans la tonalité, sans agresser). */
    bad() {
      layers = Math.max(0, layers - 1);
      onChange?.(layers, -1);
      const k = level();
      if (!k) return;
      const root = song.roots[bar % 4] + 12;
      const p = patch('pluckbass', 0.9, 0);
      run([
        { t: 0, fn: (t, ch) => playSynth(p, root + 1, t, 0.16, 0.5, { out: ch.synth.input, send: 0 }) },
        { t: 0.13, fn: (t, ch) => playSynth(p, root, t, 0.26, 0.45, { out: ch.synth.input, send: 0 }) },
        ...(layers > 0 ? [{ t: 0.13, fn: (t, ch) => playDrum('kick', t, 0.5, song.kit, ch.drums.input) }] : []),
      ], 0.6, k * 0.9);
    },
    /** Le morceau gagné : 4 mesures avec les pistes obtenues, puis l'accord final. Renvoie la durée (s), 0 si le son est coupé. */
    finale({ onEnd = null, force = false } = {}) {
      const k = level() || (force ? SFX_LEVELS.soft : 0);
      if (!k) return 0;
      const n = Math.max(1, layers);
      const evs = [];
      for (let b = 0; b < 4; b++) evs.push(...barEvents(song, b, n, b * barDur));
      const end = 4 * barDur;
      const pc = patch(song.pChords, 0.6, 0.2);
      evs.push({ t: end, fn: (t, ch) => { playDrum('kick', t, 0.9, song.kit, ch.drums.input); song.chords[0].forEach((m) => playSynth(pc, m, t, 1.2, 0.7, { out: ch.synth.input, send: 0.2 })); playSynth(patch(song.pBass, 0.9, 0), song.roots[0], t, 1.0, 0.8, { out: ch.synth.input, send: 0 }); } });
      run(evs, end + 1.6, k, onEnd);
      return end + 1.6;
    },
    stop: stopJam,
  };
}

/** Sons de validation simples (hors leçon : paires ratées, réglages). */
export function sfx(kind) {
  const k = level();
  if (!k) return;
  if (kind === 'ok') { const p = patch('marimba', 0.8, 0.05); run([{ t: 0, fn: (t, ch) => playSynth(p, 76, t, 0.12, 0.55, { out: ch.synth.input, send: 0.05 }) }, { t: 0.08, fn: (t, ch) => playSynth(p, 83, t, 0.18, 0.55, { out: ch.synth.input, send: 0.05 }) }], 0.4, k); }
  else if (kind === 'bad') { const p = patch('pluckbass', 0.9, 0); run([{ t: 0, fn: (t, ch) => playSynth(p, 43, t, 0.16, 0.5, { out: ch.synth.input, send: 0 }) }, { t: 0.11, fn: (t, ch) => playSynth(p, 42, t, 0.22, 0.45, { out: ch.synth.input, send: 0 }) }], 0.5, k * 0.9); }
  else if (kind === 'end') { const p = patch('marimba', 0.8, 0.08); run([72, 76, 79, 84].map((m, i) => ({ t: i * 0.1, fn: (t, ch) => playSynth(p, m, t, 0.3, 0.55, { out: ch.synth.input, send: 0.08 }) })), 0.9, k); }
}

/** Événements d'une mesure (pour mesurer le niveau du morceau hors temps réel). */
export const jamBar = (part, bar, layers) => barEvents(songFor(part), bar, layers);
