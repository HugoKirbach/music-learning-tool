// Révisions espacées, tout au même endroit : notions d'oreille ratées + niveaux de Piano Rush / Pad Rush à rejouer.
// Chaque fiche revient après 1, 3, 7, 14 puis 30 jours tant qu'elle n'est pas réussie au bon moment.
import { el, card, header } from '../ui.js';
import { getState, dueReviews } from '../store.js';
import { dayKey } from '../core/progress.js';
import { addDays, isGameItem, BOX_DAYS } from '../core/srs.js';
import { LEVELS } from '../data/rush.js';
import { PAD_LEVELS } from '../data/pads.js';
import { REVIEW_NAMES } from './ear.js';

const dayFr = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

/** Fiche de jeu → titre et lien vers le niveau. */
export function gameItem(x) {
  if (x.mode === 'rush') {
    const l = LEVELS.find((v) => v.id === x.value);
    return l && { emoji: '🎹', title: `${l.emoji} ${l.title}`, where: 'Piano Rush', href: `#/rush?level=${l.id}` };
  }
  const l = PAD_LEVELS.find((v) => v.id === x.value);
  return l && { emoji: '🔲', title: `${l.emoji} ${l.title}`, where: x.mode === 'padsear' ? 'Pad Rush · défi à l’oreille' : 'Pad Rush', href: `#/pads?level=${l.id}` };
}

export function render(root) {
  const s = getState();
  const today = dayKey();
  const due = dueReviews();
  const ear = due.filter((x) => !isGameItem(x) && REVIEW_NAMES[x.mode]);
  const games = due.filter(isGameItem).map((x) => ({ ...x, info: gameItem(x) })).filter((x) => x.info);

  root.append(header('🔁 Révisions', 'Ce que tu as raté revient après 1, 3 puis 7 jours (puis 14 et 30) : juste avant de l’oublier.', '#/home'));

  if (!ear.length && !games.length) {
    root.append(card(el('h3', '🎉 Rien à réviser aujourd’hui'),
      el('p.small.muted', 'Une erreur dans un quiz d’oreille, ou un niveau de Piano Rush / Pad Rush sous 80 %, crée une fiche qui reviendra ici au bon moment.')));
  }
  if (ear.length) {
    const kinds = {};
    ear.forEach((x) => { kinds[x.mode] = (kinds[x.mode] || 0) + 1; });
    root.append(card(
      el('div.row.between', el('h3', `👂 Oreille · ${ear.length} notion${ear.length > 1 ? 's' : ''}`), el('a.btn.small.primary', { href: '#/ear?mode=review' }, '▶ Réviser')),
      el('div', Object.entries(kinds).map(([m, n]) => el('span.tag', `${REVIEW_NAMES[m]} ×${n}`)))));
  }
  if (games.length) {
    root.append(card(el('h3', `🎮 Niveaux à rejouer · ${games.length}`),
      el('p.small.muted', 'Validé à 80 % ou plus aujourd’hui : la fiche passe à l’intervalle suivant.'),
      games.map((x) => el('div.row.between.review-row',
        el('div', el('b', x.info.title), el('div.small.muted', `${x.info.where} · étape ${x.box + 1}/${BOX_DAYS.length}`)),
        el('a.btn.small.primary', { href: x.info.href }, 'Jouer')))));
  }

  // Les 7 prochains jours
  const all = Object.entries(s.review || {});
  const next = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1)).map((d) => ({ d, n: all.filter(([, e]) => e.due === d).length }));
  const max = Math.max(1, ...next.map((x) => x.n));
  root.append(card(el('h3', '📅 À venir'),
    el('div.week-bars', next.map((x) => el('div', { title: `${dayFr(x.d)} : ${x.n} fiche(s)` },
      el('span', { style: { height: `${Math.round((100 * x.n) / max)}%` } }), el('small', dayFr(x.d).split(' ')[0])))),
    el('p.small.muted', `${all.length} fiche${all.length > 1 ? 's' : ''} en cours au total.`)));
}
