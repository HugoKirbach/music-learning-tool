// Générateur de sessions courtes (5-10 min) : échauffement oreille → création → transfert studio.
// Déterministe pour un seed donné, et adaptatif : cible la compétence la plus faible et les styles jamais essayés.
import { GENRES } from '../data/genres.js';
import { MISSIONS } from '../data/missions.js';

export function rng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (const c of String(seed)) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export const WARMUPS = [
  { key: 'ear:intervals', title: 'Intervalles', desc: '8 intervalles à reconnaître', route: '#/ear?mode=intervals&n=8', skill: 'oreille', min: 2 },
  { key: 'ear:chords', title: 'Couleurs d’accords', desc: '8 accords : majeur, mineur, 7e…', route: '#/ear?mode=chords&n=8', skill: 'oreille', min: 2 },
  { key: 'ear:progressions', title: 'Progressions', desc: '5 progressions à identifier', route: '#/ear?mode=progressions&n=5', skill: 'harmonie', min: 3 },
  { key: 'ear:genre', title: 'Blind test rythmique', desc: 'Reconnais le style au beat', route: '#/ear?mode=genre&n=6', skill: 'rythme', min: 2 },
  { key: 'ear:sound', title: 'Quel paramètre ?', desc: 'A/B : qu’est-ce qui a changé dans le son ?', route: '#/ear?mode=sound&n=6', skill: 'sound', min: 2 },
];

export const CREATES = [
  { key: 'beat:ear', title: 'Recrée le beat', desc: 'Écoute un groove {genre} et reproduis-le', route: '#/beat?mode=ear&genre={genre}', skill: 'rythme', min: 4 },
  { key: 'beat:constraint', title: 'Beat sous contrainte', desc: 'Un groove {genre} avec une règle imposée', route: '#/beat?mode=constraint&genre={genre}', skill: 'rythme', min: 3 },
  { key: 'chords:recipe', title: 'Recette d’accords', desc: 'Construis une progression qui respecte la recette', route: '#/chords?mode=recipe&genre={genre}', skill: 'harmonie', min: 4 },
  { key: 'melody:challenge', title: 'Hook sous contrainte', desc: 'Une mélodie catchy sur une boucle {genre}', route: '#/melody?mode=challenge&genre={genre}', skill: 'melodie', min: 5 },
  { key: 'melody:dictation', title: 'Dictée mélodique', desc: 'Retrouve un motif à l’oreille', route: '#/melody?mode=dictation&genre={genre}', skill: 'oreille', min: 4 },
  { key: 'cr:repeat', title: 'Call & Response', desc: 'Rejoue en rythme les phrases d’un groove {genre}', route: '#/callresponse?kind=melody&mode=repeat&genre={genre}', skill: 'melodie', min: 3 },
  { key: 'cr:repeat', title: 'Call & Response aux pads', desc: 'Rejoue les rythmes {genre} aux pads', route: '#/callresponse?kind=rhythm&mode=repeat&genre={genre}', skill: 'rythme', min: 3 },
  { key: 'cr:improv', title: 'Réponds à la basse', desc: 'Improvise des réponses sur un groove {genre}', route: '#/callresponse?kind=bass&mode=improv&genre={genre}', skill: 'oreille', min: 3 },
  { key: 'hum:free', title: 'Fredonne une idée', desc: 'Chante un hook sur une boucle {genre}', route: '#/hum', skill: 'melodie', min: 4 },
  { key: 'bass:critique', title: 'Labo de basse', desc: 'Écris une basse sur une boucle, l’app la critique', route: '#/basslab', skill: 'harmonie', min: 5 },
  { key: 'mix:express', title: 'Mixdown express', desc: 'Corrige un mix {genre} à l’oreille', route: '#/mixdown?genre={genre}', skill: 'sound', min: 5 },
  { key: 'synth:match', title: 'Reproduis le son', desc: 'Retrouve les réglages d’un son mystère', route: '#/synth?mode=match', skill: 'sound', min: 4 },
];

const CAT_FOR_SKILL = {
  rythme: ['rythme'], harmonie: ['harmonie'], melodie: ['melodie'], sound: ['sound'],
  oreille: ['inspiration', 'melodie'], autonomie: ['inspiration', 'workflow', 'arrangement'],
};

/** Style du jour : identique pour toute la journée. */
/** Style du jour. Avec des styles favoris, environ 1 jour sur 3 tombe sur l'un d'eux. */
export function genreOfDay(day, favs = []) {
  const r = rng('genre' + day);
  const fav = favs.map((id) => GENRES.find((g) => g.id === id)).filter(Boolean);
  if (fav.length && r() < 0.35) return pick(r, fav);
  return pick(r, GENRES);
}

/** Top 3 des styles favoris (ordre conservé, sans doublon ni style inconnu). */
export function cleanFavs(list = []) {
  return [...new Set(list)].filter((id) => GENRES.some((g) => g.id === id)).slice(0, 3);
}

/**
 * @param {string} seed ex. '2026-10-15#2'
 * @param {{skills?:object, genres?:object, missions?:object, level?:number}} profile
 */
export function buildSession(seed, profile = {}) {
  const r = rng(seed);
  const skills = profile.skills || {};
  const level = profile.level || 1;
  const tried = profile.genres || {};

  // Compétence la plus faible (avec un peu d'aléatoire pour varier)
  const order = ['rythme', 'harmonie', 'melodie', 'sound', 'oreille']
    .map((k) => ({ k, v: (skills[k] || 0) + r() * 60 }))
    .sort((a, b) => a.v - b.v);
  // Focus de la semaine (test du lundi) : prioritaire 2 sessions sur 3
  const focus = profile.focus && r() < 0.67 ? profile.focus : order[0].k;

  // Style : 60 % de chances de prendre un style jamais essayé
  const untried = GENRES.filter((g) => !tried[g.id]);
  const genre = untried.length && r() < 0.6 ? pick(r, untried) : pick(r, GENRES);

  const fill = (s) => ({
    ...s,
    desc: s.desc.replace('{genre}', genre.name),
    route: s.route.replace('{genre}', genre.id),
  });

  const createPool = CREATES.filter((c) => c.skill === focus);
  const create = fill(createPool.length ? pick(r, createPool) : pick(r, CREATES));
  const warmPool = WARMUPS.filter((w) => w.skill !== create.skill || w.skill === 'oreille');
  const due = profile.due || 0;
  const warmup = due >= 3
    ? { key: 'ear:review', title: 'Révisions', desc: `${due} notions ratées à revoir`, route: '#/ear?mode=review', skill: 'oreille', min: 2 }
    : fill(pick(r, warmPool));

  // Transfert studio : mission liée à la compétence travaillée, niveau adapté
  const cats = CAT_FOR_SKILL[create.skill] || ['inspiration'];
  const maxLevel = level < 4 ? 1 : level < 9 ? 2 : 3;
  let pool = MISSIONS.filter((m) => cats.includes(m.cat) && m.level <= maxLevel);
  const fresh = pool.filter((m) => !(profile.missions || {})[m.id]);
  if (fresh.length) pool = fresh;
  if (!pool.length) pool = MISSIONS.filter((m) => m.level <= maxLevel);
  const mission = pick(r, pool);
  const transfer = r() < 0.2
    ? { key: 'dice', title: 'Dé à idées', desc: 'Tire une contrainte et lance-toi dans Live / MPC', route: '#/studio?dice=1', skill: 'autonomie', min: 10 }
    : { key: 'mission', title: mission.title, desc: mission.goal, route: `#/studio?mission=${mission.id}`, skill: 'autonomie', min: mission.min, missionId: mission.id };

  return { seed, focus, genre: genre.id, steps: [warmup, create, transfer] };
}

/** Une étape d'une session est validée par un exercice dont la clé correspond. */
export function stepMatches(step, key) {
  if (!step) return false;
  if (step.key === key) return true;
  return step.key === 'mission' && key.startsWith('mission');
}
