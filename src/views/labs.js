import { el, header } from '../ui.js';
import { getState } from '../store.js';
import { FAMILIES, SCREENS, screenById } from '../catalog.js';

export function render(root) {
  const recent = (getState().recent || []).map(screenById).filter((s) => s && s.fam).slice(0, 3);
  root.append(header('Labs', 'Des ateliers courts, rangés par famille. Tout ce que tu crées s’exporte en MIDI.', null));
  if (recent.length) {
    root.append(el('h3.fam-title', '⏱️ Reprendre'),
      el('div.recent-row', recent.map((s) => el('a.chip-tile', { href: s.href }, el('span', s.emoji), s.name))));
  }
  for (const f of FAMILIES) {
    root.append(
      el('div.fam-head', el('h3.fam-title', `${f.emoji} ${f.name}`), el('span.small.muted', f.desc)),
      el('div.grid2.wide3', SCREENS.filter((s) => s.fam === f.id).map((s) => el('a.tile', { href: s.href }, el('div.tile-emoji', s.emoji), el('b', s.name), el('span', s.desc)))),
    );
  }
}
