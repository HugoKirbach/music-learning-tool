// Objectifs personnels : un but chiffré avec une échéance, découpé en paliers hebdomadaires. Module pur.
import { levelFromXp, dayKey, daysBetween } from './progress.js';
import { addDays } from './srs.js';
import { bestTempo, weeklySeries } from './stats.js';

const rushStars = (s) => Object.entries(s.rush?.best || {}).filter(([k]) => !k.includes('@')).reduce((a, [, v]) => a + (v?.stars || 0), 0);
const padStars = (s) => Object.entries(s.pads?.best || {}).filter(([k]) => !k.includes('@')).reduce((a, [, v]) => a + (v?.stars || 0), 0);

/**
 * Types d'objectifs. measure(s, today) = valeur actuelle ; weekly = l'objectif se mesure semaine par semaine
 * (sinon c'est un cumul qui monte jusqu'à la cible).
 */
export const GOAL_KINDS = {
  tempo: {
    emoji: '⏱️', name: 'Jouer vite', unit: 'BPM', min: 60, max: 220, step: 5, def: 120,
    label: (t) => `Réussir un niveau à ${t} BPM (80 % ou plus)`,
    measure: (s) => bestTempo(s) || 0,
    advice: (m) => `Réussis un niveau de Piano Rush ou Pad Rush à ${m} BPM ou plus : en Mode libre, Difficile (×1,15) et Expert (×1,3) accélèrent le tempo.`,
  },
  level: {
    emoji: '🏆', name: 'Monter de niveau', unit: 'niveau', min: 2, max: 40, step: 1, def: 10,
    label: (t) => `Atteindre le niveau ${t}`,
    measure: (s) => levelFromXp(s.xp).level,
    advice: (m) => `Atteins le niveau ${m} : une session express par jour rapporte environ 100 à 150 XP.`,
  },
  streak: {
    emoji: '🔥', name: 'Régularité', unit: 'jours', min: 3, max: 365, step: 1, def: 30,
    label: (t) => `Une série de ${t} jours d’affilée`,
    measure: (s) => s.streak?.best || 0,
    advice: (m) => `Garde ta série jusqu’à ${m} jours : 5 minutes par jour suffisent.`,
  },
  practice: {
    emoji: '🕐', name: 'Temps de pratique', unit: 'min / semaine', min: 15, max: 1200, step: 15, def: 120, weekly: true,
    label: (t) => `Pratiquer ${t} minutes par semaine`,
    measure: (s, today) => weeklySeries(s, 1, today)[0].minutes,
    advice: (m) => `Pratique ${m} minutes cette semaine (≈ ${Math.ceil(m / 5)} min par jour sur 5 jours).`,
  },
  projects: {
    emoji: '🏁', name: 'Finir des morceaux', unit: 'projets', min: 1, max: 52, step: 1, def: 4,
    label: (t) => `Terminer ${t} projet${t > 1 ? 's' : ''} de la semaine`,
    measure: (s) => Object.values(s.weekProjects || {}).filter((p) => p.finished).length,
    advice: (m) => `Termine le projet de la semaine (${m} au total) : une étape par jour, export vers Live le dimanche.`,
  },
  stars: {
    emoji: '⭐', name: 'Étoiles Rush', unit: 'étoiles', min: 3, max: 300, step: 3, def: 30,
    label: (t) => `${t} étoiles dans Piano Rush et Pad Rush`,
    measure: (s) => rushStars(s) + padStars(s),
    advice: (m) => `Atteins ${m} étoiles : rejoue les niveaux à 1 ou 2 étoiles (93 % = 3 étoiles).`,
  },
};

/** Crée un objectif. weeks = durée en semaines (palier hebdomadaire). */
export function makeGoal(kind, target, weeks, s, today = dayKey()) {
  const K = GOAL_KINDS[kind];
  if (!K) throw new Error('Type d’objectif inconnu');
  const t = Math.max(K.min, Math.min(K.max, Math.round(target)));
  const w = Math.max(1, Math.min(52, Math.round(weeks)));
  const start = K.weekly ? Math.round(avgRecent(s, today)) : K.measure(s, today);
  return { id: `${kind}-${Date.now().toString(36)}`, kind, target: t, start: Math.min(start, t), from: today, deadline: addDays(today, 7 * w - 1), weeks: w };
}

/** Moyenne des minutes de pratique sur les 4 dernières semaines (point de départ d'un objectif hebdomadaire). */
function avgRecent(s, today) {
  const w = weeklySeries(s, 5, today).slice(0, 4);
  return w.reduce((a, x) => a + x.minutes, 0) / 4;
}

/**
 * Plan et suivi : paliers semaine par semaine (montée linéaire du départ vers la cible),
 * semaine en cours, valeur actuelle, en avance / en retard.
 */
export function goalPlan(goal, s, today = dayKey()) {
  const K = GOAL_KINDS[goal.kind];
  const W = goal.weeks;
  const milestones = Array.from({ length: W }, (_, i) => {
    const v = goal.start + ((goal.target - goal.start) * (i + 1)) / W;
    return { week: i + 1, from: addDays(goal.from, 7 * i), value: Math.min(goal.target, Math.ceil(v / (K.step || 1)) * (K.step || 1)) };
  });
  milestones[W - 1].value = goal.target;
  const elapsed = daysBetween(goal.from, today);
  const week = Math.max(1, Math.min(W, Math.floor(elapsed / 7) + 1));
  const current = K.measure(s, today);
  const m = milestones[week - 1].value;
  const done = !K.weekly && current >= goal.target;
  const over = elapsed > daysBetween(goal.from, goal.deadline);
  // Retard : on n'a même pas atteint le palier de la semaine précédente
  const prev = week > 1 ? milestones[week - 2].value : goal.start;
  const status = done ? 'done' : over ? 'expired' : current >= m ? 'ahead' : current >= prev ? 'ok' : 'late';
  const range = goal.target - goal.start;
  const pct = K.weekly ? Math.min(100, Math.round((100 * current) / Math.max(1, m))) : range > 0 ? Math.max(0, Math.min(100, Math.round((100 * (current - goal.start)) / range))) : 100;
  return { milestones, week, current, milestone: m, status, pct, advice: K.advice(m), daysLeft: Math.max(0, daysBetween(today, goal.deadline)) };
}
