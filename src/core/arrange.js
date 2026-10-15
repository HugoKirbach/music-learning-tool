// Arrangement d'une « idée » (projet) : accords voicés, basse, patterns. Module pur.
import { slotChord, voiceLead, closeVoicing, spreadVoicing, mod } from './theory.js';
import { DRUM_ROWS, VEL } from './rhythm.js';

export const BARS = 4;
export const STEPS_PER_BAR = 16;
export const MELODY_STEPS = BARS * STEPS_PER_BAR;

// [pas, longueur en pas]
export const CHORD_RHYTHMS = {
  pad: { name: 'Pad tenu', hits: [[0, 16]] },
  stab: { name: 'Stabs house', hits: [[0, 1], [3, 1], [6, 2], [10, 1], [13, 2]] },
  oneshot: { name: 'Stab techno', hits: [[0, 2], [7, 1]] },
  pulse: { name: 'Pulsation 8e', hits: [0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 1.5]) },
  piano: { name: 'Piano lo-fi', hits: [[0, 6], [6, 4], [10, 6]] },
  dembow: { name: 'Dembow 3-3-2', hits: [[0, 3], [3, 3], [6, 2], [8, 3], [11, 3], [14, 2]] },
  funk: { name: 'Funk 16e', hits: [[0, 1], [2, 1], [3, 1], [6, 1], [8, 1], [10, 1], [11, 1], [14, 1]] },
  bossa: { name: 'Bossa', hits: [[0, 3], [3, 3], [6, 4], [10, 3], [13, 3]] },
  none: { name: 'Aucun', hits: [] },
};

// [pas, longueur, intervalle en demi-tons depuis la fondamentale]
export const BASS_RHYTHMS = {
  offbeat: { name: 'Contretemps', hits: [[2, 2, 0], [6, 2, 0], [10, 2, 0], [14, 2, 0]] },
  root4: { name: 'Noires', hits: [[0, 3, 0], [4, 3, 0], [8, 3, 0], [12, 3, 0]] },
  rolling: { name: 'Rolling techno', hits: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15].map((s) => [s, 0.8, 0]) },
  syncop: { name: 'Syncopée', hits: [[0, 3, 0], [3, 2, 0], [6, 1, 12], [8, 2, 0], [11, 1, 7], [14, 2, 0]] },
  long: { name: 'Tenue', hits: [[0, 14, 0]] },
  halftime: { name: 'Half-time', hits: [[0, 6, 0], [11, 4, 0]] },
  '808': { name: '808 sur le kick', hits: [[0, 7, 0], [7, 3, 0], [10, 6, 0]] },
  tresillo: { name: 'Tresillo 3-3-2', hits: [[0, 3, 0], [3, 3, 0], [6, 2, 0], [8, 3, 0], [11, 3, 0], [14, 2, 7]] },
  octave: { name: 'Octaves disco', hits: [0, 2, 4, 6, 8, 10, 12, 14].map((s, i) => [s, 1.2, i % 2 ? 12 : 0]) },
  eighths: { name: 'Croches', hits: [0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 1.6, 0]) },
  acid: { name: 'Acid 303', hits: [[0, 1, 0], [1, 1, 12], [2, 1, 0], [4, 2, 0], [6, 1, 15], [7, 1, 12], [8, 1, 0], [10, 1, 10], [11, 1, 0], [12, 2, 12], [14, 1, 0], [15, 1, 7]] },
  reese: { name: 'Reese longue', hits: [[0, 10, 0], [10, 6, 0]] },
  bossa: { name: 'Bossa (fond./quinte)', hits: [[0, 3, 0], [3, 5, 7], [8, 3, 0], [11, 5, 7]] },
  none: { name: 'Aucune', hits: [] },
};

/** Voicings des 4 accords selon le mode choisi. */
export function voiceProgression(project) {
  const size = project.ext || 3;
  const out = [];
  let prev = null;
  for (const slot of project.chords) {
    if (!slot) { out.push(null); continue; }
    const c = slotChord(project.rootPc, project.scale, slot, size);
    let notes;
    if (project.voicing === 'close') notes = closeVoicing(c.pcs, 60);
    else if (project.voicing === 'spread') notes = spreadVoicing(c.pcs, 60);
    else notes = voiceLead(prev, c.pcs, 62);
    prev = notes;
    out.push({ ...c, notes });
  }
  return out;
}

export function bassRoot(chord) {
  // Fondamentale entre E1 (40) et D#2 (51)
  return 36 + mod(chord.rootPc - 0, 12) + (mod(chord.rootPc, 12) < 4 ? 12 : 0);
}

/**
 * Événements d'une mesure à un pas donné (utilisé en temps réel et pour l'export).
 * @returns {{drums:{id,vel}[], chords:{notes,len}[], bass:{note,len}[], melody:{note,len}[]}}
 */
export function eventsAt(project, voiced, globalStep) {
  const bar = Math.floor(globalStep / STEPS_PER_BAR) % BARS;
  const s = globalStep % STEPS_PER_BAR;
  const ev = { bar, step: s, drums: [], chords: [], bass: [], melody: [] };
  for (const r of DRUM_ROWS) {
    const v = project.drums[r.id]?.[s];
    if (v) ev.drums.push({ id: r.id, vel: VEL[v] / 127 });
  }
  const chord = voiced[bar];
  if (chord) {
    for (const [hs, len] of (CHORD_RHYTHMS[project.chordStyle] || CHORD_RHYTHMS.pad).hits) {
      if (hs === s) ev.chords.push({ notes: chord.notes, len });
    }
    const root = bassRoot(chord);
    for (const [hs, len, iv] of (BASS_RHYTHMS[project.bassStyle] || BASS_RHYTHMS.none).hits) {
      if (hs === s) ev.bass.push({ note: root + iv, len });
    }
  }
  const m = project.melody?.[(globalStep) % (BARS * STEPS_PER_BAR)];
  if (m) ev.melody.push({ note: m.n, len: m.len || 1 });
  return ev;
}

/** Export MIDI multipiste de l'idée complète (4 mesures). */
export function projectToSong(project, layers = { drums: true, chords: true, bass: true, melody: true }) {
  const voiced = voiceProgression(project);
  const tracks = { drums: [], chords: [], bass: [], melody: [] };
  for (let g = 0; g < BARS * STEPS_PER_BAR; g++) {
    const ev = eventsAt(project, voiced, g);
    const t = g / 4;
    ev.drums.forEach((d) => {
      const row = DRUM_ROWS.find((r) => r.id === d.id);
      tracks.drums.push({ pitch: row.midi, start: t, dur: 0.25, vel: Math.round(d.vel * 127) });
    });
    ev.chords.forEach((c) => c.notes.forEach((n) => tracks.chords.push({ pitch: n, start: t, dur: c.len / 4, vel: 90 })));
    ev.bass.forEach((b) => tracks.bass.push({ pitch: b.note, start: t, dur: b.len / 4, vel: 100 }));
    ev.melody.forEach((m) => tracks.melody.push({ pitch: m.note, start: t, dur: m.len / 4, vel: 100 }));
  }
  const names = { drums: 'Drums', chords: 'Accords', bass: 'Basse', melody: 'Melodie' };
  return {
    bpm: project.bpm,
    tracks: Object.keys(tracks)
      .filter((k) => layers[k] && tracks[k].length)
      .map((k) => ({ name: names[k], channel: k === 'drums' ? 9 : 0, notes: tracks[k] })),
  };
}
