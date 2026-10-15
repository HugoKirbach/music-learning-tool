// Théorie musicale : gammes, accords, chiffrage romain, voice leading.
// Module pur (aucun accès DOM / audio) pour être testable avec `node --test`.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export const SCALES = {
  major: { name: 'Majeur (Ionien)', steps: [0, 2, 4, 5, 7, 9, 11], mood: 'Lumineux, pop, euphorique' },
  minor: { name: 'Mineur (Éolien)', steps: [0, 2, 3, 5, 7, 8, 10], mood: 'Mélancolique, club, trance' },
  dorian: { name: 'Dorien', steps: [0, 2, 3, 5, 7, 9, 10], mood: 'Mineur jazzy : deep house, funk, lo-fi' },
  phrygian: { name: 'Phrygien', steps: [0, 1, 3, 5, 7, 8, 10], mood: 'Sombre, tendu : techno, dark, oriental' },
  lydian: { name: 'Lydien', steps: [0, 2, 4, 6, 7, 9, 11], mood: 'Rêveur, flottant : cinéma, synthwave' },
  mixolydian: { name: 'Mixolydien', steps: [0, 2, 4, 5, 7, 9, 10], mood: 'Funky, solaire : disco, funk, rock' },
  harmonicMinor: { name: 'Mineur harmonique', steps: [0, 2, 3, 5, 7, 8, 11], mood: 'Dramatique : trance, hardstyle, oriental' },
  pentaMinor: { name: 'Penta mineure', steps: [0, 3, 5, 7, 10], mood: 'Impossible de sonner faux : leads, hooks' },
  pentaMajor: { name: 'Penta majeure', steps: [0, 2, 4, 7, 9], mood: 'Simple, joyeux : pop, afro, hooks' },
  blues: { name: 'Blues', steps: [0, 3, 5, 6, 7, 10], mood: 'Bluesy : hip-hop, funk, breaks' },
};

/** Gammes à 7 notes (utilisables pour construire des accords par degré). */
export const HEPTATONIC = Object.keys(SCALES).filter((k) => SCALES[k].steps.length === 7);

export const mod = (n, m) => ((n % m) + m) % m;

/** Convention Ableton / MPC : C3 = 60. */
export function midiToName(m) {
  return NOTE_NAMES[mod(m, 12)] + (Math.floor(m / 12) - 2);
}

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function pcName(pc) {
  return NOTE_NAMES[mod(pc, 12)];
}

/** Toutes les notes MIDI d'une gamme entre low et high inclus. */
export function scaleNotes(rootPc, scaleId, low, high) {
  const steps = SCALES[scaleId].steps;
  const out = [];
  for (let m = low; m <= high; m++) {
    if (steps.includes(mod(m - rootPc, 12))) out.push(m);
  }
  return out;
}

export function inScale(midi, rootPc, scaleId) {
  return SCALES[scaleId].steps.includes(mod(midi - rootPc, 12));
}

// Table de reconnaissance des accords : intervalles (classes de hauteur depuis la fondamentale).
const CHORD_TABLE = [
  { iv: [0, 4, 7], sym: '', q: 'maj', label: 'Majeur' },
  { iv: [0, 3, 7], sym: 'm', q: 'min', label: 'Mineur' },
  { iv: [0, 3, 6], sym: 'dim', q: 'dim', label: 'Diminué' },
  { iv: [0, 4, 8], sym: 'aug', q: 'aug', label: 'Augmenté' },
  { iv: [0, 2, 7], sym: 'sus2', q: 'sus', label: 'Sus2' },
  { iv: [0, 5, 7], sym: 'sus4', q: 'sus', label: 'Sus4' },
  { iv: [0, 4, 7, 11], sym: 'maj7', q: 'maj', label: 'Majeur 7' },
  { iv: [0, 3, 7, 10], sym: 'm7', q: 'min', label: 'Mineur 7' },
  { iv: [0, 4, 7, 10], sym: '7', q: 'dom', label: 'Septième de dominante' },
  { iv: [0, 3, 6, 10], sym: 'm7b5', q: 'dim', label: 'Demi-diminué' },
  { iv: [0, 3, 6, 9], sym: 'dim7', q: 'dim', label: 'Diminué 7' },
  { iv: [0, 3, 7, 11], sym: 'mMaj7', q: 'min', label: 'Mineur majeur 7' },
  { iv: [0, 4, 8, 11], sym: 'maj7#5', q: 'aug', label: 'Maj7 #5' },
  { iv: [0, 2, 4, 7], sym: 'add9', q: 'maj', label: 'Add9' },
  { iv: [0, 2, 3, 7], sym: 'madd9', q: 'min', label: 'Mineur add9' },
  { iv: [0, 2, 4, 7, 11], sym: 'maj9', q: 'maj', label: 'Majeur 9' },
  { iv: [0, 2, 3, 7, 10], sym: 'm9', q: 'min', label: 'Mineur 9' },
  { iv: [0, 2, 4, 7, 10], sym: '9', q: 'dom', label: 'Neuvième' },
  { iv: [0, 1, 3, 7, 10], sym: 'm7b9', q: 'min', label: 'Mineur 7 b9' },
  { iv: [0, 2, 3, 6, 10], sym: 'm9b5', q: 'dim', label: 'Mineur 9 b5' },
  { iv: [0, 2, 4, 6, 11], sym: 'maj9#11', q: 'maj', label: 'Maj9 #11' },
  { iv: [0, 1, 4, 7, 10], sym: '7b9', q: 'dom', label: '7 b9' },
  { iv: [0, 2, 3, 7, 11], sym: 'mMaj9', q: 'min', label: 'Mineur maj9' },
  { iv: [0, 2, 4, 8, 11], sym: 'maj9#5', q: 'aug', label: 'Maj9 #5' },
  { iv: [0, 1, 3, 6, 10], sym: 'm7b5b9', q: 'dim', label: 'Demi-dim b9' },
];

const sameSet = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Identifie un accord depuis ses intervalles depuis la fondamentale. */
export function qualityFromIntervals(intervals) {
  const set = [...new Set(intervals.map((i) => mod(i, 12)))].sort((a, b) => a - b);
  return CHORD_TABLE.find((c) => sameSet(c.iv, set)) || null;
}

/**
 * Construit l'accord d'un degré d'une gamme heptatonique en empilant des tierces.
 * @returns {{rootPc:number, pcs:number[], intervals:number[], quality:object|null}}
 */
export function degreeChord(rootPc, scaleId, degree, size = 3) {
  const steps = SCALES[scaleId].steps;
  if (steps.length !== 7) throw new Error('Gamme heptatonique requise');
  const n = steps.length;
  const notes = [];
  for (let k = 0; k < size; k++) {
    const idx = degree + 2 * k;
    const oct = Math.floor(idx / n);
    notes.push(steps[idx % n] + 12 * oct);
  }
  const base = notes[0];
  const intervals = notes.map((x) => x - base);
  return {
    rootPc: mod(rootPc + base, 12),
    pcs: notes.map((x) => mod(rootPc + x, 12)),
    intervals,
    quality: qualityFromIntervals(intervals),
  };
}

const ROMAN = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];

/** Chiffrage romain relatif à la tonique (minuscule si mineur/diminué). */
const DEGREE_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function romanFor(tonicPc, chordRootPc, quality, scaleId = null) {
  // Dans la gamme : numéro de degré sans altération (i–VI–III–VII en mineur) ; hors gamme : altérations chromatiques.
  const steps = scaleId && SCALES[scaleId]?.steps.length === 7 ? SCALES[scaleId].steps : null;
  const deg = steps ? steps.indexOf(mod(chordRootPc - tonicPc, 12)) : -1;
  let r = deg >= 0 ? DEGREE_ROMAN[deg] : ROMAN[mod(chordRootPc - tonicPc, 12)];
  const lower = quality && (quality.q === 'min' || quality.q === 'dim');
  if (lower) r = r.replace(/[IV]+/, (s) => s.toLowerCase());
  let suffix = '';
  if (quality) {
    if (quality.q === 'dim') suffix = quality.sym.includes('7b5') ? 'ø' : '°';
    else if (quality.q === 'aug') suffix = '+';
    if (quality.sym.includes('maj7') || quality.sym.includes('maj9')) suffix += 'Δ';
    else if (/(^|[^j])7|9/.test(quality.sym) && !quality.sym.includes('add')) suffix += quality.sym.includes('9') ? '9' : '7';
    if (quality.q === 'sus') suffix += quality.sym;
  }
  return r + suffix;
}

export function chordSymbol(rootPc, quality) {
  return pcName(rootPc) + (quality ? quality.sym : '?');
}

/**
 * Accord d'un « slot » de progression.
 * slot = { deg: 0..6, mode?: scaleId (emprunt modal) }
 */
export function slotChord(tonicPc, scaleId, slot, size = 3) {
  const mode = slot.mode && SCALES[slot.mode]?.steps.length === 7 ? slot.mode : scaleId;
  const c = degreeChord(tonicPc, mode, slot.deg, size);
  return {
    ...c,
    symbol: chordSymbol(c.rootPc, c.quality),
    roman: romanFor(tonicPc, c.rootPc, c.quality, scaleId),
    borrowed: mode !== scaleId,
  };
}

/** Accords empruntés au mode parallèle utiles (échange modal). */
export function borrowOptions(scaleId) {
  const bright = ['major', 'lydian', 'mixolydian'].includes(scaleId);
  return bright ? ['minor', 'dorian', 'phrygian'] : ['major', 'harmonicMinor', 'dorian'];
}

/** Voicing serré autour d'un centre. */
export function closeVoicing(pcs, center = 60) {
  const root = pcs[0];
  let base = center - 6 + mod(root - (center - 6), 12);
  const out = [base];
  for (let i = 1; i < pcs.length; i++) {
    let n = out[out.length - 1] + 1;
    while (mod(n, 12) !== pcs[i]) n++;
    out.push(n);
  }
  return out;
}

/** Toutes les inversions/octaves raisonnables d'un ensemble de classes de hauteur. */
function candidateVoicings(pcs, low = 48, high = 79) {
  const res = [];
  const n = pcs.length;
  for (let inv = 0; inv < n; inv++) {
    const order = pcs.slice(inv).concat(pcs.slice(0, inv));
    for (let start = low; start < low + 12; start++) {
      if (mod(start, 12) !== order[0]) continue;
      for (let oct = 0; oct < 3; oct++) {
        const v = [start + 12 * oct];
        for (let i = 1; i < n; i++) {
          let x = v[i - 1] + 1;
          while (mod(x, 12) !== order[i]) x++;
          v.push(x);
        }
        if (v[n - 1] <= high) res.push(v);
      }
    }
  }
  return res;
}

/**
 * Voice leading : choisit la voicing qui bouge le moins depuis l'accord précédent.
 * C'est exactement ce que font les claviéristes (et l'outil "Connect" de Live 12 côté mélodie).
 */
export function voiceLead(prev, pcs, center = 62) {
  const cands = candidateVoicings(pcs);
  if (!prev || !prev.length) {
    return cands.reduce((best, v) => {
      const d = Math.abs(avg(v) - center);
      return d < best.d ? { v, d } : best;
    }, { v: closeVoicing(pcs, center), d: Infinity }).v;
  }
  let best = null;
  for (const v of cands) {
    const cost = movement(prev, v) + Math.abs(avg(v) - center) * 0.3;
    if (!best || cost < best.cost) best = { v, cost };
  }
  return best.v;
}

const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;

function movement(a, b) {
  const A = [...a].sort((x, y) => x - y);
  const B = [...b].sort((x, y) => x - y);
  let s = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    s += Math.abs((A[Math.min(i, A.length - 1)]) - (B[Math.min(i, B.length - 1)]));
  }
  return s;
}

/** Voicing écarté (fondamentale grave + accord ouvert), son « pad » cinématique. */
export function spreadVoicing(pcs, center = 60) {
  const close = closeVoicing(pcs, center);
  return close.map((n, i) => (i === 0 ? n - 12 : i % 2 === 0 ? n + 12 : n));
}

/** Reconnaît un accord joué (notes MIDI). Essaie chaque note comme fondamentale. */
export function detectChord(midiNotes) {
  if (!midiNotes || midiNotes.length < 2) return null;
  const pcsSet = [...new Set(midiNotes.map((m) => mod(m, 12)))];
  const bass = mod(Math.min(...midiNotes), 12);
  let found = null;
  for (const root of [bass, ...pcsSet.filter((p) => p !== bass)]) {
    const q = qualityFromIntervals(pcsSet.map((p) => p - root));
    if (q) { found = { rootPc: root, quality: q }; break; }
  }
  if (!found) return null;
  let symbol = chordSymbol(found.rootPc, found.quality);
  if (found.rootPc !== bass) symbol += '/' + pcName(bass);
  return { ...found, symbol };
}

export const INTERVALS = [
  { st: 1, name: 'Seconde mineure', short: '2m', hint: 'Les Dents de la mer' },
  { st: 2, name: 'Seconde majeure', short: '2M', hint: 'Joyeux anniversaire (début)' },
  { st: 3, name: 'Tierce mineure', short: '3m', hint: 'Smoke on the Water / triste' },
  { st: 4, name: 'Tierce majeure', short: '3M', hint: 'Oh When the Saints / lumineux' },
  { st: 5, name: 'Quarte juste', short: '4J', hint: 'La Marseillaise (Al-lons)' },
  { st: 6, name: 'Triton', short: 'TT', hint: 'Les Simpson / instable' },
  { st: 7, name: 'Quinte juste', short: '5J', hint: 'Star Wars (thème)' },
  { st: 8, name: 'Sixte mineure', short: '6m', hint: 'Love Story / dramatique' },
  { st: 9, name: 'Sixte majeure', short: '6M', hint: 'My Way / NBC' },
  { st: 10, name: 'Septième mineure', short: '7m', hint: 'Star Trek (série originale)' },
  { st: 11, name: 'Septième majeure', short: '7M', hint: 'Take On Me (refrain)' },
  { st: 12, name: 'Octave', short: '8', hint: 'Somewhere Over the Rainbow' },
];
