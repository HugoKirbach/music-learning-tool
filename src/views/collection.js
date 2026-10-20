// 🏅 Ma collection : succès par catégorie (paliers bronze / argent / or), cartes « Machines de légende »,
// vinyles de Nuit au club et certificats.
import { el, card, header } from '../ui.js';
import { getState } from '../store.js';
import { ACHIEVEMENTS, CATEGORIES, categoryProgress, CARDS, RARITY } from '../core/achievements.js';
import { CERT_LEVELS, titleFor } from '../core/progress.js';
import { GENRES } from '../data/genres.js';

const TIER = { bronze: '🥉', silver: '🥈', gold: '🥇' };
const dateFr = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function render(root, params = {}) {
  const s = getState();
  const got = Object.keys(s.badges || {}).filter((id) => ACHIEVEMENTS.some((a) => a.id === id)).length;
  const cards = s.cards || {};
  const nCards = CARDS.filter((c) => cards[c.id]).length;
  const vinyls = Object.keys(s.club?.crate || {}).length;
  const certs = Object.keys(s.certs || {}).length;

  root.append(
    header('🏅 Ma collection', 'Tout ce que tu as gagné : succès, cartes de légende, vinyles et certificats.', '#/profile'),
    card(el('div.stat-grid',
      el('div', el('b', `${got}/${ACHIEVEMENTS.length}`), el('span', 'succès')),
      el('div', el('b', `${nCards}/${CARDS.length}`), el('span', 'cartes de légende')),
      el('div', el('b', `${vinyls}/${GENRES.length}`), el('span', 'vinyles')),
      el('div', el('b', `${certs}/${CERT_LEVELS.length}`), el('span', 'certificats')))),
  );

  // ---------- Cartes « Machines de légende » ----------
  root.append(el('section.card', { 'aria-labelledby': 'col-cards' },
    el('h2', { id: 'col-cards' }, `🃏 Machines de légende · ${nCards}/${CARDS.length}`),
    el('p.small.muted', 'Une carte à chaque nouveau succès. Les légendaires sont les plus rares.'),
    el('div.legend-cards', CARDS.map((c) => (cards[c.id]
      ? el('details.legend-card.' + c.rarity,
        el('summary', el('span.lc-emoji', { 'aria-hidden': 'true' }, c.emoji), el('b', c.name), el('small', `${c.year} · ${RARITY[c.rarity].name}`)),
        el('p.small', c.fact), el('small.muted', `Obtenue le ${dateFr(cards[c.id])}`))
      : el('div.legend-card.locked', { 'aria-label': 'Carte à découvrir' }, el('span.lc-emoji', { 'aria-hidden': 'true' }, '❔'), el('b', '???'), el('small', RARITY[c.rarity].name)))))));

  // ---------- Succès par catégorie ----------
  for (const cat of CATEGORIES) {
    const list = ACHIEVEMENTS.filter((a) => a.cat === cat.id);
    if (!list.length) continue;
    const pr = categoryProgress(s, cat.id);
    root.append(el('section.card.ach-cat', { 'aria-labelledby': `col-${cat.id}` },
      el('div.row.between', el('h2', { id: `col-${cat.id}` }, `${cat.emoji} ${cat.name}`), el('span.small.muted', `${pr.got}/${pr.total}`)),
      el('div.bar', el('div.bar-fill', { style: { width: `${Math.round((100 * pr.got) / pr.total)}%` } })),
      el('div.badges', list.map((a) => {
        const when = s.badges?.[a.id];
        return el('div.badge.' + a.tier + (when ? '' : '.locked'), { title: a.desc },
          el('span.be', { 'aria-hidden': 'true' }, a.emoji), el('b', a.name), el('div.muted', a.desc),
          el('div.tier', when ? `${TIER[a.tier]} ${dateFr(when)}` : `${TIER[a.tier]} à gagner`));
      }))));
  }

  // ---------- Vinyles et certificats ----------
  root.append(card(el('h2', '🎚️ Vinyles et 🎓 certificats'),
    el('p.small', `${vinyls} style(s) sur ${GENRES.length} dans ta caisse de Nuit au club. ${certs ? `Certificats : ${Object.keys(s.certs).map((L) => `niveau ${L} (${titleFor(Number(L))})`).join(', ')}.` : 'Ton premier certificat arrive au niveau 3.'}`),
    el('div.row.gap.wrap', el('a.btn', { href: '#/club' }, '🪩 Ma caisse de vinyles'), el('a.btn', { href: '#/progress' }, '🎓 Mes certificats'))));

  if (params.cards) requestAnimationFrame(() => root.querySelector('#col-cards')?.scrollIntoView({ block: 'start' }));
}
