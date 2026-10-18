// Rappels intelligents : le message s'adapte à ce qui compte aujourd'hui (série en danger, test du lundi, projet…).
import { dayKey } from './progress.js';
import { placementDue, weekId, weekday, PROJECT_STEPS, projectProgress } from './pedagogy.js';

export function practicedToday(s, d = new Date()) {
  return (s.days?.[dayKey(d)]?.exercises || 0) > 0;
}

/** La série s'arrête ce soir si on ne joue pas aujourd'hui. */
export function streakAtRisk(s, d = new Date()) {
  const y = new Date(d); y.setDate(y.getDate() - 1);
  return (s.streak?.count || 0) >= 2 && s.streak.last === dayKey(y) && !practicedToday(s, d);
}

/** Message du rappel du jour, ou null si l'utilisateur a déjà joué aujourd'hui. */
export function reminderMessage(s, d = new Date()) {
  if (practicedToday(s, d)) return null;
  if (streakAtRisk(s, d)) return { title: `🔥 Ta série de ${s.streak.count} jours s’arrête ce soir`, body: '5 minutes suffisent : une session express et elle continue.', url: '#/home?start=1' };
  if (weekday(d) === 0 && placementDue(s, d)) return { title: '🧪 Le test de la semaine est prêt', body: '5 minutes pour mesurer tes progrès et choisir ton focus.', url: '#/placement' };
  const p = (s.weekProjects || {})[weekId(d)];
  if (p && !p.finished) {
    const step = PROJECT_STEPS.find((x) => x.day === weekday(d));
    if (step && !projectProgress(s, p).done[step.id]) return { title: `🏁 ${p.title} : ${step.title.toLowerCase()} aujourd’hui`, body: step.desc, url: step.route };
  }
  return { title: '🎧 5 minutes de musique ?', body: 'Ta session express t’attend : oreille, création, puis un geste à refaire dans Live.', url: '#/home' };
}

/** "19:30" → l'heure du rappel est-elle passée ? */
export function afterTime(time, d = new Date()) {
  const [h, m] = String(time || '19:00').split(':').map(Number);
  return d.getHours() * 60 + d.getMinutes() >= h * 60 + (m || 0);
}
