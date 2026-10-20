// 🎓 Parcours de style (Hard Trance, Hard House) : 6 étapes, du beat à l'export vers Live.
import { el, card, header, toast } from '../ui.js';
import { getState, update, projectFromGenre } from '../store.js';
import { dayKey } from '../core/progress.js';
import { PATHS, pathProgress } from '../data/paths.js';
import { genreById } from '../data/genres.js';

export function render(root, params = {}) {
  const path = PATHS[params.g];
  if (!path) { location.hash = '#/atlas'; return; }
  const g = genreById(path.genre);
  const paint = () => {
    const s = getState();
    const pr = pathProgress(s, path.genre);
    root.replaceChildren(
      header(`🎓 Parcours ${path.emoji} ${path.name}`, `${g.bpm} BPM · références : ${path.refs}`, `#/atlas?g=${path.genre}`),
      card(el('p', path.intro),
        el('div.bar', el('div.bar-fill', { style: { width: `${Math.round((100 * pr.count) / pr.total)}%` } })),
        el('p.small.muted', pr.started ? `${pr.count}/${pr.total} étapes faites${pr.count === pr.total ? ' — morceau terminé, bravo ! 🎉' : ''}` : 'Le parcours charge l’idée de départ du style dans tes Labs (ton idée en cours est gardée au Carnet).'),
        pr.started ? null : el('button.btn.primary.big.wide', { onclick: start }, '▶ Commencer le parcours')),
      el('ol.path-steps', path.steps.map((st, i) => {
        const done = pr.done[st.id];
        const current = pr.started && pr.next?.id === st.id;
        return el('li.path-step' + (done ? '.done' : current ? '.current' : ''),
          el('div.row.between', el('b', `${done ? '✅' : st.emoji} ${i + 1}. ${st.title}`),
            pr.started ? el('a.btn.small' + (current ? '.primary' : ''), { href: st.href }, st.cta) : null),
          el('p.small', st.lesson),
          pr.started && !done ? el('button.btn.small.ghost', { onclick: () => { update((x) => { x.paths[path.genre].done = { ...(x.paths[path.genre].done || {}), [st.id]: dayKey() }; }); paint(); } }, '✓ J’ai fait cette étape') : null);
      })),
      pr.started ? el('p.small.muted', 'Les étapes se cochent toutes seules quand tu valides l’exercice dans ce style (ou le niveau Pad Rush, ou un export MIDI).') : null,
    );
  };
  const start = () => {
    update((s) => {
      // L'idée en cours part au Carnet avant de charger le style
      if ((s.project.melody || []).some(Boolean)) s.notebook.unshift({ id: Date.now(), type: 'idea', title: 'Idée gardée avant un parcours', date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)), inbox: false });
      s.project = projectFromGenre(path.genre);
      s.paths = { ...(s.paths || {}), [path.genre]: { start: dayKey(), startAt: Date.now(), exports0: s.stats.exports || 0, done: {} } };
    });
    toast(`Idée ${path.name} chargée dans tes Labs : c’est parti ! 🎧`, 'good');
    paint();
  };
  paint();
}
