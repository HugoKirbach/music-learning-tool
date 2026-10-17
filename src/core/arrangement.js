// Lab Arrangement : transformer la boucle de 4 mesures en morceau de 64 mesures (16 blocs de 4 mesures). Module pur.
import { eventsAt, voiceProgression, BARS, STEPS_PER_BAR } from './arrange.js';
import { DRUM_ROWS } from './rhythm.js';

export const BLOCKS = 16;
export const BLOCK_STEPS = BARS * STEPS_PER_BAR; // 64 doubles-croches = 4 mesures
export const LAYERS = ['drums', 'bass', 'chords', 'melody'];

export const SECTIONS = {
  intro: { name: 'Intro', color: '#5ce1e6' },
  verse: { name: 'Couplet', color: '#7c9cff' },
  build: { name: 'Build', color: '#ffb84d' },
  drop: { name: 'Drop', color: '#ff5d73' },
  chorus: { name: 'Refrain', color: '#ff5d73' },
  break: { name: 'Break', color: '#c77dff' },
  outro: { name: 'Outro', color: '#5ce1e6' },
};

export const DRUM_MODES = {
  full: { name: 'Complète', rows: null },
  nokick: { name: 'Sans kick', rows: ['snare', 'clap', 'hat', 'ohat', 'perc'] },
  kick: { name: 'Kick seul', rows: ['kick'] },
  hats: { name: 'Hats + percus', rows: ['hat', 'ohat', 'perc'] },
};

export const FILTERS = {
  none: { name: 'Aucun' },
  closed: { name: 'Fermé (sourd)' },
  open: { name: 'S’ouvre ↗' },
  down: { name: 'Se ferme ↘' },
};

export function block(sec, layers, extra = {}) {
  return {
    sec,
    layers: Object.fromEntries(LAYERS.map((l) => [l, layers.includes(l)])),
    drumMode: 'full', filter: 'none', riser: false, roll: false,
    ...extra,
  };
}

const ALL = ['drums', 'bass', 'chords', 'melody'];

export const TEMPLATES = {
  club: {
    name: 'Club (intro → build → drop → break → drop)',
    blocks: () => [
      block('intro', ['drums'], { drumMode: 'kick' }), block('intro', ['drums'], { drumMode: 'full' }),
      block('intro', ['drums', 'bass']), block('intro', ['drums', 'bass'], { filter: 'closed' }),
      block('build', ['drums', 'chords'], { drumMode: 'nokick', filter: 'open' }), block('build', ['drums', 'chords'], { drumMode: 'nokick', filter: 'open', riser: true, roll: true }),
      block('drop', ALL), block('drop', ALL), block('drop', ['drums', 'bass', 'chords']), block('drop', ALL, { drumMode: 'nokick' }),
      block('break', ['chords', 'melody']), block('break', ['chords', 'melody'], { filter: 'down' }),
      block('build', ['drums', 'chords'], { drumMode: 'hats', filter: 'open', riser: true, roll: true }),
      block('drop', ALL), block('drop', ALL),
      block('outro', ['drums', 'bass'], { filter: 'down' }),
    ],
  },
  song: {
    name: 'Chanson (couplet / refrain)',
    blocks: () => [
      block('intro', ['chords']), block('intro', ['chords', 'drums'], { drumMode: 'hats' }),
      block('verse', ['drums', 'bass', 'chords']), block('verse', ['drums', 'bass', 'chords']),
      block('build', ['drums', 'bass', 'chords'], { roll: true, filter: 'open' }),
      block('chorus', ALL), block('chorus', ALL),
      block('verse', ['drums', 'bass', 'chords']), block('verse', ['drums', 'bass', 'chords'], { drumMode: 'nokick' }),
      block('build', ['drums', 'chords'], { roll: true, riser: true, filter: 'open' }),
      block('chorus', ALL), block('chorus', ALL),
      block('break', ['chords', 'melody'], { filter: 'closed' }),
      block('chorus', ALL), block('chorus', ALL),
      block('outro', ['chords'], { filter: 'down' }),
    ],
  },
  loop: {
    name: 'Boucle pleine (arrangement soustractif)',
    blocks: () => Array.from({ length: BLOCKS }, () => block('drop', ALL)),
  },
};

export function newArrangement(template = 'club') {
  return { template, blocks: TEMPLATES[template].blocks() };
}

/** Événements d'un pas global (0 → 1023) de l'arrangement. */
export function arrangementEventsAt(project, voiced, arr, g) {
  const bi = Math.floor(g / BLOCK_STEPS);
  const b = arr.blocks[bi];
  const local = g % BLOCK_STEPS;
  const ev = eventsAt(project, voiced, local);
  if (!b) return { ...ev, block: bi, local, drums: [], chords: [], bass: [], melody: [] };
  const rows = DRUM_MODES[b.drumMode]?.rows;
  if (!b.layers.drums) ev.drums = [];
  else if (rows) ev.drums = ev.drums.filter((d) => rows.includes(d.id));
  if (!b.layers.chords) ev.chords = [];
  if (!b.layers.bass) ev.bass = [];
  if (!b.layers.melody) ev.melody = [];
  // Roulement de snare sur la dernière mesure : croches puis doubles-croches, crescendo
  if (b.roll && local >= 48 && (local >= 56 || local % 2 === 0)) {
    ev.drums = ev.drums.filter((d) => d.id !== 'snare');
    ev.drums.push({ id: 'snare', vel: 0.25 + 0.75 * ((local - 48) / 15) });
  }
  return { ...ev, block: bi, local };
}

export function activeLayers(b) {
  return LAYERS.filter((l) => b.layers[l]).length;
}

const sig = (b) => JSON.stringify([b.sec, b.layers, b.drumMode, b.filter, b.riser, b.roll]);

/** Export MIDI : 64 mesures, 4 pistes, marqueurs de sections. */
export function arrangementToSong(project, arr) {
  const voiced = voiceProgression(project);
  const tr = { drums: [], chords: [], bass: [], melody: [] };
  for (let g = 0; g < BLOCKS * BLOCK_STEPS; g++) {
    const ev = arrangementEventsAt(project, voiced, arr, g);
    const t = g / 4;
    ev.drums.forEach((d) => tr.drums.push({ pitch: DRUM_ROWS.find((r) => r.id === d.id).midi, start: t, dur: 0.25, vel: Math.round(d.vel * 127) }));
    ev.chords.forEach((c) => c.notes.forEach((n) => tr.chords.push({ pitch: n, start: t, dur: c.len / 4, vel: 90 })));
    ev.bass.forEach((b) => tr.bass.push({ pitch: b.note, start: t, dur: b.len / 4, vel: 100 }));
    ev.melody.forEach((m) => tr.melody.push({ pitch: m.note, start: t, dur: m.len / 4, vel: 100 }));
  }
  const markers = [];
  arr.blocks.forEach((b, i) => {
    if (i === 0 || b.sec !== arr.blocks[i - 1].sec) markers.push({ beat: i * 16, text: SECTIONS[b.sec].name });
  });
  const names = { drums: 'Drums', chords: 'Accords', bass: 'Basse', melody: 'Melodie' };
  return {
    bpm: project.bpm,
    markers,
    tracks: Object.keys(tr).filter((k) => tr[k].length).map((k) => ({ name: names[k], channel: k === 'drums' ? 9 : 0, notes: tr[k] })),
  };
}

const runs = (arr) => {
  const out = [];
  arr.blocks.forEach((b, i) => {
    if (i && arr.blocks[i - 1].sec === b.sec) out[out.length - 1].blocks.push(b);
    else out.push({ sec: b.sec, start: i, blocks: [b] });
  });
  return out;
};

const tensionTools = (b) => (b.filter === 'open' ? 1 : 0) + (b.riser ? 1 : 0) + (b.roll ? 1 : 0) + (b.drumMode === 'nokick' || b.drumMode === 'hats' ? 1 : 0);

export const ARR_CHALLENGES = [
  {
    id: 'structure', title: 'Structure complète',
    text: 'Construis une structure avec intro, build, drop, break et une fin. Règle : jamais plus de 8 mesures (2 blocs) strictement identiques d’affilée.',
    check: (arr) => {
      const secs = runs(arr).map((r) => r.sec);
      const hasBuildDrop = secs.some((s, i) => s === 'build' && ['drop', 'chorus'].includes(secs[i + 1]));
      let same = 1, ok = true;
      for (let i = 1; i < arr.blocks.length; i++) { same = sig(arr.blocks[i]) === sig(arr.blocks[i - 1]) ? same + 1 : 1; if (same > 2) ok = false; }
      return secs[0] === 'intro' && hasBuildDrop && secs.includes('break') && ['outro', 'drop', 'chorus'].includes(secs[secs.length - 1]) && ok;
    },
    lesson: 'Toutes les 8 mesures, quelque chose doit changer : c’est ce qui garde l’auditeur (et le danseur) en éveil.',
  },
  {
    id: 'tension', title: 'Tension sans notes',
    text: 'Crée un build de 8 mesures (2 blocs) qui fait monter la tension SANS ajouter de piste : utilise au moins 3 outils (filtre qui s’ouvre, riser, roulement, retrait du kick).',
    check: (arr) => runs(arr).some((r) => {
      if (r.sec !== 'build' || r.blocks.length < 2 || r.start === 0) return false;
      const prev = arr.blocks[r.start - 1];
      const noAdd = r.blocks.every((b) => activeLayers(b) <= activeLayers(prev));
      return noAdd && r.blocks.reduce((s, b) => s + tensionTools(b), 0) >= 3;
    }),
    lesson: 'La tension vient du retrait (kick coupé) et du mouvement (filtre, riser, roulement), pas de l’ajout de notes. Dans Live : Auto Filter + automation, et un sample de riser.',
  },
  {
    id: 'contrast', title: 'Contraste maximal',
    text: 'Chaque drop/refrain doit être précédé d’une section qui a au moins 2 pistes de moins. Au moins 2 drops.',
    check: (arr) => {
      const r = runs(arr);
      const drops = r.filter((x) => ['drop', 'chorus'].includes(x.sec));
      return drops.length >= 2 && drops.every((d) => d.start > 0 && activeLayers(arr.blocks[d.start]) - activeLayers(arr.blocks[d.start - 1]) >= 2);
    },
    lesson: 'Un drop n’est fort que par contraste avec ce qui précède. Vide avant de remplir.',
  },
  {
    id: 'subtractive', title: 'Arrangement soustractif',
    text: 'Pars de la boucle pleine (modèle « Boucle pleine ») : en retirant des éléments, crée au moins 6 configurations différentes, avec une intro de 2 pistes maximum.',
    check: (arr) => new Set(arr.blocks.map(sig)).size >= 6 && activeLayers(arr.blocks[0]) <= 2,
    lesson: 'Il est plus facile d’enlever que d’ajouter : duplique ta boucle sur tout le morceau, puis supprime. C’est la méthode la plus rapide pour finir un titre.',
  },
];
