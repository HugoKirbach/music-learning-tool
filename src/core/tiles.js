// Piano Rush : moteur pur (partition → notes qui tombent, jugement du timing, notes tenues, score).
// Convention interne de la notation : C4 = 60 (Do central).

export const DIFFS = {
  facile: { id: 'facile', name: 'Facile', emoji: '🌱', tempo: 0.75, window: 0.16, perfect: 0.07, look: 3.0, labels: true, holdTol: 0.3 },
  normal: { id: 'normal', name: 'Normal', emoji: '🎯', tempo: 1, window: 0.13, perfect: 0.055, look: 2.4, labels: true, holdTol: 0.22 },
  difficile: { id: 'difficile', name: 'Difficile', emoji: '🔥', tempo: 1.15, window: 0.1, perfect: 0.045, look: 2.0, labels: true, holdTol: 0.16 },
  expert: { id: 'expert', name: 'Expert', emoji: '💀', tempo: 1.3, window: 0.08, perfect: 0.035, look: 1.6, labels: false, holdTol: 0.12 },
};

const PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FR = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const mod12 = (n) => ((n % 12) + 12) % 12;

export const isBlack = (m) => [1, 3, 6, 8, 10].includes(mod12(m));
export const noteFr = (m) => FR[mod12(m)];
export const noteEn = (m) => EN[mod12(m)];
/** Nom affiché selon la préférence : 'fr' (Do), 'en' (C) ou 'both' (Do · C). */
export function noteLabel(m, lang = 'both') {
  return lang === 'fr' ? noteFr(m) : lang === 'en' ? noteEn(m) : `${noteFr(m)} · ${noteEn(m)}`;
}

/** 'C4' → 60, 'F#3' → 54, 'Bb4' → 70. */
export function parseNote(s) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s.trim());
  if (!m) throw new Error(`Note invalide : ${s}`);
  return PCS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
}

// Accords : intervalles depuis la fondamentale (les 9e sont jouées sans quinte, comme au piano).
export const CHORD_TYPES = {
  '': { name: 'majeur', iv: [0, 4, 7] },
  m: { name: 'mineur', iv: [0, 3, 7] },
  7: { name: 'septième de dominante', iv: [0, 4, 7, 10] },
  maj7: { name: 'septième majeure', iv: [0, 4, 7, 11] },
  m7: { name: 'mineur septième', iv: [0, 3, 7, 10] },
  dim: { name: 'diminué', iv: [0, 3, 6] },
  sus2: { name: 'sus2', iv: [0, 2, 7] },
  sus4: { name: 'sus4', iv: [0, 5, 7] },
  6: { name: 'sixte', iv: [0, 4, 7, 9] },
  add9: { name: 'add9', iv: [0, 4, 7, 14] },
  maj9: { name: 'neuvième majeure', iv: [0, 4, 11, 14] },
  m9: { name: 'mineur neuvième', iv: [0, 3, 10, 14] },
};

/** '@Am7' ou '@Am7/3' (octave de la fondamentale) → { label, notes }. Par défaut la fondamentale est entre Fa3 et Mi4. */
export function parseChord(sym) {
  const [body, oct] = sym.split('/');
  const m = /^([A-G])([#b]?)(.*)$/.exec(body);
  if (!m || !CHORD_TYPES[m[3]]) throw new Error(`Accord invalide : ${sym}`);
  const pc = mod12(PCS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0));
  const root = oct != null ? pc + (Number(oct) + 1) * 12 : 60 + pc - (pc > 4 ? 12 : 0);
  return { label: body.replace('#', '♯').replace(/^([A-G])b/, '$1♭'), notes: CHORD_TYPES[m[3]].iv.map((i) => root + i), type: m[3] };
}

const num = (s) => (s.includes('/') ? Number(s.split('/')[0]) / Number(s.split('/')[1]) : Number(s));

/**
 * Notation compacte : jetons séparés par des espaces, '|' = barre de mesure (ignorée).
 * 'E4:1' note · '-:0.5' silence · 'C4+E4+G4=C:2' accord écrit (étiquette facultative) · '@Am7:2' accord par symbole.
 * Durées en temps (noire = 1), fractions acceptées ('1/3').
 */
export function parseSeq(str) {
  const events = [];
  let beat = 0;
  for (const tok of str.split(/\s+/).filter((x) => x && x !== '|')) {
    const i = tok.lastIndexOf(':');
    if (i < 0) throw new Error(`Durée manquante : ${tok}`);
    const head = tok.slice(0, i);
    const dur = num(tok.slice(i + 1));
    if (!(dur > 0)) throw new Error(`Durée invalide : ${tok}`);
    if (head !== '-') {
      if (head.startsWith('@')) {
        const c = parseChord(head.slice(1));
        events.push({ beat, dur, notes: c.notes, label: c.label });
      } else {
        const [ns, label] = head.split('=');
        const notes = ns.split('+').map(parseNote);
        events.push({ beat, dur, notes, label: label || (notes.length > 1 ? null : undefined) });
      }
    }
    beat += dur;
  }
  return { events, beats: beat };
}

/** Partition jouable : temps en secondes au tempo choisi, notes tenues, étiquettes d'accords, tessiture. */
export function buildChart(level, diff = DIFFS.normal, { holdMin = level.stabs ? Infinity : 1.5 } = {}) {
  const bpm = Math.round(level.bpm * diff.tempo);
  const spb = 60 / bpm;
  const meter = level.meter || 4;
  const seqs = Array.isArray(level.seq) ? level.seq : [level.seq];
  const notes = [];
  const chords = [];
  let beats = 0;
  seqs.forEach((s, voice) => {
    const p = parseSeq(s);
    beats = Math.max(beats, p.beats);
    for (const ev of p.events) {
      if (ev.label) chords.push({ t: ev.beat * spb, beat: ev.beat, label: ev.label, notes: ev.notes });
      for (const midi of ev.notes) {
        notes.push({
          id: notes.length, midi, voice, beat: ev.beat, t: ev.beat * spb, dur: ev.dur * spb, beats: ev.dur,
          hold: ev.dur >= holdMin, chord: ev.notes.length > 1, label: ev.label || null,
        });
      }
    }
  });
  notes.sort((a, b) => a.t - b.t || a.midi - b.midi);
  notes.forEach((n, i) => { n.id = i; });
  const all = notes.map((n) => n.midi);
  return {
    bpm, spb, meter, pickup: level.pickup || 0, beats, length: beats * spb, notes, chords: chords.sort((a, b) => a.t - b.t),
    lo: Math.min(...all), hi: Math.max(...all),
  };
}

/** Touches visibles : de la touche blanche ≤ note la plus grave à la blanche ≥ la plus aiguë, 1 octave minimum. */
export function keyRange(lo, hi) {
  let a = lo, b = hi;
  while (isBlack(a)) a--;
  while (isBlack(b)) b++;
  while (b - a < 12) { b++; while (isBlack(b)) b++; }
  return { lo: a, hi: b };
}
export function whiteKeys(lo, hi) {
  const out = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) out.push(m);
  return out;
}

export function judge(dt, diff) {
  const a = Math.abs(dt);
  return a <= diff.perfect ? 'perfect' : a <= diff.window ? 'good' : null;
}

export function starsFor(acc) {
  return acc >= 93 ? 3 : acc >= 80 ? 2 : acc >= 60 ? 1 : 0;
}

/** Partie en cours : appuis, relâchements, ratés, combo, score. Temps en secondes « partition ». */
export class TileGame {
  constructor(chart, diff) {
    this.chart = chart;
    this.diff = diff;
    this.notes = chart.notes.map((n) => ({ ...n, state: 'wait', grade: null, held: 0, off: 0 }));
    this.cursor = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.points = 0;
    this.score = 0;
    this.wrong = 0;
    this.active = new Map();
    this.events = [];
  }

  /** Appui sur une touche. octaveFree : accepte la même note à une autre octave (clavier MIDI décalé). */
  press(midi, t, { octaveFree = false } = {}) {
    const w = this.diff.window;
    let best = null;
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t - t > w) break;
      if (n.state !== 'wait' || Math.abs(n.t - t) > w) continue;
      const exact = n.midi === midi;
      if (!exact && !(octaveFree && mod12(n.midi) === mod12(midi))) continue;
      const score = Math.abs(n.t - t) + (exact ? 0 : 0.001);
      if (!best || score < best.score) best = { n, score };
    }
    if (!best) {
      this.wrong++;
      this.combo = 0;
      const ev = { type: 'wrong', midi, t };
      this.events.push(ev);
      return ev;
    }
    const n = best.n;
    n.grade = judge(t - n.t, this.diff);
    n.off = t - n.t;
    if (n.hold) {
      n.state = 'holding';
      this.active.set(midi, n);
    } else {
      n.state = 'done';
      this.award(n);
    }
    const ev = { type: 'hit', note: n, grade: n.grade, t };
    this.events.push(ev);
    return ev;
  }

  release(midi, t) {
    const n = this.active.get(midi);
    if (!n) return null;
    this.active.delete(midi);
    n.held = t >= n.t + n.dur - this.diff.holdTol ? 1 : Math.max(0, Math.min(1, (t - n.t) / n.dur));
    n.state = 'done';
    this.award(n);
    return n;
  }

  award(n) {
    const base = n.grade === 'perfect' ? 100 : 70;
    const pts = n.hold ? base * (0.4 + 0.6 * n.held) : base;
    if (n.hold && n.held < 0.6) this.combo = 0;
    else this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.points += pts;
    this.score += Math.round(pts * (1 + Math.min(this.combo, 50) / 50));
  }

  /** À appeler à chaque image : ratés et fins de notes tenues. Renvoie les notes ratées depuis le dernier appel. */
  update(t) {
    const missed = [];
    for (const n of this.active.values()) {
      if (t >= n.t + n.dur) { this.active.delete(n.midi); n.held = 1; n.state = 'done'; this.award(n); }
    }
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t + this.diff.window >= t) break;
      if (n.state === 'wait') { n.state = 'miss'; this.combo = 0; missed.push(n); }
    }
    while (this.cursor < this.notes.length && this.notes[this.cursor].state !== 'wait' && this.notes[this.cursor].t + this.diff.window < t) this.cursor++;
    return missed;
  }

  finished(t) {
    return t > this.chart.length + 0.6 && this.active.size === 0;
  }

  results() {
    const n = this.notes.length || 1;
    const hits = this.notes.filter((x) => x.grade);
    const perfect = hits.filter((x) => x.grade === 'perfect').length;
    const miss = this.notes.filter((x) => x.state === 'miss' || (x.state === 'wait')).length;
    const penalty = Math.min(15, this.wrong * 1.5);
    const acc = Math.max(0, Math.round((this.points / (100 * n)) * 100 - penalty));
    const offs = hits.map((x) => x.off);
    const meanOff = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0;
    const shortHolds = this.notes.filter((x) => x.hold && x.grade && x.held < 0.8).length;
    const bars = {};
    for (const x of this.notes) if (x.state === 'miss' || x.state === 'wait') { const b = Math.floor((x.beat - this.chart.pickup) / this.chart.meter) + (this.chart.pickup ? 2 : 1); bars[b] = (bars[b] || 0) + 1; }
    const weakBars = Object.entries(bars).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => Number(b)).sort((a, b) => a - b);
    return {
      acc, stars: starsFor(acc), score: this.score, perfect, good: hits.length - perfect, miss, wrong: this.wrong,
      maxCombo: this.maxCombo, total: this.notes.length, meanOffMs: Math.round(meanOff * 1000), shortHolds, weakBars,
    };
  }
}

// ---------- Rythmes aléatoires (mode libre) ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Cellules rythmiques d'un temps ou deux, de la plus simple à la plus complexe ('r' = silence).
export const CELLS = [
  [[2], [1, 1], [4]],
  [[0.5, 0.5], [1.5, 0.5], ['r1', 1]],
  [[0.75, 0.25], [0.5, 1, 0.5], ['r0.5', 0.5], [1.5, 1.5, 1]],
  [[0.25, 0.25, 0.25, 0.25], ['1/3', '1/3', '1/3'], [0.25, 0.25, 0.5], ['r0.25', 0.25, 0.5]],
];
const TIER = { facile: 1, normal: 2, difficile: 3, expert: 4 };

/** Exercice généré : mélodie en Do majeur, cellules de plus en plus complexes selon la difficulté. */
export function randomLevel(diffId = 'normal', seed = Date.now()) {
  const r = rng(seed);
  const tier = TIER[diffId] || 2;
  const pool = CELLS.slice(0, tier).flat();
  const scale = [60, 62, 64, 65, 67, 69, 71, 72];
  const names = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
  // Accords renversés autour du Do central : la main bouge peu.
  const chordsByBar = ['C4+E4+G4=C', 'C4+F4+A4=F', 'B3+D4+G4=G', 'C4+E4+A4=Am'];
  let idx = 2;
  const toks = [];
  for (let bar = 0; bar < 8; bar++) {
    let left = 4;
    if (tier >= 3 && bar % 2 === 0) { toks.push(`${chordsByBar[Math.floor(r() * 4)]}:1`); left -= 1; }
    while (left > 1e-6) {
      const fit = pool.filter((c) => c.reduce((a, x) => a + (typeof x === 'string' ? num(x.replace('r', '')) : x), 0) <= left + 1e-6);
      const cell = fit.length ? fit[Math.floor(r() * fit.length)] : [left];
      for (const x of cell) {
        const rest = typeof x === 'string' && x.startsWith('r');
        const d = typeof x === 'string' ? num(x.replace('r', '')) : x;
        if (rest) toks.push(`-:${d}`);
        else {
          idx = Math.max(0, Math.min(scale.length - 1, idx + Math.round((r() - 0.5) * 4)));
          toks.push(`${names[idx]}:${d}`);
        }
        left -= d;
      }
    }
    toks.push('|');
  }
  const d = DIFFS[diffId] || DIFFS.normal;
  return {
    id: `random-${diffId}`, random: true, title: `Rythmes aléatoires · ${d.name}`, emoji: '🎲', skill: 'rythme',
    bpm: [0, 80, 90, 96, 100][tier], seq: toks.join(' '),
    concept: ['', 'Noires, blanches, rondes', '+ croches, noire pointée, silences', '+ syncopes, tresillo, accords', '+ doubles croches, triolets'][tier],
    intro: 'Un exercice tiré au sort à partir de cellules rythmiques. Lis la cellule avant qu’elle arrive : compte « 1 et 2 et… » à voix haute.',
    points: ['Repère les temps forts (lignes épaisses = début de mesure).', 'Une note longue se tient jusqu’au bout de la tuile.'],
    outro: 'Chaque exercice est différent : rejoue-en plusieurs pour lire les rythmes de plus en plus vite.',
    studio: 'Dans Live, dessine un clip de 8 mesures avec ces cellules sur une seule note : tu viens d’écrire un motif de hi-hat ou de basse.',
    seed,
  };
}
