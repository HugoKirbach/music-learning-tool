// 🏅 Ma collection : succès par catégorie (paliers bronze / argent / or), cartes « Machines de légende »,
// vinyles de Nuit au club et certificats. Ce qui est gagné s'affiche d'abord ; ce qui reste, en résumé compact.
import { el, card, header, plural } from '../ui.js';
import { getState } from '../store.js';
import { ACHIEVEMENTS, CATEGORIES, categoryProgress, CARDS, RARITY } from '../core/achievements.js';
import { CERT_LEVELS, titleFor, earnedCerts, levelFromXp } from '../core/progress.js';
import { GENRES } from '../data/genres.js';

const TIER = { bronze: '🥉', silver: '🥈', gold: '🥇' };
const TIER_NAME = { bronze: 'bronze', silver: 'argent', gold: 'or' };
const TIER_ORDER = ['bronze', 'silver', 'gold'];
const RARITY_FR = { common: ['commune', 'communes'], rare: ['rare', 'rares'], legendary: ['légendaire', 'légendaires'] };
const dateFr = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
/** Du plus récent au plus ancien. */
const newestFirst = (when) => (a, b) => String(when(b) || '').localeCompare(String(when(a) || ''));

/** Rubrique repliable : titre, avancement et barre dans le résumé (toujours visibles, même fermée). */
function section(id, title, got, total, open, cls, ...body) {
  return el('details.card.col-sec' + cls, { open },
    el('summary',
      el('h2', { id }, title),
      el('span.col-count' + (got >= total ? '.done' : ''), got >= total ? `✓ ${got}/${total}` : `${got}/${total}`),
      el('span.bar', el('span.bar-fill', { style: { width: `${Math.round((100 * got) / Math.max(1, total))}%` } }))),
    ...body);
}

export function render(root, params = {}) {
  const s = getState();
  const badges = s.badges || {};
  const got = ACHIEVEMENTS.filter((a) => badges[a.id]).length;
  const cards = s.cards || {};
  const nCards = CARDS.filter((c) => cards[c.id]).length;
  const crate = s.club?.crate || {};
  const vinyls = Object.keys(crate).length;
  const certs = earnedCerts(s);
  const empty = !got && !nCards && !vinyls && !certs.length;

  root.append(
    header('🏅 Ma collection', 'Tout ce que tu as gagné : succès, cartes de légende, vinyles et certificats.'),
    card(el('div.stat-grid.four',
      el('div', el('b', `🏅 ${got}/${ACHIEVEMENTS.length}`), el('span', 'succès')),
      el('div', el('b', `🃏 ${nCards}/${CARDS.length}`), el('span', 'cartes de légende')),
      el('div', el('b', `🎚️ ${vinyls}/${GENRES.length}`), el('span', 'vinyles')),
      el('div', el('b', `🎓 ${certs.length}/${CERT_LEVELS.length}`), el('span', 'certificats'))),
    empty ? el('div.col-empty',
      el('p.small', 'Ta vitrine attend sa première pièce : réussis un niveau de Piano Rush ou termine une session express pour gagner ton premier succès… et la carte de légende qui va avec.'),
      el('a.btn.primary', { href: '#/play' }, '🎮 Gagner mon premier succès')) : null),
  );

  // ---------- Cartes « Machines de légende » : les miennes d'abord, le reste en pastilles ----------
  const own = CARDS.filter((c) => cards[c.id]).sort(newestFirst((c) => cards[c.id]));
  const left = CARDS.filter((c) => !cards[c.id]).sort((a, b) => Object.keys(RARITY).indexOf(a.rarity) - Object.keys(RARITY).indexOf(b.rarity));
  const leftOf = (r) => left.filter((c) => c.rarity === r).length;
  root.append(section('col-cards', '🃏 Machines de légende', nCards, CARDS.length, nCards > 0 || !!params.cards || empty, '',
    el('p.small.muted', 'Une carte à chaque nouveau succès. Les légendaires sont les plus rares. Touche une carte pour lire son histoire.'),
    own.length ? el('div.legend-cards', own.map((c) => el('details.legend-card.' + c.rarity,
      el('summary', el('span.lc-emoji', { 'aria-hidden': 'true' }, c.emoji), el('b', c.name), el('small', `${c.year} · ${RARITY[c.rarity].name}`)),
      el('p.small', c.fact), el('small.muted', `Obtenue le ${dateFr(cards[c.id])}`)))) : null,
    left.length
      ? el('div.col-left',
        el('p.small', el('b', `${left.length} à découvrir`), ' · ',
          Object.keys(RARITY).filter(leftOf).map((r) => `${leftOf(r)} ${RARITY_FR[r][leftOf(r) > 1 ? 1 : 0]}`).join(' · ')),
        el('div.lc-chips', left.map((c) => el('span.lc-chip.' + c.rarity, { role: 'img', 'aria-label': `Carte ${RARITY_FR[c.rarity][0]} à découvrir`, title: `Carte ${RARITY_FR[c.rarity][0]} à découvrir` }, '?'))))
      : el('p.small.col-done', '🎉 Collection complète : toutes les machines de légende sont à toi !')));

  // ---------- Succès par catégorie : ouverts quand il y a déjà quelque chose à montrer ----------
  CATEGORIES.forEach((cat, k) => {
    const list = ACHIEVEMENTS.filter((a) => a.cat === cat.id);
    if (!list.length) return;
    const pr = categoryProgress(s, cat.id);
    const won = list.filter((a) => badges[a.id]).sort(newestFirst((a) => badges[a.id]));
    const todo = list.filter((a) => !badges[a.id]).sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
    root.append(section(`col-${cat.id}`, `${cat.emoji} ${cat.name}`, pr.got, pr.total, pr.got > 0 || (!got && k === 0), '.ach-cat',
      won.length ? el('div.badges', won.map((a) => el('div.badge.' + a.tier, { title: a.desc },
        el('span.be', { 'aria-hidden': 'true' }, a.emoji), el('b', a.name), el('div.muted', a.desc),
        el('div.tier', `${TIER[a.tier]} ${dateFr(badges[a.id])}`)))) : null,
      todo.length
        ? el('div.ach-todo',
          el('p.small.muted.ach-todo-h', won.length ? `Prochains succès · encore ${todo.length}` : 'À gagner'),
          todo.map((a) => el('div.ach-next',
            el('span.an-emoji', { 'aria-hidden': 'true' }, a.emoji),
            el('span.an-txt', el('b', a.name), el('small', a.desc)),
            el('span.an-tier', { title: `Palier ${TIER_NAME[a.tier]}`, 'aria-label': `Palier ${TIER_NAME[a.tier]}` }, TIER[a.tier]))))
        : el('p.small.col-done', '🏆 Catégorie complète !')));
  });

  // ---------- Vinyles ----------
  const missing = GENRES.filter((g) => !crate[g.id]);
  root.append(section('col-vinyls', '🎚️ Vinyles', vinyls, GENRES.length, vinyls > 0, '',
    vinyls ? el('div.cert-chips', GENRES.filter((g) => crate[g.id]).map((g) => el('span.chip-tile', `${crate[g.id].kind === 'gold' ? '📀' : '💿'} ${g.name}`))) : null,
    el('p.small.muted', vinyls
      ? `${plural(vinyls, 'style')} dans ta caisse de Nuit au club.${missing.length ? ` Encore ${missing.length} à dénicher.` : ' Caisse complète !'}`
      : 'Chaque soirée réussie à Nuit au club ajoute le vinyle de son style à ta caisse.'),
    el('a.btn.small', { href: '#/club' }, '🪩 Ma caisse de vinyles')));

  // ---------- Certificats (même calcul que Mes progrès) ----------
  const lv = levelFromXp(s.xp).level;
  const nextL = CERT_LEVELS.find((L) => L > lv && !certs.includes(L));
  root.append(section('col-certs', '🎓 Certificats', certs.length, CERT_LEVELS.length, certs.length > 0, '',
    certs.length ? el('div.cert-chips', [...certs].reverse().map((L) => el('span.chip-tile', `🎓 Niveau ${L} · ${titleFor(L)}`))) : null,
    el('p.small.muted', nextL ? `Prochain : niveau ${nextL} (« ${titleFor(nextL)} »).` : 'Tous les certificats sont à toi !'),
    certs.length ? el('a.btn.small', { href: '#/progress' }, '📤 Partager mes certificats') : null));

  if (params.cards) requestAnimationFrame(() => root.querySelector('#col-cards')?.scrollIntoView({ block: 'start' }));
}
