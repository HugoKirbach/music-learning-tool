// « Nuit au club » : jeu mobile façon WarioWare. Tu es DJ, chaque mini-jeu dure quelques secondes, la salle s'échauffe
// (le tempo monte) et tu apprends sans t'en rendre compte : hauteur, majeur/mineur, pulsation, backbeat, styles, mémoire
// mélodique, noms des notes, tempo, phrases de 8 temps. Module pur : génération déterministe des manches, notation.
// Mode « sans le son » : 5 mini-jeux purement visuels (grille de 16 pas, accords au clavier, calcul de producteur, structure
// d'un morceau, réglages de synthé) pour continuer à apprendre là où le son est impossible. Progression à part (clé '@silent').
import { rng, pick } from './daily.js';

export const GAMES = {
  pitch: {
    emoji: '⬆️', title: 'Plus aigu ?', skill: 'oreille', concept: 'La hauteur des notes', time: 6,
    lesson: 'Entendre quelle note est la plus aiguë, c’est la première étape pour retrouver une mélodie à l’oreille. Plus l’écart est petit, plus c’est fin.',
    lab: { href: '#/ear?mode=intervals', name: 'Quiz d’intervalles' },
  },
  mood: {
    emoji: '😊', title: 'Joyeux ou triste ?', skill: 'harmonie', concept: 'Accord majeur / mineur', time: 6,
    lesson: 'Majeur = lumineux, mineur = sombre. Une seule note change, celle du milieu (la tierce), d’un demi-ton.',
    lab: { href: '#/ear?mode=chords', name: 'Quiz d’accords' },
  },
  beat: {
    emoji: '👆', title: 'Tape sur le temps', skill: 'rythme', concept: 'La pulsation', time: 7,
    lesson: 'La pulsation, c’est le battement régulier que tout le club suit. En house et en techno, le kick la marque à chaque temps.',
    lab: { href: '#/rush', name: 'Piano Rush' },
  },
  hole: {
    emoji: '🕳️', title: 'Il manque un coup !', skill: 'rythme', concept: 'Backbeat et four-on-the-floor', time: 8,
    lesson: 'Le clap (ou la snare) tombe sur les temps 2 et 4 : c’est le backbeat. Le kick, lui, frappe les 4 temps en house (« four on the floor »).',
    lab: { href: '#/beat', name: 'Lab Beat' },
  },
  genre: {
    emoji: '🌍', title: 'Quel style ?', skill: 'oreille', concept: 'Reconnaître un style', time: 8,
    lesson: 'Chaque style a son tempo et sa batterie : kick à chaque temps en house, hi-hats rapides en trap, breakbeat rapide en drum & bass.',
    lab: { href: '#/atlas', name: 'Atlas des styles' },
  },
  simon: {
    emoji: '🔁', title: 'Répète la mélodie', skill: 'melodie', concept: 'La mémoire mélodique', time: 9,
    lesson: 'Retenir une phrase de 3 à 6 notes, c’est ce qui permet de rejouer un hook entendu, au clavier ou sur les pads.',
    lab: { href: '#/callresponse', name: 'Call & Response' },
  },
  note: {
    emoji: '🎹', title: 'Quelle note ?', skill: 'melodie', concept: 'Le nom des notes', time: 6,
    lesson: 'Touches blanches : Do Ré Mi Fa Sol La Si (C D E F G A B). Le Do est juste à gauche du groupe de 2 touches noires.',
    lab: { href: '#/rush', name: 'Piano Rush' },
  },
  tempo: {
    emoji: '⏩', title: 'Le plus rapide ?', skill: 'rythme', concept: 'Le tempo (BPM)', time: 9,
    lesson: 'Comparer deux tempos, c’est la base du beatmatching des DJ (caler deux morceaux ensemble). Plus l’écart est petit, plus il faut d’oreille.',
    lab: { href: '#/atlas', name: 'Atlas des styles (tempos)' },
  },
  swing: {
    emoji: '🌀', title: 'Droit ou swing ?', skill: 'rythme', concept: 'Le swing', time: 8,
    lesson: 'Le swing retarde une croche sur deux : « long-court » au lieu de « égal ». C’est le groove du hip-hop, du jazz et de la deep house (Groove Pool dans Live, Swing sur le MPC).',
    lab: { href: '#/beat', name: 'Lab Beat (swing)' },
  },
  count: {
    emoji: '🔢', title: 'Combien de notes ?', skill: 'oreille', concept: 'Compter un motif rapide', time: 7,
    lesson: 'Compter les notes d’un motif rapide, c’est la première étape pour recopier un riff entendu dans un morceau.',
    lab: { href: '#/melody?mode=dictation', name: 'Dictée mélodique' },
  },
  filter: {
    emoji: '🎛️', title: 'Filtre ouvert ou fermé ?', skill: 'sound', concept: 'Le filtre passe-bas', time: 7,
    lesson: 'Un filtre passe-bas enlève les aigus : fermé, le son est sourd ; ouvert, il est brillant. C’est le Cutoff de Serum, qu’on ouvre petit à petit pendant un build.',
    lab: { href: '#/synth', name: 'Lab Synthé' },
  },
  contour: {
    emoji: '📈', title: 'Ça monte ou ça descend ?', skill: 'melodie', concept: 'Le contour d’une mélodie', time: 7,
    lesson: 'La forme d’une mélodie (elle monte, descend, fait une vague) est ce qu’on retient en premier. Une ligne qui monte crée de la tension, une ligne qui descend apaise.',
    lab: { href: '#/melody', name: 'Lab Mélodie' },
  },
  drop: {
    emoji: '💥', title: 'Tape sur le drop', skill: 'autonomie', concept: 'Les phrases de 8 temps', time: 10,
    lesson: 'La musique électronique avance par blocs de 4, 8 ou 16 temps : le drop tombe toujours sur le « 1 » du bloc suivant. Compter, c’est savoir où placer ses transitions.',
    lab: { href: '#/arrange', name: 'Lab Arrangement' },
  },
  // Sans le son : tout se lit et se touche à l'écran
  grid: {
    emoji: '🧩', title: 'Grid Puzzle', skill: 'rythme', concept: 'Lire une grille de 16 pas', time: 9, silent: true,
    lesson: '16 cases = 1 mesure (4 temps × 4 doubles croches), comme le step sequencer du MPC ou une boucle d’une mesure dans Live. Chaque style a ses places fixes : kick sur chaque temps en house, clap sur 2 et 4, hats entre les kicks.',
    lab: { href: '#/beat', name: 'Lab Beat' },
  },
  chordx: {
    emoji: '🎹', title: 'Accord Express', skill: 'harmonie', concept: 'Construire un accord', time: 10, silent: true,
    lesson: 'Majeur = fondamentale + 4 demi-tons + 3 ; mineur = + 3 puis + 4 ; une 7e ajoute une note en haut. Sur le MPC Key 37 ou dans le Piano Roll de Live, compte les demi-tons touche par touche, noires comprises.',
    lab: { href: '#/chords', name: 'Lab Accords' },
  },
  calc: {
    emoji: '🔢', title: 'Calcul de producteur', skill: 'autonomie', concept: 'Les maths du studio', time: 12, silent: true,
    lesson: 'Une noire dure 60 000 ÷ BPM ms (500 ms à 120 BPM), une mesure 4 fois plus : de quoi régler un delay ou un LFO sans calculatrice. Le relatif mineur est 3 demi-tons sous la tonique (Do → La), une quinte vaut 7 demi-tons.',
    lab: { href: '#/chords', name: 'Lab Accords (tonalités)' },
  },
  archi: {
    emoji: '🧱', title: 'L’Architecte', skill: 'autonomie', concept: 'La structure d’un morceau', time: 12, silent: true,
    lesson: 'Un morceau de club avance par blocs de 8, 16 ou 32 mesures : l’intro pour les DJ, le groove qui installe le beat, la montée juste avant le drop, le break entre deux drops pour respirer. Dans la vue Arrangement de Live, pose un repère (Locator) au début de chaque partie.',
    lab: { href: '#/arrange', name: 'Lab Arrangement' },
  },
  reglage: {
    emoji: '🎛️', title: 'Le Bon Réglage', skill: 'sound', concept: 'Lire un réglage de son', time: 9, silent: true,
    lesson: 'Serum 2 et EQ Eight dessinent le son : enveloppe ADSR (attaque nette et sustain à 0 = pluck, attaque lente = pad), forme d’onde, courbe de filtre, spectre. Savoir les lire, c’est régler à l’œil avant même d’écouter.',
    lab: { href: '#/synth', name: 'Lab Synthé' },
  },
};
/** Mini-jeux à l'oreille (mode normal) et mini-jeux muets (mode « sans le son »). */
export const SOUND_GAMES = Object.keys(GAMES).filter((id) => !GAMES[id].silent);
export const SILENT_GAMES = Object.keys(GAMES).filter((id) => GAMES[id].silent);

export const VENUES = [
  { id: 'bar', emoji: '🍺', name: 'Le bar du coin', need: 0, bpm: 100, length: 10, diff: 0, games: ['pitch', 'mood', 'beat', 'note', 'contour'], genres: ['house', 'lofi', 'trap'] },
  { id: 'warehouse', emoji: '🏭', name: 'La warehouse', need: 2, bpm: 116, length: 12, diff: 0.5, games: ['pitch', 'mood', 'beat', 'hole', 'genre', 'note', 'count'], genres: ['house', 'techno', 'trap', 'lofi'] },
  { id: 'beach', emoji: '🏖️', name: 'Le beach club', need: 5, bpm: 112, length: 14, diff: 1, games: ['pitch', 'mood', 'hole', 'genre', 'simon', 'note', 'tempo', 'contour', 'swing'], genres: ['deephouse', 'afrohouse', 'reggaeton', 'disco', 'house'] },
  { id: 'rooftop', emoji: '🌇', name: 'Le rooftop', need: 7, bpm: 120, length: 14, diff: 1.2, games: ['mood', 'hole', 'simon', 'note', 'tempo', 'swing', 'count', 'filter', 'contour'], genres: ['deephouse', 'lofi', 'ukg', 'disco', 'funk'] },
  { id: 'festival', emoji: '🎪', name: 'Le festival', need: 8, bpm: 126, length: 16, diff: 1.5, games: SOUND_GAMES, genres: ['house', 'techno', 'trap', 'dnb', 'dubstep', 'trance', 'ukg', 'hardtrance', 'hardhouse'] },
  { id: 'tokyo', emoji: '🏮', name: 'Club underground à Tokyo', need: 10, bpm: 128, length: 16, diff: 1.8, games: SOUND_GAMES, genres: ['techno', 'jersey', 'trap', 'dnb', 'synthwave', 'acid'] },
  { id: 'berlin', emoji: '🌌', name: 'Résidence à Berlin', need: 11, bpm: 132, length: 18, diff: 2.2, games: SOUND_GAMES, genres: ['techno', 'acid', 'house', 'deephouse', 'dnb', 'jungle', 'ukg', 'afrohouse', 'hardhouse'] },
  { id: 'ibiza', emoji: '🏝️', name: 'Closing à Ibiza', need: 14, bpm: 124, length: 18, diff: 2.5, games: SOUND_GAMES, genres: ['house', 'deephouse', 'afrohouse', 'trance', 'disco', 'techno'] },
  { id: 'space', emoji: '🛸', name: 'Rave orbitale', need: 18, bpm: 140, length: 20, diff: 3, games: SOUND_GAMES, genres: ['dnb', 'jungle', 'dubstep', 'trance', 'acid', 'techno', 'trap', 'synthwave', 'ukg', 'jersey', 'hardtrance', 'hardhouse'] },
];
export const venueById = (id) => VENUES.find((v) => v.id === id);
export const MAX_STARS = VENUES.length * 3;
/** Meilleure nuit d'une salle dans club.best : 'bar' avec le son, 'bar@silent' sans le son. */
export const starKey = (id, silent = false) => (silent ? `${id}@silent` : id);

/** Set du jour : le même pour tout le monde, tous les mini-jeux, difficulté moyenne. */
export function dailyVenue(day) {
  const r = rng('club-day' + day);
  const genres = ['house', 'techno', 'trap', 'dnb', 'lofi', 'deephouse', 'afrohouse', 'reggaeton', 'disco', 'ukg', 'trance', 'dubstep', 'hardtrance', 'hardhouse'];
  const pool = [...genres].sort(() => r() - 0.5).slice(0, 5);
  return { id: 'daily', emoji: '📅', name: 'Le set du jour', need: 0, bpm: 110 + Math.floor(r() * 4) * 5, length: 12, diff: 1, games: SOUND_GAMES, genres: pool, seed: day };
}

const NOTE_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTE_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteNameFr = (m) => NOTE_FR[((m % 12) + 12) % 12];
export const noteNameEn = (m) => NOTE_EN[((m % 12) + 12) % 12];
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const shuffle = (r, a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const step = (d, arr) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(d)))];

/** Générateurs de manches. d = difficulté (0 → 3+), bpm = tempo de la salle à ce moment de la nuit. */
export const MAKERS = {
  pitch(r, d) {
    const gap = pick(r, step(d * 1.4, [[7, 12], [4, 5, 7], [2, 3, 4], [1, 2, 3], [1, 2]]));
    const lo = 55 + Math.floor(r() * 14);
    const notes = r() < 0.5 ? [lo, lo + gap] : [lo + gap, lo];
    return { notes, answer: notes[0] > notes[1] ? 0 : 1, options: ['1ʳᵉ note', '2ᵉ note'], gap };
  },
  mood(r, d) {
    const root = 50 + Math.floor(r() * 12);
    const sev = d >= 1.5 && r() < 0.5;
    const happy = r() < 0.5;
    const iv = sev ? (happy ? [0, 4, 7, 11] : [0, 3, 7, 10]) : (happy ? [0, 4, 7] : [0, 3, 7]);
    return { notes: iv.map((x) => root + x), answer: happy ? 0 : 1, options: ['😊 Joyeux', '😢 Triste'], label: sev ? (happy ? 'maj7' : 'm7') : (happy ? 'majeur' : 'mineur') };
  },
  beat(r, d, bpm) {
    return { bpm, count: 4, taps: 4, tol: step(d, [130, 110, 95, 80]), need: 3 };
  },
  hole(r, d, bpm) {
    const what = d >= 1 && r() < 0.4 ? 'kick' : 'clap';
    const missing = what === 'clap' ? pick(r, [1, 3]) : Math.floor(r() * 4);
    return { bpm, what, missing, answer: missing, options: ['1', '2', '3', '4'] };
  },
  genre(r, d, bpm, venue) {
    const pool = venue.genres.length >= 3 ? venue.genres : ['house', 'trap', 'dnb'];
    const opts = shuffle(r, pool).slice(0, d >= 2 ? 4 : 3);
    const answer = Math.floor(r() * opts.length);
    return { genres: opts, answer };
  },
  simon(r, d) {
    const pads = [60, 62, 64, 67];
    const len = Math.min(6, 3 + Math.floor(d));
    const seq = [];
    for (let i = 0; i < len; i++) { let p; do p = Math.floor(r() * 4); while (i && p === seq[i - 1] && r() < 0.7); seq.push(p); }
    return { pads, seq, answer: seq };
  },
  note(r, d) {
    const sharps = d >= 2;
    const pcs = sharps ? [...Array(12).keys()] : WHITE;
    const pc = pick(r, pcs);
    const midi = 60 + pc;
    const wrong = shuffle(r, pcs.filter((x) => x !== pc)).slice(0, 2);
    const opts = shuffle(r, [pc, ...wrong]);
    return { midi, answer: opts.indexOf(pc), options: opts.map((x) => `${NOTE_FR[x]} (${NOTE_EN[x]})`) };
  },
  tempo(r, d) {
    const gap = step(d, [24, 16, 10, 6]);
    const base = 88 + Math.floor(r() * 40);
    const bpms = r() < 0.5 ? [base, base + gap] : [base + gap, base];
    return { bpms, answer: bpms[0] > bpms[1] ? 0 : 1, options: ['1ᵉʳ', '2ᵉ'], gap };
  },
  swing(r, d, bpm) {
    const swung = r() < 0.5;
    return { bpm: Math.min(110, bpm), amount: swung ? step(d, [0.66, 0.58, 0.5, 0.45]) : 0, answer: swung ? 1 : 0, options: ['📏 Droit', '🌀 Swing'] };
  },
  count(r, d) {
    const max = d >= 2 ? 6 : 5;
    const n = 2 + Math.floor(r() * (max - 1));
    const opts = d >= 2 ? [3, 4, 5, 6] : [2, 3, 4, 5];
    const k = Math.max(opts[0], Math.min(opts.at(-1), n));
    const base = 60 + Math.floor(r() * 7);
    const notes = Array.from({ length: k }, () => base + pick(r, [0, 2, 4, 5, 7]));
    return { notes, gap: step(d, [0.22, 0.18, 0.15, 0.12]), answer: opts.indexOf(k), options: opts.map(String) };
  },
  filter(r, d) {
    const open = r() < 0.5;
    const [lo, hi] = step(d, [[350, 7000], [600, 4500], [900, 3000], [1200, 2400]]);
    return { midi: 45 + Math.floor(r() * 8), cutoff: open ? hi : lo, answer: open ? 0 : 1, options: ['✨ Ouvert (brillant)', '🌫️ Fermé (sourd)'] };
  },
  contour(r, d) {
    const kinds = d >= 1 ? ['up', 'down', 'wave'] : ['up', 'down'];
    const kind = pick(r, kinds);
    const steps = shuffle(r, [2, 2, 1, 3]).slice(0, 3);
    const start = kind === 'down' ? 67 : 57 + Math.floor(r() * 4);
    const notes = [start];
    steps.forEach((x, i) => notes.push(notes[i] + (kind === 'up' ? x : kind === 'down' ? -x : i < 2 ? x + 1 : -(x + 2))));
    const labels = { up: '↗️ Ça monte', down: '↘️ Ça descend', wave: '〰️ Monte puis descend' };
    return { notes, answer: kinds.indexOf(kind), options: kinds.map((k) => labels[k]), kind };
  },
  drop(r, d, bpm) {
    const beats = d >= 2 ? 16 : 8;
    return { bpm, beats, showUntil: d >= 1 ? beats / 2 : beats, tol: step(d, [170, 140, 120, 100]) };
  },

  // ---------- Sans le son ----------
  grid(r, d) {
    const g = pick(r, GROOVES.filter((x) => x.d <= d));
    const rows = g.rows.slice(0, d < 0.5 ? 2 : 3);
    // Débutant : l'erreur est sur un temps (ou un coup qui manque) ; ensuite sur les croches, puis n'importe où
    const fair = (i, ref) => d >= 2 || i % 4 === 0 || (d >= 1 && i % 2 === 0) || ref[i] === 'x';
    const cand = [];
    rows.forEach(([, ref, errs], k) => { if (errs) for (let i = 0; i < 16; i++) if ((errs === '*' || errs.includes(i)) && fair(i, ref)) cand.push([k, i]); });
    const [row, at] = pick(r, cand);
    const added = rows[row][1][at] === '.';
    const flip = (ref) => ref.slice(0, at) + (added ? 'x' : '.') + ref.slice(at + 1);
    const rule = rows.map((x) => x[3]).join(', ');
    return {
      style: g.id, name: g.name, rule: `${rule[0].toUpperCase()}${rule.slice(1)}.`, showRule: d < 1.5, tell: d < 1, added, row, step: at, answer: row * 16 + at,
      rows: rows.map(([label, ref], k) => ({ label, ref, cells: k === row ? flip(ref) : ref })),
      why: `${added ? 'Coup en trop' : 'Coup manquant'} : ${rows[row][0]}, ${stepName(at)}`,
    };
  },
  chordx(r, d) {
    const c = chordInfo(pick(r, step(d, [CHORD_POOL[0], [...CHORD_POOL[0], ...CHORD_POOL[1]], [...CHORD_POOL[1], ...CHORD_POOL[2]], CHORD_POOL[2]])));
    const why = `${c.sym} = ${c.pcs.map((p) => KEY_FR[p]).join(' · ')}`;
    if (d >= 1.5 && r() < 0.45) {
      // Sens inverse : les touches sont allumées, à toi de nommer l'accord (distracteurs qui partagent des notes)
      const same = (x) => x.pcs.length === c.pcs.length && x.pcs.every((p) => c.pcs.includes(p));
      const shared = (x) => x.pcs.filter((p) => c.pcs.includes(p)).length;
      const others = shuffle(r, CHORD_POOL.flat().map(chordInfo).filter((x) => !same(x))).sort((a, b) => shared(b) - shared(a));
      const opts = shuffle(r, [c, ...others.slice(0, d >= 2.5 ? 3 : 2)]);
      return { mode: 'name', chord: c.sym, pcs: c.pcs, notes: c.pcs.map((p) => 60 + p).sort((a, b) => a - b), root: d < 2 ? c.root : null, answer: opts.indexOf(c), options: opts.map((x) => x.sym), why };
    }
    return { mode: 'build', chord: c.sym, fr: d < 1 ? c.fr : null, pcs: c.pcs, size: c.pcs.length, labels: d < 1.5, why };
  },
  calc(r, d) {
    const kind = pick(r, ['bar1', 'fifth', 'relmin', 'semis', ...(d >= 1 ? ['bar4', 'bars30', 'ms4', 'ms8', 'fourth', 'sig'] : []), ...(d >= 2 ? ['ms8d', 'ms16', 'relmaj'] : [])]);
    const n = d >= 1 ? 4 : 3;
    const keys = step(d, [[0, 7, 5], [0, 7, 5, 2, 9, 10], [0, 7, 5, 2, 9, 10, 4, 3, 8]]);
    const q = ({ good, wrong, ...o }) => ({ kind, ...o, ...qcm(r, good, wrong, n) });
    if (kind === 'bar1' || kind === 'bar4') {
      const bars = kind === 'bar1' ? 1 : 4;
      const bpm = pick(r, d < 1 ? [60, 80, 120] : [96, 100, 120, 128, 140, 150, 160]);
      const v = (240 * bars) / bpm;
      return q({ bpm, value: Math.round(v * 10) / 10, text: `À ${bpm} BPM, combien ${bars > 1 ? 'durent 4 mesures' : 'dure 1 mesure (4 temps)'} ?`, why: `${bars * 4} temps × 60 ÷ ${bpm} = ${secs(v)}`, good: secs(v), wrong: shuffle(r, [v * 2, v / 2, v * 1.5, v * 0.75]).map(secs) });
    }
    if (kind === 'bars30') {
      const bpm = pick(r, [96, 120, 128, 136, 144, 160, 176]);
      const v = bpm / 8;
      return q({ bpm, value: v, text: `À ${bpm} BPM, combien de mesures tiennent dans 30 secondes ?`, why: `1 mesure = ${secs(240 / bpm)}, donc 30 s ≈ ${v} mesures`, good: String(v), wrong: shuffle(r, [v * 2, Math.round(v / 2), v + 4, v - 4, v + 2]).map(String) });
    }
    if (kind.startsWith('ms')) {
      const bpm = pick(r, [100, 120, 125, 128, 140, 150, 160, 174]);
      const [k, label, txt] = DIVS[kind];
      const v = Math.round(k / bpm);
      return q({ bpm, value: v, text: `Delay ${label} à ${bpm} BPM : combien de millisecondes ?`, why: `${txt} ÷ ${bpm} = ${v} ms`, good: `${v} ms`, wrong: shuffle(r, Object.values(DIVS).map(([x]) => x).concat(120000, 40000).filter((x) => x !== k)).map((x) => `${Math.round(x / bpm)} ms`) });
    }
    if (kind === 'fifth' || kind === 'fourth') {
      const iv = kind === 'fifth' ? 7 : 5;
      const root = pick(r, WHITE.filter((p) => d >= 2 || WHITE.includes((p + iv) % 12)));
      const v = (root + iv) % 12;
      return q({ root, value: v, text: `Quelle est la ${kind === 'fifth' ? 'quinte' : 'quarte'} de ${keyName(root)} ?`, why: `${KEY_FR[root]} + ${iv} demi-tons = ${KEY_FR[v]}`, good: keyName(v), wrong: [12 - iv, ...shuffle(r, [4, 9, 2, 3])].map((x) => keyName((root + x) % 12)) });
    }
    if (kind === 'relmin') {
      const k = pick(r, keys);
      const v = (k + 9) % 12;
      return q({ root: k, value: v, text: `Quel est le relatif mineur de ${KEY_FR[k]} majeur (${KEY_EN[k]}) ?`, why: `3 demi-tons sous ${KEY_FR[k]} : ${KEY_FR[v]} mineur (mêmes notes)`, good: minorName(v), wrong: [k, ...shuffle(r, [2, 4, 5])].map((x) => minorName((k + x) % 12)) });
    }
    if (kind === 'relmaj') {
      const m = (pick(r, keys) + 9) % 12;
      const v = (m + 3) % 12;
      return q({ root: m, value: v, text: `Quel est le relatif majeur de ${KEY_FR[m]} mineur (${KEY_EN[m]}m) ?`, why: `3 demi-tons au-dessus de ${KEY_FR[m]} : ${KEY_FR[v]} majeur (mêmes notes)`, good: majorName(v), wrong: [m, ...shuffle(r, [5, 8, 10])].map((x) => majorName((m + x) % 12)) });
    }
    if (kind === 'sig') {
      const k = pick(r, keys);
      const v = SIG[k];
      return q({ root: k, value: v, text: `Combien d’altérations à la clé en ${KEY_FR[k]} majeur (${KEY_EN[k]}) ?`, why: `${KEY_FR[k]} majeur : ${v > 0 ? SHARPS.slice(0, v).join(', ') : v < 0 ? FLATS.slice(0, -v).join(', ') : 'aucune altération'}`, good: sigName(v), wrong: shuffle(r, [-v, v + 1, v - 1, v + Math.sign(v || 1) * 2]).map(sigName) });
    }
    const [name, v] = pick(r, INTERVALS.filter((x) => x[2] <= d));
    return q({ value: v, text: `Combien de demi-tons dans ${name} ?`, why: `${name[0].toUpperCase()}${name.slice(1)} = ${v} demi-tons`, good: String(v), wrong: shuffle(r, [v - 1, v + 1, v - 2, v + 2]).concat(v - 3, v + 3).filter((x) => x > 0 && x <= 12).map(String) });
  },
  archi(r, d) {
    if (d >= 1 && r() < 0.35) {
      // Variante : la courbe d'énergie d'un morceau, 4 zones A-D, trouver une partie
      const ask = d >= 2 ? pick(r, ['drop', 'break', 'build']) : 'drop';
      const wins = [];
      for (const s of STRUCTURES) {
        if (s.id === 'trap') continue;
        for (const f of s.forms) {
          const b = f ? blocksOf(f) : [];
          for (let i = 0; i + 4 <= b.length; i++) { const w = b.slice(i, i + 4); if (w.filter((x) => x.kind === ask).length === 1) wins.push([s, w]); }
        }
      }
      const [s, zones] = pick(r, wins);
      const answer = zones.findIndex((x) => x.kind === ask);
      return { mode: 'curve', style: s.name, ask, zones, answer, options: ['A', 'B', 'C', 'D'], why: `${ASK[ask][0].toUpperCase()}${ASK[ask].slice(1)}, c’était la zone ${'ABCD'[answer]} : ${ASK_WHY[ask]}` };
    }
    const n = d < 1 ? 4 : d < 2 ? 5 : 6;
    const [s, f] = pick(r, STRUCTURES.flatMap((x) => (x.d <= d && x.forms[n - 4] ? [[x, x.forms[n - 4]]] : [])));
    const sol = blocksOf(f);
    const names = (b) => b.map((x) => x.name).join('|');
    let blocks;
    do blocks = shuffle(r, sol); while (names(blocks) === names(sol));
    return { mode: 'order', style: s.name, tip: s.tip, showTip: d < 1.5, bars: d < 1.5, blocks, solution: sol.map((x) => x.name), why: sol.map((x) => x.name).join(' → ') };
  },
  reglage(r, d) {
    const kind = pick(r, d < 1 ? ['env', 'wave', 'filter'] : ['env', 'wave', 'filter', 'eq']);
    const between = ([a, b]) => Math.round(a + r() * (b - a));
    const choice = (table, ids, id, o) => { const opts = shuffle(r, ids); return { kind, id, ...o, why: table[id].why, answer: opts.indexOf(id), options: opts.map((x) => table[x].label) }; };
    if (kind === 'env') {
      const ids = d < 1 ? ['pluck', 'pad', 'bass'] : ['pluck', 'pad', 'bass', 'stab'];
      const id = pick(r, ids);
      const E = ENVS[id];
      return choice(ENVS, ids, id, { env: { a: between(E.a), d: between(E.d), s: between(E.s), r: between(E.r) }, values: d < 2, text: 'Cette enveloppe d’amplitude (ENV 1 dans Serum) donne plutôt…' });
    }
    if (kind === 'wave') {
      const ids = d < 1 ? ['sine', 'saw', 'square'] : ['sine', 'saw', 'square', 'triangle'];
      return choice(WAVES, ids, pick(r, ids), { cycles: d < 2 ? 2 : 1, text: 'Quelle forme d’onde dans l’oscillateur ?' });
    }
    if (kind === 'filter') {
      if (d >= 1 && r() < 0.4) {
        const open = r() < 0.5;
        return { kind, id: 'lp', ask: 'open', cutoff: open ? pick(r, [6000, 8000, 12000]) : pick(r, [200, 300, 450]), res: d >= 2 ? 0.6 : 0.2, text: 'Ce passe-bas (Cutoff de Serum) est plutôt…', why: open ? 'Cutoff tout en haut : presque tous les aigus passent, le son est brillant' : 'Cutoff tout en bas : les aigus sont coupés, le son est sourd', answer: open ? 0 : 1, options: ['✨ Ouvert (brillant)', '🌫️ Fermé (sourd)'] };
      }
      const ids = d < 2 ? ['lp', 'hp', 'bp'] : ['lp', 'hp', 'bp', 'notch'];
      return choice(FILTERS, ids, pick(r, ids), { ask: 'type', cutoff: pick(r, [500, 800, 1500, 2500]), res: d >= 1 ? 0.5 : 0.15, text: 'Quel type de filtre montre cette courbe ?' });
    }
    const ids = d < 2 ? ['low', 'mud', 'harsh'] : ['low', 'mud', 'harsh', 'air'];
    return choice(EQS, ids, pick(r, ids), { guide: d < 2, text: 'Le spectre (Spectrum de Live) montre un défaut. Quel coup d’EQ Eight ?' });
  },
};

// ---------- Données des mini-jeux sans le son ----------
const KEY_FR = ['Do', 'Do♯', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
const KEY_EN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const keyName = (pc) => `${KEY_FR[pc]} (${KEY_EN[pc]})`;
const minorName = (pc) => `${KEY_FR[pc]} mineur (${KEY_EN[pc]}m)`;
const majorName = (pc) => `${KEY_FR[pc]} majeur (${KEY_EN[pc]})`;
const secs = (x) => `${String(Math.round(x * 10) / 10).replace('.', ',')} s`;
const SIG = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 5: -1, 10: -2, 3: -3, 8: -4 }; // tonalité majeure → nombre de ♯ (+) ou de ♭ (−)
const SHARPS = ['Fa♯', 'Do♯', 'Sol♯', 'Ré♯'];
const FLATS = ['Si♭', 'Mi♭', 'La♭', 'Ré♭'];
const sigName = (n) => (n ? `${Math.abs(n)} ${n > 0 ? '♯' : '♭'}` : 'Aucune');
const DIVS = { ms4: [60000, 'à la noire (1/4)', '60 000'], ms8: [30000, 'à la croche (1/8)', '30 000'], ms8d: [45000, '1/8 pointé', '45 000'], ms16: [15000, 'à la double croche (1/16)', '15 000'] };
const INTERVALS = [['une tierce mineure', 3, 0], ['une tierce majeure', 4, 0], ['une quinte juste', 7, 0], ['une octave', 12, 0], ['une quarte juste', 5, 1], ['une seconde majeure', 2, 1], ['une septième mineure', 10, 1], ['une septième majeure', 11, 1], ['un triton', 6, 2], ['une sixte majeure', 9, 2], ['une sixte mineure', 8, 2]];

/** QCM : la bonne réponse + des distracteurs distincts (pris dans l'ordre), le tout mélangé. */
function qcm(r, good, wrong, n) {
  const opts = [good];
  for (const w of wrong) if (opts.length < n && !opts.includes(w)) opts.push(w);
  const out = shuffle(r, opts);
  return { options: out, answer: out.indexOf(good) };
}

/** Nom d'un pas de la grille (0-15). */
export const stepName = (i) => (i % 4 === 0 ? `temps ${i / 4 + 1}` : i % 4 === 2 ? `contretemps du ${(i - 2) / 4 + 1}` : `pas ${i + 1}`);

// Grooves de référence (16 pas = 1 mesure). Ligne : [nom, motif, cases où une erreur est sans ambiguïté
// ('*' toutes, tableau = seulement ces pas, null = ligne libre jamais fausse), règle de la ligne].
const BEATS = [0, 4, 8, 12];
export const GROOVES = [
  { id: 'house', name: '🏠 House', d: 0, rows: [['Kick', 'x...x...x...x...', '*', 'kick sur chaque temps'], ['Clap', '....x.......x...', '*', 'clap sur 2 et 4'], ['Hat', '..x...x...x...x.', '*', 'hat entre les kicks (contretemps)']] },
  { id: 'synthwave', name: '🌆 Synthwave', d: 0, rows: [['Kick', 'x.......x.......', '*', 'kick sur 1 et 3'], ['Snare', '....x.......x...', '*', 'snare sur 2 et 4 (backbeat)'], ['Hat', 'x.x.x.x.x.x.x.x.', '*', 'hats en croches régulières']] },
  { id: 'hardhouse', name: '🔨 Hard house', d: 1, rows: [['Kick', 'x...x...x...x...', '*', 'kick sur chaque temps'], ['Donk', '..x...x...x...x.', '*', 'donk (basse) sur chaque contretemps'], ['Clap', '....x.......x...', '*', 'clap sur 2 et 4']] },
  { id: 'trap', name: '🔥 Trap', d: 1, rows: [['Kick', 'x......x..x.....', null, 'kick libre'], ['Clap', '........x.......', '*', 'un seul clap, sur le temps 3 (half-time)'], ['Hat', 'xxxxxxxxxxxxxxxx', '*', 'hats en doubles croches continues']] },
  { id: 'dnb', name: '⚡ Drum & bass', d: 1.5, rows: [['Kick', 'x.........x.....', '*', 'kick sur le 1 et sur le contretemps du 3'], ['Snare', '....x.......x...', '*', 'snare sur 2 et 4'], ['Hat', 'x.x.x.x.x.x.x.x.', '*', 'hats en croches']] },
  { id: 'ukg', name: '🇬🇧 UK garage (2-step)', d: 2, rows: [['Kick', 'x.........x.....', '*', 'kick sur le 1 et sur le contretemps du 3 (jamais sur 2 et 4)'], ['Snare', '....x.......x...', '*', 'snare sur 2 et 4'], ['Hat', '..x...x...x...x.', '*', 'hats à contretemps']] },
  { id: 'reggaeton', name: '🇵🇷 Reggaeton (dembow)', d: 2, rows: [['Kick', 'x...x...x...x...', '*', 'kick sur chaque temps'], ['Snare', '...x..x....x..x.', BEATS, 'snare du dembow toujours entre les kicks, jamais avec eux'], ['Hat', 'x.x.x.x.x.x.x.x.', '*', 'hats en croches']] },
  { id: 'hardtrance', name: '🚀 Hard trance', d: 2.5, rows: [['Kick', 'x...x...x...x...', '*', 'kick sur chaque temps'], ['Basse', '.xxx.xxx.xxx.xxx', '*', 'basse roulante sur les 3 doubles croches entre les kicks (jamais avec le kick)'], ['Clap', '....x.......x...', '*', 'clap sur 2 et 4']] },
];

// Accords : intervalles depuis la fondamentale. Vocabulaire par palier de difficulté.
const ROOT_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ROOT_FR = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
const QUALITY = { '': [[0, 4, 7], 'majeur'], m: [[0, 3, 7], 'mineur'], 7: [[0, 4, 7, 10], '7'], maj7: [[0, 4, 7, 11], 'majeur 7'], m7: [[0, 3, 7, 10], 'mineur 7'], sus4: [[0, 5, 7], 'sus4'], sus2: [[0, 2, 7], 'sus2'] };
export const CHORD_POOL = [
  ['C', 'Am', 'F', 'G', 'Dm', 'Em'],
  ['Cmaj7', 'Am7', 'G7', 'Dm7', 'Em7', 'Fmaj7', 'D', 'E', 'A', 'Bm'],
  ['F#m', 'Bb', 'Eb', 'C#m', 'Ab', 'Gm', 'Csus4', 'Dsus2', 'E7', 'Bbmaj7', 'F#m7', 'Cm7'],
];
/** 'F#m7' → { sym: 'F♯m7', fr: 'Fa♯ mineur 7', root: 6, pcs: [6, 9, 1, 4] }. */
export function chordInfo(sym) {
  const [, l, acc, q] = /^([A-G])([#b]?)(.*)$/.exec(sym);
  const a = acc === '#' ? '♯' : acc === 'b' ? '♭' : '';
  const root = (ROOT_PC[l] + (acc === '#' ? 1 : acc === 'b' ? 11 : 0)) % 12;
  return { sym: l + a + q, fr: `${ROOT_FR[l]}${a} ${QUALITY[q][1]}`, root, pcs: QUALITY[q][0].map((x) => (root + x) % 12) };
}

// Structures de morceaux : 'Partie mesures' séparées par |, une forme par nombre de blocs (4, 5, 6).
// Règles (une seule solution possible) : intro au début, outro à la fin, groove juste après l'intro, montée juste avant
// chaque drop, break entre deux drops, chaque couplet suivi du hook.
const BLOCK_KIND = { Intro: 'intro', Groove: 'groove', Montée: 'build', 'Re-montée': 'build', Drop: 'drop', 'Drop 2': 'drop', 'Drop final': 'drop', Break: 'break', 'Long break': 'break', Outro: 'outro', Couplet: 'verse', Hook: 'hook' };
export const STRUCTURES = [
  { id: 'house', name: '🏠 House', d: 0, tip: 'l’intro ouvre, le groove installe le beat, la montée arrive juste avant chaque drop, le break se place entre deux drops.', forms: ['Intro 16|Montée 8|Drop 32|Outro 16', 'Intro 16|Groove 16|Montée 8|Drop 32|Outro 16', 'Intro 16|Montée 8|Drop 32|Break 16|Re-montée 8|Drop 2 32'] },
  { id: 'techno', name: '⚙️ Techno', d: 0, tip: 'l’intro ouvre, le groove installe le beat juste après, puis la montée amène le drop.', forms: ['Intro 32|Groove 64|Montée 16|Drop 32', 'Intro 32|Groove 32|Montée 16|Drop 64|Outro 32', null] },
  { id: 'trap', name: '🔥 Trap', d: 1, tip: 'l’intro ouvre, l’outro ferme, et chaque couplet est suivi du hook (le refrain).', forms: ['Intro 4|Couplet 16|Hook 8|Outro 4', 'Intro 4|Couplet 16|Hook 8|Couplet 16|Hook 8', 'Intro 4|Couplet 16|Hook 8|Couplet 16|Hook 8|Outro 4'] },
  { id: 'dnb', name: '⚡ Drum & bass', d: 1, tip: 'l’intro ouvre, le groove installe le beat, chaque drop arrive juste après une montée, le break se place entre deux drops.', forms: ['Intro 32|Montée 8|Drop 32|Outro 16', 'Intro 32|Groove 16|Montée 8|Drop 32|Outro 32', 'Intro 32|Montée 8|Drop 32|Break 16|Re-montée 8|Drop 2 32'] },
  { id: 'hardtrance', name: '🚀 Hard trance', d: 1.5, tip: 'la montée amène le drop, le long break sépare les deux drops, la re-montée amène le drop final.', forms: [null, null, 'Intro 16|Montée 8|Drop 32|Long break 32|Re-montée 16|Drop final 32'] },
];
export const blocksOf = (form) => form.split('|').map((p) => { const [, name, bars] = /^(.+) (\d+)$/.exec(p); return { name, bars: +bars, kind: BLOCK_KIND[name] }; });
const ASK = { drop: 'le drop', break: 'le break', build: 'la montée' };
const ASK_WHY = { drop: 'l’énergie au maximum, juste après la montée', break: 'l’énergie retombe entre deux parties fortes', build: 'l’énergie grimpe juste avant le drop' };
export const ASK_LABEL = ASK;

// Énergie de chaque type de partie (début → fin) pour dessiner la courbe d'un morceau
const ENERGY = { intro: [0.3, 0.45], groove: [0.6, 0.62], build: [0.38, 0.88], drop: [0.97, 0.97], break: [0.22, 0.26], outro: [0.5, 0.15], verse: [0.55, 0.55], hook: [0.85, 0.85] };
/** Courbe d'énergie : points [x, y] entre 0 et 1 (y = énergie) et limites des zones (cuts). */
export function energyCurve(zones, per = 10) {
  const w = zones.map((z) => Math.sqrt(Math.max(8, z.bars)));
  const total = w.reduce((a, b) => a + b, 0);
  const pts = [], cuts = [0];
  let x0 = 0;
  zones.forEach((z, k) => {
    const [a, b] = ENERGY[z.kind];
    for (let i = 0; i <= per; i++) {
      const f = i / per;
      const y = a + (b - a) * (z.kind === 'build' ? f * f : f) + 0.025 * Math.sin((k * per + i) * 1.7);
      pts.push([(x0 + f * w[k]) / total, Math.max(0.03, Math.min(1, y))]);
    }
    x0 += w[k];
    cuts.push(x0 / total);
  });
  return { pts, cuts };
}

// Réglages à lire : enveloppes (ms, sustain en %), formes d'onde, filtres, défauts d'EQ
const ENVS = {
  pluck: { label: '🪕 Pluck (pincé)', a: [1, 5], d: [500, 900], s: [0, 0], r: [200, 350], why: 'Attaque nette et sustain à 0 : le son s’éteint tout seul, c’est un pluck' },
  pad: { label: '☁️ Pad (nappe)', a: [700, 1400], d: [500, 900], s: [65, 85], r: [1200, 2000], why: 'Attaque et release longues : le son arrive et repart en douceur, c’est un pad' },
  bass: { label: '🎸 Basse tenue', a: [2, 8], d: [80, 150], s: [85, 100], r: [40, 90], why: 'Attaque immédiate et sustain haut : la note tient tant que la touche est enfoncée' },
  stab: { label: '🔨 Stab (coup sec)', a: [0, 2], d: [100, 180], s: [0, 8], r: [40, 80], why: 'Tout est très court : un coup sec, encore plus bref qu’un pluck' },
};
const WAVES = {
  sine: { label: 'Sinus', why: 'Une seule bosse lisse : le sinus, sans harmoniques (idéal pour une sub-basse)' },
  saw: { label: 'Dent de scie', why: 'Une rampe puis une chute nette : la dent de scie, la plus riche en harmoniques' },
  square: { label: 'Carré', why: 'Deux paliers, en haut puis en bas : le carré, son creux de jeu vidéo' },
  triangle: { label: 'Triangle', why: 'Des pentes droites qui montent et descendent : le triangle, doux comme un sinus' },
};
const FILTERS = {
  lp: { label: 'Passe-bas (LP)', why: 'Les aigus sont coupés à droite : passe-bas, le filtre le plus utilisé' },
  hp: { label: 'Passe-haut (HP)', why: 'Les graves sont coupés à gauche : passe-haut, pour nettoyer le bas' },
  bp: { label: 'Passe-bande (BP)', why: 'Seule une bande au milieu passe : passe-bande, son de radio' },
  notch: { label: 'Coupe-bande (notch)', why: 'Un creux étroit au milieu : coupe-bande (notch)' },
};
const EQS = {
  low: { label: '✂️ Baisser le bas (<\u00a0100\u00a0Hz)', why: 'Trop de sub et de bas : passe-haut ou low shelf vers 80-100 Hz' },
  mud: { label: '🕳️ Creuser vers 300\u00a0Hz', why: 'Bosse vers 250-400 Hz : c’est la boue, on creuse en cloche' },
  harsh: { label: '🔉 Adoucir vers 4\u00a0kHz', why: 'Pic vers 3-5 kHz : le son agresse, on baisse en cloche étroite' },
  air: { label: '✨ Monter l’air (10\u00a0kHz)', why: 'Le haut du spectre s’effondre : un high shelf vers 10 kHz rend de l’air' },
};

/**
 * Manches d'une nuit : pas deux fois le même mini-jeu de suite, la difficulté monte toutes les 4 manches.
 * silent : uniquement les mini-jeux sans le son (même salle, même difficulté).
 */
export function planNight(venue, seed, { silent = false } = {}) {
  const r = rng(`club-${venue.id}${silent ? '@silent' : ''}-${seed}`);
  const games = silent ? SILENT_GAMES : venue.games;
  const rounds = [];
  let prev = null;
  for (let i = 0; i < venue.length; i++) {
    let type;
    do type = pick(r, games); while (type === prev && games.length > 1);
    prev = type;
    const d = venue.diff + Math.floor(i / 4) * 0.5;
    const bpm = venue.bpm + Math.floor(i / 4) * 4;
    rounds.push({ i, type, d, bpm, speed: 1 + Math.floor(i / 4) * 0.08, q: MAKERS[type](r, d, bpm, venue) });
  }
  return rounds;
}

/** Temps donné pour répondre (secondes) : se resserre quand la salle s'échauffe. */
export const roundTime = (round) => Math.max(3.5, GAMES[round.type].time / round.speed);

/** Frappes sur le temps : combien tombent à moins de tol ms d'un temps attendu (chaque temps compte une fois). */
export function judgeTaps(taps, beats, tolMs) {
  const used = new Set();
  let hits = 0;
  const offs = [];
  for (const t of taps) {
    let best = -1, bd = Infinity;
    beats.forEach((b, i) => { const dd = Math.abs(t - b); if (!used.has(i) && dd < bd) { bd = dd; best = i; } });
    if (best >= 0 && bd * 1000 <= tolMs) { used.add(best); hits++; offs.push(Math.round((t - beats[best]) * 1000)); }
  }
  return { hits, offs };
}

/** Points d'une manche réussie : base + rapidité + combo (plafonné). */
export const roundPoints = (combo, timeLeftFrac) => 100 + Math.round(50 * Math.max(0, Math.min(1, timeLeftFrac))) + Math.min(combo, 10) * 10;

/** Ambiance de la salle (0-100) : monte quand tu réussis, chute quand tu rates. */
export const nextHype = (hype, ok) => Math.max(0, Math.min(100, hype + (ok ? 10 : -18)));

/** Étoiles : nuit terminée (pas plus de 2 erreurs) puis précision. */
export function starsFor(done, correct, total) {
  if (!done || !total) return 0;
  const acc = correct / total;
  return acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : 1;
}

export const totalStars = (best = {}, silent = false) => VENUES.reduce((a, v) => a + (best[starKey(v.id, silent)]?.stars || 0), 0);
export const isOpen = (venue, best = {}, silent = false) => totalStars(best, silent) >= venue.need;
/** Progression du mode sans le son (pour une tuile « Jouer ») : étoiles, maximum, set du jour fait aujourd'hui ? */
export const silentStars = (club = {}, day = null) => ({ stars: totalStars(club.best, true), max: MAX_STARS, nights: club.nightsSilent || 0, dailyDone: !!day && club.dailySilent?.day === day });

/** XP par compétence : 3 par manche réussie dans la compétence du mini-jeu + bonus de fin réparti. */
export function nightXp(results, stars, daily = false) {
  const skills = {};
  for (const r of results) if (r.ok) skills[GAMES[r.type].skill] = (skills[GAMES[r.type].skill] || 0) + 3;
  const bonus = (stars ? 10 + stars * 5 : 0) * (daily ? 2 : 1);
  const keys = Object.keys(skills);
  if (bonus && keys.length) keys.forEach((k, i) => { skills[k] += Math.floor(bonus / keys.length) + (i < bonus % keys.length ? 1 : 0); });
  return { total: Object.values(skills).reduce((a, b) => a + b, 0), skills };
}

/** Vinyle gagné à la fin d'une nuit réussie : un style au hasard parmi ceux de la salle, plus rare avec 3 étoiles. */
export function pressVinyl(venue, seed, stars) {
  if (!stars) return null;
  const r = rng(`vinyl-${venue.id}-${seed}`);
  return { genre: pick(r, venue.genres), kind: stars === 3 ? 'gold' : stars === 2 ? 'color' : 'black' };
}
const RANK = { black: 1, color: 2, gold: 3 };
/** Range un vinyle dans la caisse : compte + meilleure édition. */
export function addToCrate(crate = {}, v) {
  if (!v) return crate;
  const cur = crate[v.genre] || { n: 0, kind: 'black' };
  return { ...crate, [v.genre]: { n: cur.n + 1, kind: RANK[v.kind] > RANK[cur.kind] ? v.kind : cur.kind } };
}
export const VINYL_RANK = RANK;

/** Notions rencontrées pendant la nuit (pour le récap « ce que tu as appris »). */
export function nightConcepts(results) {
  const by = {};
  for (const r of results) {
    const b = by[r.type] || (by[r.type] = { type: r.type, ok: 0, total: 0 });
    b.total++; if (r.ok) b.ok++;
  }
  return Object.values(by).sort((a, b) => a.ok / a.total - b.ok / b.total);
}
