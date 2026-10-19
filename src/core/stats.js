// Tableau de bord de progrès : séries par semaine (pratique, précision, tempo, oreille, compétences)
// et compétences qui stagnent. Module pur : tout est calculé depuis l'état (s.days, s.skills).
import { SKILLS, dayKey } from './progress.js';
import { addDays } from './srs.js';
import { weekStart } from './weekly.js';

/** Totaux d'une liste de jours. Les jours sans activité comptent pour 0. */
function sumDays(s, days) {
  const out = { xp: 0, sec: 0, active: 0, accN: 0, accSum: 0, earOk: 0, earTotal: 0, tempo: 0, skills: {} };
  for (const d of days) {
    const x = s.days[d];
    if (!x) continue;
    out.xp += x.xp || 0;
    out.sec += x.sec || 0;
    if ((x.xp || 0) > 0 || (x.sec || 0) >= 60) out.active++;
    out.accN += x.acc?.n || 0;
    out.accSum += x.acc?.sum || 0;
    out.earOk += x.ear?.ok || 0;
    out.earTotal += x.ear?.total || 0;
    out.tempo = Math.max(out.tempo, x.tempo || 0);
    for (const [k, v] of Object.entries(x.skills || {})) out.skills[k] = (out.skills[k] || 0) + v;
  }
  return out;
}

/**
 * Une entrée par semaine (lundi → dimanche), de la plus ancienne à la semaine en cours.
 * minutes : temps de pratique mesuré ; acc : score moyen des exercices notés (%) ; tempo : BPM le plus rapide
 * réussi à 80 % ou plus (Piano Rush / Pad Rush) ; ear : % de bonnes réponses à l'oreille.
 */
export function weeklySeries(s, weeks = 12, today = dayKey()) {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(first, 7 * i);
    const t = sumDays(s, Array.from({ length: 7 }, (_, j) => addDays(start, j)));
    return {
      start, xp: t.xp, minutes: Math.round(t.sec / 60), activeDays: t.active,
      acc: t.accN ? Math.round(t.accSum / t.accN) : null,
      ear: t.earTotal ? Math.round((100 * t.earOk) / t.earTotal) : null,
      tempo: t.tempo || null,
      skills: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, t.skills[k] || 0])),
    };
  });
}

/** Meilleur tempo réussi depuis toujours (référence pour « tempo maîtrisé »). */
export function bestTempo(s) {
  return Object.values(s.days || {}).reduce((m, d) => Math.max(m, d.tempo || 0), 0) || null;
}

/**
 * Compétences qui stagnent : déjà travaillées, mais presque plus rien sur les 14 derniers jours
 * alors que le reste avance. Triées de la plus délaissée à la moins délaissée.
 */
export function stagnating(s, today = dayKey()) {
  const recent = sumDays(s, Array.from({ length: 14 }, (_, i) => addDays(today, -i))).skills;
  const before = sumDays(s, Array.from({ length: 28 }, (_, i) => addDays(today, -14 - i))).skills;
  const totalRecent = Object.values(recent).reduce((a, b) => a + b, 0);
  if (totalRecent < 30) return []; // pas assez joué ces derniers temps pour comparer
  const share = 1 / Object.keys(SKILLS).length;
  return Object.keys(SKILLS)
    .map((k) => {
      const r = recent[k] || 0;
      const worked = (s.skills?.[k] || 0) > 0;
      const days = lastWorked(s, k, today);
      return { skill: k, recent: r, before: before[k] || 0, ratio: r / totalRecent, days, worked };
    })
    .filter((x) => x.worked && x.ratio < share * 0.35 && (x.before > x.recent || x.days >= 10))
    .sort((a, b) => a.ratio - b.ratio || b.days - a.days);
}

/** Nombre de jours depuis la dernière fois qu'une compétence a rapporté de l'XP (99 = jamais / très longtemps). */
export function lastWorked(s, skill, today = dayKey()) {
  for (let i = 0; i < 99; i++) if ((s.days[addDays(today, -i)]?.skills || {})[skill]) return i;
  return 99;
}

/** Variation entre les 4 dernières semaines et les 4 précédentes (null si pas de données des deux côtés). */
export function trend(series, key) {
  const vals = (arr) => arr.map((w) => w[key]).filter((v) => v != null);
  const a = vals(series.slice(-8, -4)), b = vals(series.slice(-4));
  if (!a.length || !b.length) return null;
  const avg = (x) => x.reduce((p, q) => p + q, 0) / x.length;
  return Math.round(avg(b) - avg(a));
}
