// 🎯 Défis du jour, 🔩 boulons et garde-robe de Bip. Module pur (pas d'accès au navigateur).
// - Trois défis par jour, tirés selon la date (les mêmes sur tous tes appareils), du plus simple au plus corsé.
//   Chacun rapporte des boulons ; les trois réussis ouvrent le coffre du jour.
// - Les boulons se gagnent aussi avec chaque succès (bronze, argent, or) et servent à habiller Bip.
// Tout est stocké dans des compteurs qui ne font que monter (stats, journées) : la synchro entre appareils garde le maximum.
import { ACHIEVEMENTS } from './achievements.js';
import { rng } from './daily.js';

export const BOLT = '🔩';
export const TIER_BOLTS = { bronze: 10, silver: 25, gold: 60 };
export const CHEST_BOLTS = 30;
export const CHEST_XP = 20;

const lessonsEver = (s) => Object.keys(s.course?.done || {}).filter((k) => /^u\d+-l\d+$/.test(k)).length;
const extrasToday = (s, d) => (s.log || []).filter((e) => e.d === d && e.key && !e.key.startsWith('course:')).length;
const C = (id, level, emoji, name, goal, value, opts = {}) => ({ id, level, emoji, name, goal, value, bolts: [10, 15, 25][level], ...opts });

/** level 0 : facile (on le fait en une leçon) ; 1 : demande de s'appliquer ; 2 : corsé. */
export const CHALLENGES = [
  C('lesson1', 0, '🎓', 'Termine une leçon du parcours', 1, (s, day) => day.les || 0),
  C('xp40', 0, '⚡', 'Gagne 40 XP', 40, (s, day) => day.xp || 0),
  C('good10', 0, '✅', 'Donne 10 bonnes réponses', 10, (s, day) => day.good || 0),
  C('jam4', 0, '🎵', 'Réunis 4 pistes dans ton morceau', 4, (s, day) => day.jam || 0),
  C('combo5', 1, '🔥', 'Enchaîne 5 bonnes réponses d’affilée', 5, (s, day) => day.combo || 0),
  C('perfect1', 1, '👑', 'Termine une leçon sans faute', 1, (s, day) => day.perf || 0),
  C('lesson2', 1, '📚', 'Termine 2 leçons du parcours', 2, (s, day) => day.les || 0),
  C('review1', 1, '🔁', 'Fais un entraînement de révision', 1, (s, day) => day.rev || 0, { need: (s) => lessonsEver(s) >= 1 }),
  C('goal', 1, '🎯', 'Atteins ton objectif du jour', 1, (s, day) => ((day.xp || 0) >= (s.settings?.dailyGoal || 150) ? 1 : 0)),
  C('extra1', 1, '🧩', 'Fais un exercice dans les Extras (jeu ou atelier)', 1, (s, day, d) => extrasToday(s, d)),
  C('jam6', 2, '🎶', 'Complète ton morceau : les 6 pistes', 6, (s, day) => day.jam || 0),
  C('combo10', 2, '🚀', 'Enchaîne 10 bonnes réponses d’affilée', 10, (s, day) => day.combo || 0),
  C('perfect2', 2, '💎', 'Termine 2 leçons sans faute', 2, (s, day) => day.perf || 0),
  C('lesson3', 2, '🏃', 'Termine 3 leçons du parcours', 3, (s, day) => day.les || 0),
  C('xp150', 2, '⚡', 'Gagne 150 XP', 150, (s, day) => day.xp || 0),
  C('fast', 2, '⏱️', 'Termine une leçon en moins de 2 minutes', 1, (s, day) => day.fast || 0),
];
export const challengeById = (id) => CHALLENGES.find((c) => c.id === id);

/** Les trois défis d'un jour (un par niveau), reproductibles pour une date donnée. */
export function dailyChallenges(d, state = {}) {
  const r = rng(`defis-${d}`);
  return [0, 1, 2].map((level) => {
    const pool = CHALLENGES.filter((c) => c.level === level && (!c.need || c.need(state)));
    return pool[Math.floor(r() * pool.length)] || CHALLENGES.find((c) => c.level === level);
  });
}

/** État des défis du jour : [{ ...défi, value, done, claimed }], coffre. */
export function challengeStatus(state, d) {
  const day = state.days?.[d] || {};
  const list = dailyChallenges(d, state).map((c) => {
    let v = 0;
    try { v = Math.max(0, Math.min(c.goal, Math.floor(c.value(state, day, d) || 0))); } catch (e) { v = 0; }
    return { ...c, value: v, done: v >= c.goal, claimed: !!day.claim?.[c.id] };
  });
  return { list, allDone: list.every((c) => c.done), chest: !!day.chest, count: list.filter((c) => c.done).length };
}

/**
 * Valide les défis réussis pas encore récompensés (modifie l'état). Renvoie { won: [défis], chest: bool, bolts, xp }.
 */
export function settleChallenges(state, d) {
  const st = challengeStatus(state, d);
  const won = st.list.filter((c) => c.done && !c.claimed);
  const chest = st.allDone && !st.chest;
  if (!won.length && !chest) return { won: [], chest: false, bolts: 0, xp: 0 };
  const day = state.days[d] || (state.days[d] = { xp: 0, sessions: 0, exercises: 0 });
  day.claim = { ...(day.claim || {}) };
  let bolts = 0;
  for (const c of won) { day.claim[c.id] = 1; bolts += c.bolts; }
  if (chest) { day.chest = 1; bolts += CHEST_BOLTS; }
  return { won, chest, bolts, xp: chest ? CHEST_XP : 0 };
}

/** Note un évènement de leçon dans la journée (compteurs qui ne font que monter). */
export function trackDay(state, d, ev = {}) {
  const day = state.days[d] || (state.days[d] = { xp: 0, sessions: 0, exercises: 0 });
  if (ev.good) day.good = (day.good || 0) + ev.good;
  if (ev.combo) day.combo = Math.max(day.combo || 0, ev.combo);
  if (ev.jam) day.jam = Math.max(day.jam || 0, ev.jam);
  if (ev.lesson) day.les = (day.les || 0) + 1;
  if (ev.perfect) day.perf = (day.perf || 0) + 1;
  if (ev.review) day.rev = (day.rev || 0) + 1;
  if (ev.fast) day.fast = (day.fast || 0) + 1;
  if (ev.jam >= 6) { state.stats = state.stats || {}; state.stats.jamFull = (state.stats.jamFull || 0) + (ev.lesson || ev.review ? 1 : 0); }
  return day;
}

// ---------- Boulons ----------
const TIER_OF = new Map(ACHIEVEMENTS.map((a) => [a.id, a.tier]));
/** Défis et coffres gagnés depuis le début (lus dans les journées : rien ne se perd à la synchro). */
export function challengeTotals(state) {
  let challenges = 0, chests = 0, bolts = 0;
  for (const day of Object.values(state.days || {})) {
    for (const id of Object.keys(day.claim || {})) { challenges++; bolts += challengeById(id)?.bolts || 10; }
    if (day.chest) { chests++; bolts += CHEST_BOLTS; }
  }
  return { challenges, chests, bolts };
}
/** Boulons gagnés : défis et coffres + chaque succès obtenu (rétroactif). */
export function boltsEarned(state) {
  const fromBadges = Object.keys(state.badges || {}).reduce((a, id) => a + (TIER_BOLTS[TIER_OF.get(id)] || 0), 0);
  return challengeTotals(state).bolts + fromBadges;
}
export const boltsBalance = (state) => Math.max(0, boltsEarned(state) - (state.stats?.boltsSpent || 0));

// ---------- Garde-robe de Bip ----------
const I = (id, kind, name, emoji, price, opts = {}) => ({ id, kind, name, emoji, price, ...opts });
export const BIP_ITEMS = [
  // Couleurs
  I('violet', 'skin', 'Violet d’origine', '🟣', 0),
  I('mint', 'skin', 'Menthe', '🟢', 60),
  I('coral', 'skin', 'Corail', '🟠', 60),
  I('sky', 'skin', 'Bleu ciel', '🔵', 60),
  I('night', 'skin', 'Nuit', '⚫', 120),
  I('gold', 'skin', 'Plaqué or', '🟡', 0, { unlock: 'courseAll', how: 'Réussis l’examen final du parcours' }),
  // Accessoires
  I('none', 'acc', 'Rien', '🚫', 0),
  I('headphones', 'acc', 'Casque de studio', '🎧', 80),
  I('shades', 'acc', 'Lunettes de club', '🕶️', 80),
  I('cap', 'acc', 'Casquette', '🧢', 100),
  I('bow', 'acc', 'Nœud papillon', '🎀', 50),
  I('beanie', 'acc', 'Bonnet', '🧶', 100),
  I('stache', 'acc', 'Moustache', '🥸', 70),
  I('flame', 'acc', 'Antenne en feu', '🔥', 0, { unlock: 'streak7', how: '7 jours d’affilée' }),
  I('crown', 'acc', 'Couronne', '👑', 0, { unlock: 'coursePerfect10', how: '10 leçons sans faute' }),
  I('star', 'acc', 'Antenne étoile', '⭐', 0, { unlock: 'courseBasics', how: 'Termine la partie 1 du parcours' }),
];
export const bipItem = (id) => BIP_ITEMS.find((x) => x.id === id);
/** Possédé : gratuit, acheté (stats['bip:id']) ou débloqué par un succès. */
export function ownsItem(state, id) {
  const it = bipItem(id);
  if (!it) return false;
  if (it.unlock) return !!state.badges?.[it.unlock];
  return it.price === 0 || !!state.stats?.[`bip:${id}`];
}
/** Achète un accessoire (modifie l'état). Renvoie true si l'achat est fait. */
export function buyItem(state, id) {
  const it = bipItem(id);
  if (!it || it.unlock || ownsItem(state, id) || boltsBalance(state) < it.price) return false;
  state.stats[`bip:${id}`] = 1;
  state.stats.boltsSpent = (state.stats.boltsSpent || 0) + it.price;
  return true;
}
/** Tenue portée (toujours quelque chose de possédé). */
export function bipLook(state) {
  const l = state.settings?.bip || {};
  return { skin: ownsItem(state, l.skin) && bipItem(l.skin)?.kind === 'skin' ? l.skin : 'violet', acc: ownsItem(state, l.acc) && bipItem(l.acc)?.kind === 'acc' ? l.acc : 'none' };
}
