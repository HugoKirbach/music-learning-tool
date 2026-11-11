// 🎯 Carte « Défis du jour » : trois défis, leur avancement, les boulons à gagner et le coffre.
import { el } from '../ui.js';
import { getState } from '../store.js';
import { dayKey } from '../core/progress.js';
import { challengeStatus, boltsBalance, BOLT, CHEST_BOLTS, CHEST_XP } from '../core/challenges.js';

/** Temps restant avant minuit (« 5 h 12 »). */
function untilMidnight() {
  const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0);
  const min = Math.max(1, Math.round((m - n) / 60000));
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;
}

export function dailyCard({ compact = false } = {}) {
  const s = getState();
  const st = challengeStatus(s, dayKey());
  return el('section.daily-card' + (st.chest ? '.all' : '') + (compact ? '.compact' : ''), { 'aria-label': 'Défis du jour' },
    el('div.dc-head',
      el('b', '🎯 Défis du jour'),
      el('span.dc-time', { title: 'De nouveaux défis chaque jour à minuit' }, st.chest ? 'Tout est fait ✓' : `⏳ ${untilMidnight()}`),
      el('a.dc-bolts', { href: '#/bip', title: 'Tes boulons : à dépenser dans la garde-robe de Bip' }, `${BOLT} ${boltsBalance(s)}`)),
    el('ul.dc-list', st.list.map((c) => el('li.dc-item' + (c.done ? '.done' : ''),
      el('span.dc-emoji', { 'aria-hidden': 'true' }, c.done ? '✅' : c.emoji),
      el('div.dc-main', el('span.dc-name', c.name),
        el('div.dc-bar', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': c.goal, 'aria-valuenow': c.value }, el('i', { style: { width: `${Math.round((100 * c.value) / c.goal)}%` } }))),
      el('span.dc-count', c.goal > 1 ? `${c.value}/${c.goal}` : ''),
      el('span.dc-reward' + (c.done ? '.got' : ''), `+${c.bolts} ${BOLT}`)))),
    el('div.dc-chest' + (st.chest ? '.open' : st.count ? '.near' : ''),
      el('span.dc-chest-ico', { 'aria-hidden': 'true' }, st.chest ? '🎁' : '🧰'),
      el('span', st.chest ? `Coffre du jour ouvert : +${CHEST_BOLTS} ${BOLT} et +${CHEST_XP} XP` : `Coffre du jour : ${st.count}/3 défis · +${CHEST_BOLTS} ${BOLT} et +${CHEST_XP} XP`),
      el('span.dc-dots', { 'aria-hidden': 'true' }, [0, 1, 2].map((i) => el('i' + (i < st.count ? '.on' : ''))))));
}
