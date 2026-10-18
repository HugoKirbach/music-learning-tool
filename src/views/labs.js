import { el, header } from '../ui.js';
import { getState, level, update } from '../store.js';
import { FAMILIES, SCREENS, screenById } from '../catalog.js';

export function render(root) {
  const s = getState();
  const lv = level();
  const all = !!s.settings.allModules;
  // Navigation progressive : les modules avancés apparaissent avec le niveau (ou « Tout afficher » dans le Profil)
  const open = (x) => all || !x.minLevel || lv >= x.minLevel;
  const recent = (s.recent || []).map(screenById).filter((x) => x && x.fam && open(x)).slice(0, 3);
  const tile = (x) => el('a.tile', { href: x.href }, el('div.tile-emoji', x.emoji), el('b', x.name), el('span', x.desc));
  root.append(header('Labs', 'Des ateliers courts, rangés par famille. Tout ce que tu crées s’exporte en MIDI.', null));
  if (recent.length) {
    root.append(el('h3.fam-title', '⏱️ Reprendre'),
      el('div.recent-row', recent.map((x) => el('a.chip-tile', { href: x.href }, el('span', x.emoji), x.name))));
  }
  for (const f of FAMILIES) {
    const list = SCREENS.filter((x) => x.fam === f.id && open(x));
    if (!list.length) continue;
    root.append(
      el('div.fam-head', el('h3.fam-title', `${f.emoji} ${f.name}`), el('span.small.muted', f.desc)),
      el('div.grid2.wide3', list.map(tile)),
    );
  }
  const locked = SCREENS.filter((x) => x.fam && !open(x)).sort((a, b) => a.minLevel - b.minLevel);
  if (locked.length) {
    root.append(el('details.card.locked-labs',
      el('summary', `🔒 ${locked.length} ateliers avancés se débloquent avec ton niveau`),
      el('p.small.muted', 'Ils s’affichent automatiquement quand tu montes de niveau, pour ne pas tout découvrir d’un coup.'),
      el('div.locked-list', locked.map((x) => el('a.locked-item', { href: x.href }, el('span', x.emoji), el('b', x.name), el('small', `Niveau ${x.minLevel}`)))),
      el('button.btn.small', { onclick: () => { update((st) => { st.settings.allModules = true; }); location.reload(); } }, 'Tout afficher maintenant')));
  }
}
