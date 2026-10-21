// Maquettes : petits morceaux arrangés en sections (intro, break, montée, drop…), décrits note par note.
// Module pur : construit la liste d'événements (en doubles croches) et l'export MIDI multipiste.

export const DEMO_DRUM_MIDI = { kick: 36, snare: 38, clap: 39, hat: 42, ohat: 46, perc: 37, crash: 49 };
const STEPS = 16;

/**
 * Construit une maquette. compose(api) décrit les sections ; chaque section reçoit un « s » avec des outils
 * dont les mesures sont relatives au début de la section.
 */
export function createSong({ title, bpm, kit = 'club' }, compose) {
  const events = [];
  const sections = [];
  let bar = 0;
  const push = (e) => events.push(e);
  const tool = (start, bars) => {
    const at = (b, step) => (start + b) * STEPS + step;
    const each = (fromBar, toBar, fn) => { for (let b = fromBar; b < Math.min(toBar, bars); b++) fn(b); };
    return {
      bars,
      /** Batterie : motif de 16 caractères (x normal, X accent, o doux) ou fonction (mesure) → motif. */
      drum(id, pattern, { from = 0, to = bars, vel = 0.9 } = {}) {
        each(from, to, (b) => {
          const p = typeof pattern === 'function' ? pattern(b) : pattern;
          if (!p) return;
          [...p].forEach((c, i) => { if ('xXo'.includes(c)) push({ kind: 'drum', t: at(b, i), id, vel: c === 'X' ? 1 : c === 'o' ? vel * 0.45 : vel }); });
        });
      },
      /** Hi-hats en doubles croches avec une vélocité par position dans le temps (groove). */
      hats(vels, { id = 'hat', from = 0, to = bars } = {}) {
        each(from, to, (b) => { for (let i = 0; i < STEPS; i++) { const v = vels[i % vels.length]; if (v > 0) push({ kind: 'drum', t: at(b, i), id, vel: v }); } });
      },
      /** Roulement : `per` coups par temps, de `fromStep` à `toStep` d'une mesure, vélocité qui monte. */
      roll(id, b, per, { fromStep = 0, toStep = STEPS, v0 = 0.45, v1 = 0.95 } = {}) {
        const n = Math.round(((toStep - fromStep) / 4) * per);
        for (let k = 0; k < n; k++) push({ kind: 'drum', t: at(b, fromStep + (k * 4) / per), id, vel: v0 + ((v1 - v0) * k) / Math.max(1, n - 1) });
      },
      /** Notes d'une piste : [mesure, pas, midi, durée en pas, vélocité?]. glide = portamento d'une note à l'autre. */
      notes(track, preset, list, { vel = 0.8, glide = false, send = null, from = 0, to = bars } = {}) {
        for (const [b, step, midi, len, v] of list) if (b >= from && b < to && b < bars) push({ kind: 'note', t: at(b, step), track, preset, midi, len, vel: v ?? vel, glide, send });
      },
      /** Accords d'une progression (un accord par mesure, en boucle) sur un rythme [[pas, durée], …]. */
      chords(track, preset, prog, rhythm, { vel = 0.6, from = 0, to = bars, ramp = null } = {}) {
        each(from, to, (b) => {
          const notes = prog[b % prog.length];
          rhythm.forEach(([step, len], k) => {
            const v = ramp ? ramp[0] + ((ramp[1] - ramp[0]) * ((b - from) * rhythm.length + k)) / ((to - from) * rhythm.length) : vel;
            notes.forEach((midi) => push({ kind: 'note', t: at(b, step), track, preset, midi, len, vel: v }));
          });
        });
      },
      /** Basse : une fondamentale par mesure (en boucle), jouée sur les pas donnés ; octaves = { pas: +12 }. */
      bass(track, preset, roots, steps, { len = 1, vel = 0.85, octaves = {}, from = 0, to = bars } = {}) {
        each(from, to, (b) => steps.forEach((st) => push({ kind: 'note', t: at(b, st), track, preset, midi: roots[b % roots.length] + (octaves[st] || 0), len, vel })));
      },
      riser(b, nBars) { push({ kind: 'riser', t: at(b, 0), len: nBars * STEPS }); },
      filter(b, from, to, nBars = 0) { push({ kind: 'filter', t: at(b, 0), from, to, len: nBars * STEPS }); },
      pump(b, amount) { push({ kind: 'pump', t: at(b, 0), amount }); },
      crash(b, step = 0, vel = 0.8) { push({ kind: 'drum', t: at(b, step), id: 'crash', vel }); },
    };
  };
  compose({
    section(name, emoji, bars, desc, fn) {
      sections.push({ name, emoji, start: bar, bars, desc });
      fn(tool(bar, bars));
      bar += bars;
    },
  });
  events.sort((a, b) => a.t - b.t);
  return { title, bpm, kit, bars: bar, steps: bar * STEPS, seconds: (bar * 4 * 60) / bpm, sections, events };
}

/** Section en cours pour un pas donné. */
export function sectionAt(song, step) {
  const bar = Math.floor(step / STEPS);
  return song.sections.findIndex((s) => bar >= s.start && bar < s.start + s.bars);
}

/** Export MIDI multipiste (une piste par instrument, batterie sur le canal 10, sections en marqueurs). */
export function demoToSong(song) {
  const tracks = new Map();
  const add = (name, channel, note) => { if (!tracks.has(name)) tracks.set(name, { name, channel, notes: [] }); tracks.get(name).notes.push(note); };
  let ch = 0;
  const chans = {};
  for (const e of song.events) {
    if (e.kind === 'drum') add('Batterie', 9, { pitch: DEMO_DRUM_MIDI[e.id] ?? 37, start: e.t / 4, dur: 0.25, vel: Math.round(e.vel * 127) });
    else if (e.kind === 'note') {
      if (chans[e.track] == null) { chans[e.track] = ch; ch = ch === 8 ? 10 : ch + 1; }
      add(e.track, chans[e.track], { pitch: e.midi, start: e.t / 4, dur: e.len / 4, vel: Math.round(e.vel * 127) });
    }
  }
  return { bpm: song.bpm, tracks: [...tracks.values()], markers: song.sections.map((s) => ({ beat: s.start * 4, text: s.name })) };
}
