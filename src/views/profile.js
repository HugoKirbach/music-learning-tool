// Profil : niveau, activité, styles préférés, passeport, collection et accès au suivi (progrès, compétences, amis…).
import { boltsBalance } from '../core/challenges.js';
import { el, card, header, plural } from '../ui.js';
import { getState, update } from '../store.js';
import { levelFromXp, titleFor, SKILLS, dayKey } from '../core/progress.js';
import { ACHIEVEMENTS, CARDS } from '../core/achievements.js';
import { GENRES, genreById } from '../data/genres.js';
import { cleanFavs } from '../core/daily.js';
import { cloudStatus } from '../cloud.js';
import { getMyProfile } from '../social.js';
import { placementDue } from '../core/pedagogy.js';

/** Top 3 des styles préférés : trois listes (1er, 2e, 3e), chaque style une seule fois. */
function favCard() {
  const box = card();
  const paint = () => {
    const favs = cleanFavs(getState().settings.favGenres || []);
    const set = (i, id) => update((st) => {
      const f = [...cleanFavs(st.settings.favGenres || [])];
      if (id) f[i] = id; else f.splice(i, 1);
      st.settings.favGenres = cleanFavs(f.filter(Boolean));
    });
    const slot = (i) => {
      const cur = favs[i] || '';
      const sel = el('select', { 'aria-label': `Style préféré n°${i + 1}`, disabled: i > favs.length, onchange: (e) => { set(i, e.target.value); paint(); } },
        el('option', { value: '' }, i > favs.length ? '—' : '— aucun —'),
        GENRES.filter((g) => g.id === cur || !favs.includes(g.id)).map((g) => el('option', { value: g.id, selected: g.id === cur }, `${g.emoji} ${g.name} · ${g.bpm} BPM`)));
      return el('label.fav-slot', el('span', ['🥇', '🥈', '🥉'][i]), sel);
    };
    box.replaceChildren(
      el('h3', '❤️ Mes 3 styles préférés'),
      el('p.small.muted', 'Ils reviennent plus souvent en style du jour, apparaissent en tête de l’Atlas et sont visibles par tes amis.'),
      el('div.fav-slots', [0, 1, 2].map(slot)),
      favs.length ? el('div.row.gap.wrap', { style: { marginTop: '8px' } }, favs.map((id) => el('a.chip-tile', { href: `#/atlas?g=${id}` }, `${genreById(id).emoji} ${genreById(id).name}`))) : null);
  };
  paint();
  return box;
}

export function render(root, params = {}) {
  // Ancienne adresse du compte (Profil › Compte) : désormais dans les Réglages
  if (params.account) { location.replace('#/settings?sec=account'); return; }
  const s = getState();
  const lv = levelFromXp(s.xp);
  const maxSkill = Math.max(100, ...Object.values(s.skills));
  const ear = s.stats.earTotal ? Math.round((100 * s.stats.earCorrect) / s.stats.earTotal) : 0;

  // Activité des 28 derniers jours
  const heat = el('div.heat');
  for (let i = 27; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const xp = s.days[dayKey(d)]?.xp || 0;
    const a = Math.min(1, xp / s.settings.dailyGoal);
    heat.appendChild(el('div', { title: `${dayKey(d)} : ${xp} XP`, style: { background: xp ? `rgba(179,136,255,${0.25 + a * 0.75})` : '' } }));
  }

  const cs = cloudStatus();
  const who = getMyProfile()?.pseudo || cs.user?.name || cs.known?.name || null;
  const link = (href, emoji, name, sub) => el('a.profile-link', { href }, el('span.pl-emoji', { 'aria-hidden': 'true' }, emoji), el('span.pl-text', el('b', name), sub ? el('small', sub) : null));
  const nbBadges = Object.keys(s.badges).filter((id) => ACHIEVEMENTS.some((a) => a.id === id)).length;

  root.append(
    el('div.hub-head', header('👤 Profil', `${who ? `${who} · ` : ''}${titleFor(lv.level)} — niveau ${lv.level}`, null),
      el('a.btn.hub-search', { href: '#/settings', 'aria-label': 'Réglages' }, '⚙️')),
    cs.user || cs.known ? null : el('a.profile-sync', { href: '#/settings?sec=account' },
      el('span', { 'aria-hidden': 'true' }, '☁️'),
      el('span', el('b', 'Synchronise ton téléphone et ton PC'), el('small', 'Un compte gratuit garde ta progression et ton carnet sur tous tes appareils.')),
      el('span.sec-more', 'Se connecter →')),
    el('nav.profile-grid', { 'aria-label': 'Mon suivi' },
      link('#/progress', '📊', 'Mes progrès', 'Courbes, objectifs, certificats'),
      link('#/skills', '🌳', 'Compétences', '18 compétences à valider'),
      link('#/bilan', '📈', 'Bilan & coach', 'Ta semaine et le plan du coach'),
      link('#/bip', '🤖', 'Bip', `${boltsBalance(s)} 🔩 · défis du jour, garde-robe`),
      link('#/collection', '🏅', 'Collection', `${nbBadges}/${ACHIEVEMENTS.length} succès · ${Object.keys(s.cards || {}).length}/${CARDS.length} cartes`),
      link('#/friends', '👥', 'Amis', 'Classement de la semaine'),
      link('#/placement', '🧪', 'Test de la semaine', placementDue(s) ? 'À passer cette semaine' : 'Fait cette semaine ✓'),
      link('#/settings', '⚙️', 'Réglages', 'Compte, MIDI, audio, Live, sauvegarde')),
    el('div.cols',
      el('div',
        card(
          el('div.row.between', el('b', `Niveau ${lv.level}`), el('span.muted.small', `${lv.into}/${lv.needed} XP`)),
          el('div.bar', el('div.bar-fill', { style: { width: `${Math.round(lv.progress * 100)}%` } })),
          el('div.stat-grid',
            el('div', el('b', `🔥 ${s.streak.count || 0}`), el('span', `série (record ${s.streak.best || 0})`)),
            el('div', { title: '1 joker gagné tous les 7 jours d’affilée (2 au maximum) : il rattrape un jour manqué tout seul.' }, el('b', `🧊 ${s.streak.freezes || 0}/2`), el('span', 'jokers de série')),
            el('div', el('b', s.stats.sessions), el('span', 'sessions')),
            el('div', el('b', s.xp), el('span', 'XP total')),
            el('div', el('b', `${ear}%`), el('span', 'oreille')),
            el('div', el('b', Object.values(s.missions).reduce((a, b) => a + b, 0)), el('span', 'missions studio')),
          ),
          el('p.small.muted', { style: { marginTop: '10px' } }, '28 derniers jours'), heat,
        ),
        card(el('div.row.between', el('h3', '📊 Compétences'), el('a.sec-more', { href: '#/skills' }, 'Arbre →')),
          el('p.small.muted', 'La session express cible automatiquement ta compétence la plus faible.'),
          Object.entries(SKILLS).map(([k, sk]) => el('div.skill',
            el('div.skill-head', el('span', `${sk.emoji} ${sk.name}`), el('span.muted', `${s.skills[k]} XP`)),
            el('div.meter', el('div', { style: { width: `${Math.round((100 * s.skills[k]) / maxSkill)}%`, background: sk.color } }))))),
      ),
      el('div',
        favCard(),
        card(el('div.row.between', el('h3', '🏅 Derniers succès'), el('a.sec-more', { href: '#/collection' }, 'Tout voir →')),
          el('p.small.muted', `${nbBadges}/${ACHIEVEMENTS.length} succès · ${Object.keys(s.cards || {}).length}/${CARDS.length} cartes de légende · ${plural(Object.keys(s.club?.crate || {}).length, 'vinyle')}`),
          nbBadges ? el('div.badges', ACHIEVEMENTS.filter((a) => s.badges[a.id]).sort((a, b) => (s.badges[b.id] || '').localeCompare(s.badges[a.id] || '')).slice(0, 6)
            .map((b) => el('div.badge.' + b.tier, { title: b.desc }, el('span.be', { 'aria-hidden': 'true' }, b.emoji), el('b', b.name)))) : el('p.small', 'Joue, crée, reviens demain : les premiers succès arrivent vite.')),
        card(el('h3', `🛂 Passeport des styles (${Object.keys(s.genres).length}/${GENRES.length})`),
          el('div.passport', GENRES.map((g) => el('a.stamp' + (s.genres[g.id] ? '.got' : ''), { href: `#/atlas?g=${g.id}` }, el('span.se', g.emoji), g.name)))),
      ),
    ),
  );
}
