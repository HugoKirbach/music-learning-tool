// Carte « Tes erreurs récurrentes » (Mes progrès, Révisions) et suggestion pour l'accueil.
import { el, card } from '../ui.js';
import { getState } from '../store.js';
import { recurringErrors } from '../core/mistakes.js';
import { notionLabel, REVIEW_NAMES } from './ear.js';
import { LEVELS } from '../data/rush.js';
import { PAD_LEVELS } from '../data/pads.js';

/** Texte et action pour une erreur récurrente. */
export function describeError(e) {
  if (e.game) {
    const rush = e.mode === 'rush';
    const l = (rush ? LEVELS : PAD_LEVELS).find((x) => x.id === e.value);
    return {
      kind: rush ? '🎹 Piano Rush' : '🔲 Pad Rush', title: `« ${l ? l.title : e.value} » raté ${e.n} fois`,
      text: 'Passe-le en 🎓 Apprentissage (sans chrono), puis rejoue-le en Facile.',
      href: `#/${rush ? 'rush' : 'pads'}?level=${e.value}`, cta: 'Retravailler',
    };
  }
  const name = notionLabel(e.mode, e.value);
  return {
    kind: REVIEW_NAMES[e.mode] || '👂 Oreille',
    title: e.confused ? `Tu confonds souvent ${name} et ${notionLabel(e.mode, e.confused)}` : `${name} raté ${e.n} fois`,
    text: e.confused ? `${e.confusedN} fois tu as répondu « ${notionLabel(e.mode, e.confused)} » au lieu de « ${name} ». 2 minutes ciblées pour faire la différence.` : '2 minutes ciblées pour l’ancrer.',
    href: `#/ear?mode=drill&k=${encodeURIComponent(e.key)}`, cta: '🎯 2 min ciblées',
  };
}

export function topError(s = getState()) {
  return recurringErrors(s)[0] || null;
}

export function mistakesCard(s = getState()) {
  const list = recurringErrors(s).slice(0, 5);
  return card(el('h3', '🎯 Tes erreurs récurrentes'),
    list.length
      ? list.map((e) => {
        const d = describeError(e);
        return el('div.row.between.review-row', el('div', el('div.small.muted', d.kind), el('b', d.title), el('div.small.muted', d.text)), el('a.btn.small.primary', { href: d.href }, d.cta));
      })
      : el('p.small.muted', 'Rien de récurrent pour l’instant : quand tu rates plusieurs fois la même notion, elle apparaît ici avec un exercice ciblé.'));
}
