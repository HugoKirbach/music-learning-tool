// Bilan hebdomadaire et coach : statistiques de la semaine, comparaison, plan personnalisé. Module pur.
import { SKILLS, dayKey } from './progress.js';
import { addDays } from './srs.js';

/** Lundi de la semaine contenant `day` ('AAAA-MM-JJ'). */
export function weekStart(day) {
  const d = new Date(day + 'T12:00:00');
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  return addDays(day, -dow);
}

export function weekDays(start) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Statistiques d'une semaine à partir de l'état.
 * @param {object} s état (days, log, notebook, review)
 * @param {string} start lundi
 */
export function weekStats(s, start) {
  const days = weekDays(start);
  const set = new Set(days);
  const dd = days.map((d) => s.days[d] || {});
  const xp = dd.reduce((a, d) => a + (d.xp || 0), 0);
  const skills = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, dd.reduce((a, d) => a + ((d.skills || {})[k] || 0), 0)]));
  const ear = dd.reduce((a, d) => ({ ok: a.ok + ((d.ear || {}).ok || 0), total: a.total + ((d.ear || {}).total || 0) }), { ok: 0, total: 0 });
  const log = (s.log || []).filter((e) => set.has(e.d));
  const genres = [...new Set(log.map((e) => e.genre).filter(Boolean))];
  const keys = {};
  log.forEach((e) => { keys[e.key] = (keys[e.key] || 0) + 1; });
  const ideas = (s.notebook || []).filter((n) => set.has(dayKey(new Date(n.date))));
  return {
    start, days, xp,
    activeDays: dd.filter((d) => (d.xp || 0) > 0).length,
    sessions: dd.reduce((a, d) => a + (d.sessions || 0), 0),
    exercises: dd.reduce((a, d) => a + (d.exercises || 0), 0),
    perDay: dd.map((d) => d.xp || 0),
    skills, ear, genres, keys, ideas, log,
    scores: log.filter((e) => e.score != null),
  };
}

/** Notions le plus souvent ratées (fiches de révision au niveau le plus bas). */
export function weakNotions(review = {}, n = 5) {
  return Object.entries(review).sort((a, b) => a[1].box - b[1].box).slice(0, n).map(([k]) => k);
}

const ROUTES = {
  rythme: [{ title: 'Recrée un beat à l’oreille', route: '#/beat?mode=ear' }, { title: 'Call & Response aux pads', route: '#/callresponse?kind=rhythm&mode=repeat' }],
  harmonie: [{ title: 'Recette d’accords', route: '#/chords?mode=recipe' }, { title: 'Labo de basse (critique + variantes)', route: '#/basslab' }],
  melodie: [{ title: 'Fredonne un hook', route: '#/hum' }, { title: 'Défi hook', route: '#/melody?mode=challenge' }],
  sound: [{ title: 'Son mystère', route: '#/synth?mode=match' }, { title: 'Mixdown express', route: '#/mixdown' }],
  oreille: [{ title: 'Révisions + quiz d’intervalles', route: '#/ear?mode=intervals&n=8' }, { title: 'Dictée mélodique', route: '#/melody?mode=dictation' }],
  autonomie: [{ title: 'Remix ton idée', route: '#/remix' }, { title: 'Dé à idées (10 min)', route: '#/studio?dice=1' }],
};

/**
 * Plan de la semaine suivante : cible la compétence la plus faible de la semaine, les notions ratées,
 * garde une analyse de référence et un développement d'idée.
 */
export function coachPlan(cur, prev, { review = {}, programNext = null, untriedGenre = null } = {}) {
  const plan = [];
  const msgs = [];
  const sk = Object.entries(cur.skills).sort((a, b) => a[1] - b[1]);
  const weakest = sk[0][0], strongest = sk[sk.length - 1][0];
  if (cur.xp === 0) msgs.push('Semaine blanche : ce n’est pas grave. Objectif simple : 3 sessions de 5 minutes.');
  else if (prev && cur.xp > prev.xp * 1.1) msgs.push(`En progression : ${cur.xp} XP contre ${prev.xp} la semaine d’avant. 🔥`);
  else if (prev && prev.xp && cur.xp < prev.xp * 0.7) msgs.push('Moins de pratique que la semaine d’avant : vise la régularité plutôt que l’intensité (5 min par jour).');
  if (cur.activeDays >= 5) msgs.push(`${cur.activeDays} jours actifs sur 7 : l’habitude est installée.`);
  if (cur.xp) msgs.push(`Point fort : ${SKILLS[strongest].name}. À travailler : ${SKILLS[weakest].name}.`);
  if (cur.ear.total >= 10) msgs.push(`Oreille : ${Math.round((100 * cur.ear.ok) / cur.ear.total)} % de bonnes réponses cette semaine.`);

  ROUTES[weakest].forEach((r) => plan.push({ ...r, why: `${SKILLS[weakest].emoji} ${SKILLS[weakest].name} est ta compétence la moins travaillée.` }));
  const weak = weakNotions(review, 3);
  if (weak.length) plan.push({ title: `Révisions (${Object.keys(review).length} fiches)`, route: '#/ear?mode=review', why: `Notions à consolider : ${weak.map((k) => k.split(':')[1]).join(', ')}.` });
  plan.push({ title: 'Analyse de référence', route: '#/analyze', why: 'Une analyse par semaine : c’est là que tu voles des ingrédients aux meilleurs.' });
  if (cur.ideas.length) plan.push({ title: 'Développe une idée de la semaine', route: '#/remix', why: `Tu as ${cur.ideas.length} idée(s) au Carnet : transforme-en une plutôt que d’en commencer une nouvelle.` });
  if (untriedGenre) plan.push({ title: `Découvre : ${untriedGenre.name}`, route: `#/atlas?g=${untriedGenre.id}`, why: 'Un style jamais exploré = de nouveaux réflexes.' });
  if (programNext) plan.push({ title: programNext.title, route: '#/program', why: 'Continue le programme 4 semaines.' });
  return { msgs, plan: plan.slice(0, 6), weakest, strongest };
}
