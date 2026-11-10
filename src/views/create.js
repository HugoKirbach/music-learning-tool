// Onglet Créer : ton idée en cours, puis les ateliers rangés par rubrique (écrire, son, développer, studio).
import { el, header, htile, sectionHead, plural } from '../ui.js';
import { getState, level, update } from '../store.js';
import { SECTIONS, SCREENS, screenById, isOpen } from '../catalog.js';
import { genreById } from '../data/genres.js';
import { NOTE_NAMES, SCALES } from '../core/theory.js';
import { voiceProgression } from '../core/arrange.js';
import { missionById } from '../data/missions.js';
import { weekId, projectProgress } from '../core/pedagogy.js';
import { PATHS, pathProgress } from '../data/paths.js';
import { openSearch } from '../search.js';

export function render(root) {
  const s = getState();
  const lv = level();
  const all = !!s.settings.allModules;
  const p = s.project;
  const g = genreById(p.genre);
  const chords = voiceProgression(p).map((c) => c?.symbol || '–').join(' · ');

  const idea = el('section.play-feature.idea-feature', { 'aria-labelledby': 'create-idea' },
    el('div.play-feature-head',
      el('span.play-feature-emoji', { 'aria-hidden': 'true' }, '💡'),
      el('div', el('h2.home-h2', { id: 'create-idea' }, 'Mon idée'),
        el('p.small.muted', `${g.emoji} ${g.name} · ${p.bpm} BPM · ${NOTE_NAMES[p.rootPc]} ${SCALES[p.scale].name.split(' ')[0]} · ${chords}`))),
    el('div.idea-steps',
      [['#/beat', '🥁', 'Beat'], ['#/chords', '🎼', 'Accords'], ['#/basslab', '🎸', 'Basse'], ['#/melody', '🎵', 'Mélodie']]
        .map(([href, e, n]) => el('a.idea-step', { href }, el('span', { 'aria-hidden': 'true' }, e), n))),
    el('p.small.muted', 'Ta boucle te suit d’un atelier à l’autre (mini-lecteur en bas) ; exporte-la en MIDI ou en Pack Live quand elle te plaît.'));

  // Ce qui t'attend dans le studio : projet, missions mises de côté, parcours de style
  const wp = (s.weekProjects || {})[weekId()];
  const later = (s.later || []).map(missionById).filter(Boolean);
  const detail = {
    project: wp ? (wp.finished ? `${wp.title} · terminé ✓` : `${wp.title} · ${projectProgress(s, wp).count}/${projectProgress(s, wp).total} étapes`) : null,
    studio: later.length ? `${plural(later.length, 'mission')} ${later.length > 1 ? 'mises' : 'mise'} de côté` : null,
  };
  const paths = Object.keys(PATHS).filter((id) => s.paths?.[id] || (s.settings.favGenres || []).includes(id)).map((id) => {
    const pr = pathProgress(s, id);
    return htile(`#/path?g=${id}`, '🎓', `Parcours ${PATHS[id].name}`, pr.started ? `${pr.count}/${pr.total} étapes${pr.next ? ` · ${pr.next.title}` : ' · terminé ✓'}` : `${pr.total} étapes, du beat à Live`);
  });

  const recent = (s.recent || []).map(screenById).filter((x) => x && SECTIONS.some((sec) => sec.tab === 'create' && sec.id === x.sec) && isOpen(x, lv, all)).slice(0, 4);
  const sections = SECTIONS.filter((x) => x.tab === 'create').map((sec) => {
    const list = SCREENS.filter((x) => x.sec === sec.id && isOpen(x, lv, all));
    const extra = sec.id === 'studio' ? [htile('#/studio?dice=1', '🎲', 'Dé à idées', 'Un point de départ, une contrainte, un twist.'), ...paths] : [];
    return el('section.home-section', { 'aria-labelledby': `create-${sec.id}` },
      sectionHead(`create-${sec.id}`, `${sec.emoji} ${sec.name}`, sec.desc),
      el('div.home-tiles', list.map((x) => htile(x.href, x.emoji, x.name, detail[x.id] || x.desc)), extra));
  });
  const locked = SCREENS.filter((x) => x.sec && SECTIONS.some((sec) => sec.tab === 'create' && sec.id === x.sec) && !isOpen(x, lv, all))
    .sort((a, b) => a.minLevel - b.minLevel);

  root.append(
    el('a.hub-back', { href: '#/home' }, '‹ Extras'),
    el('div.hub-head', header('🎛️ Créer', 'Écris, façonne le son, développe… puis continue dans Live, Serum ou sur le MPC.', null),
      el('button.btn.hub-search', { type: 'button', onclick: () => openSearch(), 'aria-label': 'Rechercher un atelier, un style ou une mission' }, '🔍')),
    idea,
    recent.length ? el('div.recent-row', { 'aria-label': 'Reprendre' }, el('span.small.muted', '⏱️ Reprendre :'),
      recent.map((x) => el('a.chip-tile', { href: x.href }, el('span', { 'aria-hidden': 'true' }, x.emoji), x.name))) : null,
    ...sections,
    locked.length ? el('details.card.locked-labs',
      el('summary', `🔒 ${locked.length} ateliers avancés se débloquent avec ton niveau`),
      el('p.small.muted', 'Ils apparaissent tout seuls quand tu montes de niveau, pour ne pas tout découvrir d’un coup.'),
      el('div.locked-list', locked.map((x) => el('a.locked-item', { href: x.href }, el('span', x.emoji), el('b', x.name), el('small', `Niveau ${x.minLevel}`)))),
      el('button.btn.small', { onclick: () => { update((st) => { st.settings.allModules = true; }); root.replaceChildren(); render(root); } }, 'Tout afficher maintenant')) : null,
  );
}
