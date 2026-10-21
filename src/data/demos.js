// Mini-maquettes originales, écrites dans les codes de chaque style (structure, rythme, sons), pour l'Atlas.
// Elles ne reprennent aucun morceau existant : les références à écouter sont données à côté.
import { createSong } from '../core/demosong.js';

// Vélocités des hi-hats en doubles croches (position dans le temps : 1, e, et, a)
const HATS_ROLL = [0.32, 0.5, 0.85, 0.5];
const HATS_BOUNCE = [0.3, 0, 0.62, 0.42];
const FOUR = 'x...x...x...x...';
const CLAP = '....x.......x...';
const OFF = '..x...x...x...x.';

// ---------------------------------------------------------------- HARD TRANCE (155 BPM, Fa mineur)
// Progression i – VI – III – VII : Fm – D♭ – A♭ – E♭ (une mesure chacun).
const HT_ROOTS = [41, 37, 44, 39]; // Fa2, Ré♭2, La♭2, Mi♭2
const HT_PAD = [[53, 65, 68, 72], [49, 65, 68, 73], [56, 63, 68, 72], [51, 63, 67, 70]];
const HT_STAB = [[65, 68, 72], [65, 68, 73], [63, 68, 72], [63, 67, 70]];
const ROLLING = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15]; // les 3 doubles croches après chaque kick
// Lead (8 mesures) : montée en arpège sur Fm, réponse sur D♭, envolée sur A♭, résolution sur E♭ → Fa
const HT_LEAD = [
  [[0, 72, 2], [2, 68, 2], [4, 65, 2], [6, 68, 2], [8, 72, 2], [10, 75, 2], [12, 77, 4]],
  [[0, 77, 2], [2, 75, 2], [4, 73, 4], [8, 72, 2], [10, 73, 2], [12, 68, 4]],
  [[0, 72, 2], [2, 68, 2], [4, 75, 4], [8, 72, 2], [10, 75, 2], [12, 77, 2], [14, 75, 2]],
  [[0, 70, 4], [4, 67, 2], [6, 70, 2], [8, 75, 6]],
  [[0, 72, 2], [2, 68, 2], [4, 65, 2], [6, 68, 2], [8, 72, 2], [10, 75, 2], [12, 77, 4]],
  [[0, 77, 2], [2, 75, 2], [4, 73, 4], [8, 72, 2], [10, 73, 2], [12, 68, 4]],
  [[0, 72, 2], [2, 75, 2], [4, 68, 2], [6, 72, 2], [8, 75, 2], [10, 77, 2], [12, 75, 4]],
  [[0, 67, 2], [2, 70, 2], [4, 75, 4], [8, 77, 8]],
];
const lead = (bars, offset = 0) => bars.flatMap((b, i) => HT_LEAD[b].map(([st, m, len]) => [i + offset, st, m, len]));

export const HARD_TRANCE_DEMO = createSong({ title: 'Nuit blanche (maquette hard trance)', bpm: 155, kit: 'harddance' }, ({ section }) => {
  section('Intro', '🥁', 4, 'Kick saturé sur chaque temps et hats en doubles croches qui roulent. Le clap et la basse entrent à la 3e mesure, un roulement de snare annonce la suite.', (s) => {
    s.drum('kick', FOUR);
    s.hats(HATS_ROLL);
    s.drum('ohat', OFF, { from: 2, vel: 0.5 });
    s.drum('clap', CLAP, { from: 2 });
    s.bass('Basse', 'trancebass', HT_ROOTS, ROLLING, { from: 2, vel: 0.65 });
    s.roll('snare', 3, 4, { fromStep: 12, v0: 0.4, v1: 0.8 });
    s.filter(0, 20000, 20000);
    s.pump(0, 0.35);
  });
  section('Groove', '🔁', 8, 'Le moteur du morceau : kick + basse roulante (les 3 doubles croches entre les kicks), stabs d’accords à contretemps. Le lead fait une première apparition à la fin pour donner envie.', (s) => {
    s.crash(0);
    s.drum('kick', FOUR);
    s.hats(HATS_ROLL);
    s.drum('ohat', OFF, { vel: 0.5 });
    s.drum('clap', CLAP);
    s.drum('perc', '...x.......x..x.', { vel: 0.45 });
    s.bass('Basse', 'trancebass', HT_ROOTS, ROLLING);
    s.chords('Accords', 'supersaw', HT_STAB, [[2, 1.5], [6, 1.5], [10, 1.5], [14, 1.5]], { vel: 0.75 });
    s.notes('Lead', 'pluck', lead([0, 1], 6), { vel: 0.55 });
    s.crash(4, 0, 0.6);
    s.roll('snare', 7, 4, { fromStep: 8, v0: 0.4, v1: 0.9 });
  });
  section('Break', '🌌', 8, 'Plus de kick ni de basse : les nappes posent l’harmonie (Fm – D♭ – A♭ – E♭) et la mélodie se dévoile, d’abord au piano puis en supersaw. Le filtre s’ouvre petit à petit.', (s) => {
    s.pump(0, 0);
    s.filter(0, 2200, 2200);
    s.chords('Nappes', 'supersaw', HT_PAD, [[0, 16]], { vel: 0.6 });
    s.notes('Lead', 'pluck', lead([0, 1, 2, 3]), { vel: 0.6 });
    s.notes('Lead', 'trancelead', lead([4, 5, 6, 7], 4), { vel: 0.55 });
    s.filter(4, 2200, 16000, 4);
    s.hats([0, 0, 0.35, 0], { id: 'hat', from: 6 });
  });
  section('Montée', '🚀', 4, 'Le build : accords hachés en doubles croches qui montent en volume, roulement de snare qui accélère (noires → croches → doubles croches), riser et filtre qui s’ouvrent… puis un temps de silence avant le drop.', (s) => {
    s.filter(0, 500, 18000, 4);
    s.riser(0, 4);
    s.chords('Accords', 'supersaw', HT_STAB, Array.from({ length: 16 }, (_, i) => [i, 0.6]), { from: 0, to: 3, ramp: [0.25, 0.65] });
    s.chords('Accords', 'supersaw', [HT_STAB[3]], Array.from({ length: 12 }, (_, i) => [i, 0.6]), { from: 3, to: 4, vel: 0.7 });
    s.roll('snare', 0, 1, { v0: 0.45, v1: 0.6 });
    s.roll('snare', 1, 2, { v0: 0.55, v1: 0.7 });
    s.roll('snare', 2, 4, { v0: 0.6, v1: 0.85 });
    s.roll('snare', 3, 8, { toStep: 12, v0: 0.75, v1: 1 });
  });
  section('Drop', '💥', 8, 'Tout explose : kick, basse roulante, hats, stabs à contretemps et le lead supersaw en entier. La sidechain fait « pomper » les synthés à chaque kick.', (s) => {
    s.filter(0, 20000, 20000);
    s.pump(0, 0.55);
    s.crash(0, 0, 0.9);
    s.crash(4, 0, 0.7);
    s.drum('kick', FOUR);
    s.hats(HATS_ROLL);
    s.drum('ohat', OFF, { vel: 0.55 });
    s.drum('clap', CLAP);
    s.drum('perc', '...x.......x..x.', { vel: 0.45 });
    s.bass('Basse', 'trancebass', HT_ROOTS, ROLLING, { vel: 0.9 });
    s.chords('Accords', 'supersaw', HT_STAB, [[2, 1.5], [6, 1.5], [10, 1.5], [14, 1.5]], { vel: 0.85 });
    s.notes('Lead', 'trancelead', lead([0, 1, 2, 3, 4, 5, 6, 7]), { vel: 0.85 });
    s.roll('snare', 7, 4, { fromStep: 12, v0: 0.5, v1: 0.9 });
  });
  section('Outro', '🌅', 2, 'Le groove continue une mesure pour le DJ, puis un dernier coup de kick et de crash.', (s) => {
    s.drum('kick', (b) => (b === 0 ? FOUR : 'x...............'));
    s.hats(HATS_ROLL, { to: 1 });
    s.bass('Basse', 'trancebass', HT_ROOTS, ROLLING, { to: 1 });
    s.crash(1, 0, 0.8);
    s.notes('Nappes', 'supersaw', [[1, 0, 53, 16], [1, 0, 65, 16], [1, 0, 68, 16], [1, 0, 72, 16]], { vel: 0.4 });
    s.pump(1, 0);
  });
});

// ---------------------------------------------------------------- HARD HOUSE (148 BPM, Sol mineur)
// Progression i – i – VI – VII : Gm – Gm – E♭ – F.
const HH_ROOTS = [43, 43, 39, 41]; // Sol2, Sol2, Mi♭2, Fa2
const HH_STAB = [[67, 70, 74], [67, 70, 74], [67, 70, 75], [65, 69, 72]];
// Riff hoover (glissé d'une note à l'autre), 4 mesures
const HH_RIFF = [
  [[0, 55, 2], [3, 55, 2], [6, 58, 2], [8, 60, 2], [10, 62, 6]],
  [[0, 65, 2], [3, 62, 2], [6, 60, 2], [8, 58, 4], [12, 57, 2], [14, 55, 2]],
  [[0, 55, 2], [3, 55, 2], [6, 58, 2], [8, 63, 2], [10, 62, 6]],
  [[0, 65, 2], [3, 60, 2], [6, 57, 2], [8, 60, 4], [12, 62, 4]],
];
// Lead aérien (supersaw), notes longues au-dessus du riff
const HH_AIR = [
  [[0, 74, 8], [8, 70, 8]],
  [[0, 72, 8], [8, 74, 8]],
  [[0, 75, 8], [8, 74, 4], [12, 70, 4]],
  [[0, 72, 8], [8, 69, 8]],
];
const loop4 = (src, bars) => Array.from({ length: bars }, (_, b) => src[b % 4].map(([st, m, len]) => [b, st, m, len])).flat();
const DONK = [2, 6, 10, 14];

export const HARD_HOUSE_DEMO = createSong({ title: 'Warehouse 148 (maquette hard house)', bpm: 148, kit: 'harddance' }, ({ section }) => {
  section('Intro', '🥁', 4, 'Kick sur chaque temps, hat ouvert à contretemps et percussions qui rebondissent. Le donk pointe le bout de son nez à la 4e mesure.', (s) => {
    s.filter(0, 20000, 20000);
    s.pump(0, 0.3);
    s.drum('kick', FOUR);
    s.drum('ohat', OFF, { vel: 0.55 });
    s.hats(HATS_BOUNCE);
    s.drum('perc', '..x..x....x..x..', { vel: 0.45 });
    s.drum('clap', CLAP, { from: 2 });
    s.bass('Donk', 'donk', HH_ROOTS, DONK, { from: 3, vel: 0.7, octaves: { 10: 12 } });
    s.roll('snare', 3, 4, { fromStep: 12, v0: 0.4, v1: 0.85 });
  });
  section('Drop 1', '🔨', 8, 'Le donk sur chaque contretemps (avec un saut d’octave), le riff hoover qui glisse d’une note à l’autre, crash toutes les 4 mesures : la salle saute.', (s) => {
    s.pump(0, 0.45);
    s.crash(0, 0, 0.9);
    s.crash(4, 0, 0.7);
    s.drum('kick', FOUR);
    s.drum('ohat', OFF, { vel: 0.55 });
    s.hats(HATS_BOUNCE);
    s.drum('perc', '..x..x....x..x..', { vel: 0.45 });
    s.drum('clap', CLAP);
    s.bass('Donk', 'donk', HH_ROOTS, DONK, { octaves: { 10: 12 } });
    s.notes('Hoover', 'hoover', loop4(HH_RIFF, 8), { vel: 0.8, glide: true });
    s.roll('snare', 7, 4, { fromStep: 8, v0: 0.4, v1: 0.9 });
  });
  section('Break', '🌫️', 4, 'Le kick s’arrête : stabs rave à contretemps et hoover tenu qui glisse d’un accord à l’autre. Un roulement de snare relance tout.', (s) => {
    s.pump(0, 0);
    s.filter(0, 3200, 3200);
    s.chords('Stabs', 'stab', HH_STAB, [[2, 1.5], [6, 1.5], [10, 1.5], [14, 1.5]], { vel: 0.8 });
    s.notes('Hoover', 'hoover', [[0, 0, 55, 16], [1, 0, 55, 16], [2, 0, 51, 16], [3, 0, 53, 16]], { vel: 0.5, glide: true });
    s.roll('snare', 3, 2, { v0: 0.4, v1: 0.75 });
  });
  section('Montée', '🚀', 2, 'Build court, comme souvent en hard house : snare en doubles croches puis en triples, riser, filtre qui s’ouvre… et un temps de silence.', (s) => {
    s.filter(0, 600, 18000, 2);
    s.riser(0, 2);
    s.roll('snare', 0, 4, { v0: 0.5, v1: 0.75 });
    s.roll('snare', 1, 8, { toStep: 12, v0: 0.75, v1: 1 });
    s.chords('Stabs', 'stab', [HH_STAB[0], HH_STAB[3]], Array.from({ length: 16 }, (_, i) => [i, 0.6]), { to: 1, ramp: [0.3, 0.6] });
    s.chords('Stabs', 'stab', [HH_STAB[3]], Array.from({ length: 12 }, (_, i) => [i, 0.6]), { from: 1, vel: 0.65 });
  });
  section('Drop 2', '💥', 8, 'Le drop final : tout le groove, le riff hoover, la snare qui double le clap et une nappe supersaw aérienne au-dessus, la touche « euphorique » du revival (Kettama, Marlon Hoffstadt).', (s) => {
    s.filter(0, 20000, 20000);
    s.pump(0, 0.5);
    s.crash(0, 0, 0.9);
    s.crash(4, 0, 0.7);
    s.drum('kick', FOUR);
    s.drum('ohat', OFF, { vel: 0.55 });
    s.hats(HATS_BOUNCE);
    s.drum('perc', '..x..x....x..x..', { vel: 0.45 });
    s.drum('clap', CLAP);
    s.drum('snare', CLAP, { vel: 0.55 });
    s.bass('Donk', 'donk', HH_ROOTS, [...DONK, 15], { octaves: { 10: 12, 15: 12 } });
    s.notes('Hoover', 'hoover', loop4(HH_RIFF, 8), { vel: 0.75, glide: true });
    s.notes('Lead', 'supersaw', loop4(HH_AIR, 8), { vel: 0.9 });
  });
  section('Outro', '🌅', 2, 'Une mesure de groove pour enchaîner, puis le dernier coup.', (s) => {
    s.drum('kick', (b) => (b === 0 ? FOUR : 'x...............'));
    s.drum('ohat', OFF, { to: 1, vel: 0.55 });
    s.bass('Donk', 'donk', HH_ROOTS, DONK, { to: 1, octaves: { 10: 12 } });
    s.crash(1, 0, 0.8);
    s.chords('Stabs', 'stab', [HH_STAB[0]], [[0, 4]], { from: 1, vel: 0.6 });
    s.pump(1, 0);
  });
});

export const DEMOS = {
  hardtrance: {
    song: HARD_TRANCE_DEMO,
    refs: [
      'Kichta – « Da Flow » (feat. Polyamor Berlin), « Freak Out »',
      'ANDATA & 2HOT2PLAY – « Never Gonna Stop »',
      'Fenrick – « Tricky House » · Fenrick & Pawlowski – « Back With Another One »',
      'Écoute aussi les sets « hard trance 150+ BPM » de 2HOT2PLAY, Mischluft et DJ Tallboy',
    ],
    listen: 'Dans les morceaux de référence, repère : le kick court et saturé, la basse qui roule entre les kicks, les hats en doubles croches, le break mélodique puis la montée (snare qui accélère, riser) et le drop où revient la mélodie.',
  },
  hardhouse: {
    song: HARD_HOUSE_DEMO,
    refs: [
      'Marlon Hoffstadt (alias DJ Daddy Trance) – « It’s That Time » (147 BPM)',
      'KETTAMA – « Air Maxes », « If U Want My Heart » (avec DJ Heartstring), album « Archangel » (2025)',
      'Malugi et KI/KI, figures du revival',
      'Aux origines du donk : Klubheads – « Kickin’ Hard » (1998)',
    ],
    listen: 'Repère : le donk (ou la basse) sur chaque contretemps, les hoovers qui glissent, les percussions qui rebondissent, les builds courts et les drops directs, avec des synthés plus « euphoriques » dans le revival actuel.',
  },
};
