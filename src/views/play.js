// Onglet Jouer : tous les jeux au même endroit (Nuit au club, Piano Rush, Pad Rush, oreille), avec ta progression.
import { el, header, htile, sectionHead, plural } from '../ui.js';
import { getState, level, dueReviews, dueEarReviews } from '../store.js';
import { LEVELS } from '../data/rush.js';
import { PAD_LEVELS } from '../data/pads.js';
import * as club from '../core/club.js';
import { WARMUPS, rng, pick } from '../core/daily.js';
import { dayKey } from '../core/progress.js';
import { SECTIONS, SCREENS, isOpen } from '../catalog.js';
import { openSearch } from '../search.js';

const nb = (x) => String(x).replace(/ /g, ' ');
/** Niveaux réussis et étoiles d'un jeu à niveaux. */
export const levelProgress = (best = {}, levels) => ({
  done: levels.filter((l) => (best[l.id]?.stars || 0) >= 1).length,
  stars: levels.reduce((a, l) => a + (best[l.id]?.stars || 0), 0),
  total: levels.length,
});

export function render(root) {
  const s = getState();
  const d = dayKey();
  const lv = level();
  const c = s.club || {};
  const dailyDone = c.daily?.day === d;
  const silent = club.silentStars(c, d);
  const rp = levelProgress(s.rush?.best, LEVELS);
  const pp = levelProgress(s.pads?.best, PAD_LEVELS);
  const earDue = dueEarReviews().length;
  const due = dueReviews().length;
  const quick = pick(rng(d + Date.now()), WARMUPS);
  const detail = {
    rush: nb(`${rp.done}/${rp.total} niveaux`) + ' · ' + nb(`${rp.stars} ★`),
    pads: nb(`${pp.done}/${pp.total} niveaux`) + ' · ' + nb(`${pp.stars} ★`),
    ear: earDue ? `${plural(earDue, 'révision')} d’oreille à faire` : 'Intervalles, accords, styles, sons',
  };

  const clubCard = el('section.play-feature', { 'aria-labelledby': 'play-club' },
    el('div.play-feature-head',
      el('span.play-feature-emoji', { 'aria-hidden': 'true' }, '🪩'),
      el('div', el('h2.home-h2', { id: 'play-club' }, 'Nuit au club'),
        el('p.small.muted', 'Tu es DJ : des mini-jeux de quelques secondes, la salle s’échauffe, ton oreille progresse sans y penser.'))),
    el('div.play-stats',
      el('span.qchip' + (dailyDone ? '.ok' : ''), dailyDone ? `✓ Set du jour : ${c.daily.score} pts` : '📅 Set du jour · XP ×2'),
      el('span.qchip', `⭐ ${club.totalStars(c.best)}/${club.MAX_STARS}`),
      el('span.qchip', `💿 ${plural(Object.keys(c.crate || {}).length, 'vinyle')}`)),
    el('div.row.gap.wrap',
      el('a.btn.primary.big', { href: '#/club' }, '🔊 Jouer avec le son'),
      el('a.btn.big', { href: '#/club?silent=1' }, '🔇 Sans le son')),
    el('p.small.muted', '🔇 Sans le son : grilles de rythme, accords au clavier, calcul de producteur, structure d’un morceau et réglages de synthé, pour jouer dans le métro ou en réunion. ',
      el('b', `${silent.stars}/${silent.max} ★`), silent.dailyDone ? ' · set du jour silencieux fait ✓' : ''));

  const bySec = (id) => SCREENS.filter((x) => x.sec === id && isOpen(x, lv, s.settings.allModules));
  const sectionEl = (sec, extra = []) => el('section.home-section', { 'aria-labelledby': `play-${sec.id}` },
    sectionHead(`play-${sec.id}`, `${sec.emoji} ${sec.name}`, sec.desc),
    el('div.home-tiles', bySec(sec.id).map((x) => htile(x.href, x.emoji, x.name, detail[x.id] || x.desc)), extra));

  root.append(
    el('div.hub-head', header('🎮 Jouer', 'Des jeux courts pour l’oreille, le rythme et la théorie. Parfaits sur téléphone.', null),
      el('button.btn.hub-search', { type: 'button', onclick: () => openSearch(), 'aria-label': 'Rechercher un jeu ou un atelier' }, '🔍')),
    clubCard,
    sectionEl(SECTIONS.find((x) => x.id === 'rhythm')),
    sectionEl(SECTIONS.find((x) => x.id === 'ear'), [
      htile(quick.route, '⏱️', 'Défi 2 min', `${quick.title} · ${quick.desc}`),
      htile('#/review', '🔁', 'Révisions', due ? `${plural(due, 'notion')} à revoir aujourd’hui` : 'Rien à revoir aujourd’hui ✓'),
    ]),
  );
}
