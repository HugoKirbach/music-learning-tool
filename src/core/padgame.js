// Pad Rush : moteur pur des pads (2×4 ou 4×4). Les partitions sont des grilles de pas par son ;
// le résultat est compatible avec TileGame / LearnSession (champ midi = numéro de pad).

export const PAD_SOUNDS = {
  kick: { name: 'Kick', color: '#ff5d73' },
  snare: { name: 'Snare', color: '#ffb84d' },
  clap: { name: 'Clap', color: '#ffe066' },
  hat: { name: 'Hat', color: '#5ce1e6' },
  ohat: { name: 'Open hat', color: '#7c9cff' },
  rim: { name: 'Rim', color: '#c77dff' },
  tom: { name: 'Tom', color: '#ff8fab' },
  cowbell: { name: 'Cowbell', color: '#f4a261' },
  conga: { name: 'Conga', color: '#e76f51' },
  shaker: { name: 'Shaker', color: '#a8dadc' },
  crash: { name: 'Crash', color: '#bde0fe' },
};

// Pad 0 = en bas à gauche (convention MPC « pad 1 »), puis de gauche à droite et de bas en haut.
export const LAYOUTS = {
  '2x4': { id: '2x4', rows: 2, cols: 4, keys: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyQ', 'KeyW', 'KeyE', 'KeyR'] },
  '4x4': {
    id: '4x4', rows: 4, cols: 4,
    keys: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'Digit1', 'Digit2', 'Digit3', 'Digit4'],
  },
};
export const padCount = (layout) => LAYOUTS[layout].rows * LAYOUTS[layout].cols;

// Place préférée de chaque son (kick, snare, hats sous les doigts de la rangée du bas).
const PREF = {
  '2x4': { kick: 0, snare: 1, hat: 2, ohat: 3, rim: 4, clap: 5, tom: 6, cowbell: 7, conga: 7, shaker: 7, crash: 7 },
  '4x4': { kick: 0, snare: 1, hat: 2, ohat: 3, rim: 4, clap: 5, tom: 6, crash: 7, cowbell: 8, conga: 9, shaker: 10 },
};

/** Attribue un pad à chaque son du niveau. Les niveaux mélodiques se rangent dans l'ordre (grave en bas). */
export function assignPads(level, layout, { lefty = false } = {}) {
  const n = padCount(layout);
  const cols = LAYOUTS[layout].cols;
  // Mode gaucher : la grille est inversée gauche ↔ droite (kick sous la main gauche… à droite)
  const mirror = (i) => (lefty ? Math.floor(i / cols) * cols + (cols - 1 - (i % cols)) : i);
  const used = new Set();
  const out = [];
  level.pads.forEach((p, i) => {
    let idx = level.melodic ? mirror(i) : PREF[layout][p.id] != null ? mirror(PREF[layout][p.id]) : null;
    if (idx == null || used.has(idx) || idx >= n) idx = [...Array(n).keys()].map(mirror).find((k) => !used.has(k));
    used.add(idx);
    out.push({ ...p, idx, name: p.name || PAD_SOUNDS[p.id]?.name || p.id, color: p.color || PAD_SOUNDS[p.id]?.color || '#b388ff' });
  });
  return out;
}

const clean = (s) => s.replace(/[\s|]/g, '');

/**
 * Partition jouable. level.pattern = { idDuPad: 'x...X...g...' } (1 caractère par pas, level.res pas par temps).
 * x = coup, X = accent, g = ghost note, . ou - = silence. Le motif est répété level.repeat fois.
 * rolls=false : au plus une croche par pad (les roulements 1/16 et 1/32 sont simplifiés, pratique au tactile).
 */
export function buildPadChart(level, diff, { layout = '2x4', rolls = true, repeat = level.repeat || 1, lefty = false } = {}) {
  const res = level.res || 4;
  const bpm = Math.round(level.bpm * diff.tempo);
  const spb = 60 / bpm;
  const pads = assignPads(level, layout, { lefty });
  const byId = Object.fromEntries(pads.map((p) => [p.id, p]));
  const steps = Math.max(...Object.values(level.pattern).map((s) => clean(s).length));
  const baseBeats = steps / res;
  let notes = [];
  for (let r = 0; r < repeat; r++) {
    for (const [id, str] of Object.entries(level.pattern)) {
      const p = byId[id];
      if (!p) throw new Error(`Pad inconnu dans le motif : ${id}`);
      [...clean(str)].forEach((c, s) => {
        if (!'xXg'.includes(c)) return;
        const beat = r * baseBeats + s / res;
        notes.push({ midi: p.idx, pad: id, beat, t: beat * spb, dur: spb / res, beats: 1 / res, hold: false, vel: c === 'X' ? 'acc' : c === 'g' ? 'ghost' : null, label: null });
      });
    }
  }
  let thinned = 0;
  if (!rolls) {
    const last = {};
    notes.sort((a, b) => a.t - b.t);
    notes = notes.filter((n) => {
      if (last[n.midi] != null && n.beat - last[n.midi] < 0.5 - 1e-6) { thinned++; return false; }
      last[n.midi] = n.beat;
      return true;
    });
  }
  notes.sort((a, b) => a.t - b.t || a.midi - b.midi);
  const at = new Map();
  for (const n of notes) at.set(n.t, (at.get(n.t) || 0) + 1);
  notes.forEach((n, i) => { n.id = i; n.chord = at.get(n.t) > 1; });
  const beats = baseBeats * repeat;
  return { bpm, spb, res, meter: 4, pickup: 0, beats, baseBeats, length: beats * spb, notes, chords: [], pads, thinned, lo: 0, hi: padCount(layout) - 1 };
}

/** Le niveau contient-il des notes plus rapides que la croche sur un même pad (roulements) ? */
export function hasRolls(level) {
  const res = level.res || 4;
  return Object.values(level.pattern).some((str) => {
    let prev = null;
    return [...clean(str)].some((c, s) => {
      if (!'xXg'.includes(c)) return false;
      const fast = prev != null && (s - prev) / res < 0.5 - 1e-6;
      prev = s;
      return fast;
    });
  });
}

/** Dynamique : un accent doit être frappé fort, une ghost note doucement. null = pas de consigne. */
export function judgeVelocity(expected, v) {
  if (!expected || v == null) return null;
  return expected === 'acc' ? v >= 0.68 : v <= 0.5;
}

/** Note MIDI → numéro de pad : réglage de l'assistant, sinon convention MPC (pad 1 = note 36). */
export function padForNote(note, map = {}, layout = '2x4') {
  if (map[note] != null) return map[note] < padCount(layout) ? map[note] : null;
  const i = note - 36;
  return i >= 0 && i < padCount(layout) ? i : null;
}
