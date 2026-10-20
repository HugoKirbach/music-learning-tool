// « Nuit au club » : jeu mobile façon WarioWare. Tu es DJ, chaque mini-jeu dure quelques secondes, la salle s'échauffe
// (le tempo monte) et tu apprends sans t'en rendre compte : hauteur, majeur/mineur, pulsation, backbeat, styles, mémoire
// mélodique, noms des notes, tempo, phrases de 8 temps. Module pur : génération déterministe des manches, notation.
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
};

export const VENUES = [
  { id: 'bar', emoji: '🍺', name: 'Le bar du coin', need: 0, bpm: 100, length: 10, diff: 0, games: ['pitch', 'mood', 'beat', 'note', 'contour'], genres: ['house', 'lofi', 'trap'] },
  { id: 'warehouse', emoji: '🏭', name: 'La warehouse', need: 2, bpm: 116, length: 12, diff: 0.5, games: ['pitch', 'mood', 'beat', 'hole', 'genre', 'note', 'count'], genres: ['house', 'techno', 'trap', 'lofi'] },
  { id: 'beach', emoji: '🏖️', name: 'Le beach club', need: 5, bpm: 112, length: 14, diff: 1, games: ['pitch', 'mood', 'hole', 'genre', 'simon', 'note', 'tempo', 'contour', 'swing'], genres: ['deephouse', 'afrohouse', 'reggaeton', 'disco', 'house'] },
  { id: 'rooftop', emoji: '🌇', name: 'Le rooftop', need: 7, bpm: 120, length: 14, diff: 1.2, games: ['mood', 'hole', 'simon', 'note', 'tempo', 'swing', 'count', 'filter', 'contour'], genres: ['deephouse', 'lofi', 'ukg', 'disco', 'funk'] },
  { id: 'festival', emoji: '🎪', name: 'Le festival', need: 8, bpm: 126, length: 16, diff: 1.5, games: Object.keys(GAMES), genres: ['house', 'techno', 'trap', 'dnb', 'dubstep', 'trance', 'ukg'] },
  { id: 'tokyo', emoji: '🏮', name: 'Club underground à Tokyo', need: 10, bpm: 128, length: 16, diff: 1.8, games: Object.keys(GAMES), genres: ['techno', 'jersey', 'trap', 'dnb', 'synthwave', 'acid'] },
  { id: 'berlin', emoji: '🌌', name: 'Résidence à Berlin', need: 11, bpm: 132, length: 18, diff: 2.2, games: Object.keys(GAMES), genres: ['techno', 'acid', 'house', 'deephouse', 'dnb', 'jungle', 'ukg', 'afrohouse'] },
  { id: 'ibiza', emoji: '🏝️', name: 'Closing à Ibiza', need: 14, bpm: 124, length: 18, diff: 2.5, games: Object.keys(GAMES), genres: ['house', 'deephouse', 'afrohouse', 'trance', 'disco', 'techno'] },
  { id: 'space', emoji: '🛸', name: 'Rave orbitale', need: 18, bpm: 140, length: 20, diff: 3, games: Object.keys(GAMES), genres: ['dnb', 'jungle', 'dubstep', 'trance', 'acid', 'techno', 'trap', 'synthwave', 'ukg', 'jersey'] },
];
export const venueById = (id) => VENUES.find((v) => v.id === id);
export const MAX_STARS = VENUES.length * 3;

/** Set du jour : le même pour tout le monde, tous les mini-jeux, difficulté moyenne. */
export function dailyVenue(day) {
  const r = rng('club-day' + day);
  const genres = ['house', 'techno', 'trap', 'dnb', 'lofi', 'deephouse', 'afrohouse', 'reggaeton', 'disco', 'ukg', 'trance', 'dubstep'];
  const pool = [...genres].sort(() => r() - 0.5).slice(0, 5);
  return { id: 'daily', emoji: '📅', name: 'Le set du jour', need: 0, bpm: 110 + Math.floor(r() * 4) * 5, length: 12, diff: 1, games: Object.keys(GAMES), genres: pool, seed: day };
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
};

/** Manches d'une nuit : pas deux fois le même mini-jeu de suite, la difficulté monte toutes les 4 manches. */
export function planNight(venue, seed) {
  const r = rng(`club-${venue.id}-${seed}`);
  const rounds = [];
  let prev = null;
  for (let i = 0; i < venue.length; i++) {
    let type;
    do type = pick(r, venue.games); while (type === prev && venue.games.length > 1);
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

export const totalStars = (best = {}) => VENUES.reduce((a, v) => a + (best[v.id]?.stars || 0), 0);
export const isOpen = (venue, best = {}) => totalStars(best) >= venue.need;

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
