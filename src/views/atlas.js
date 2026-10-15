import { el, card, header, playButton } from '../ui.js';
import { getState, update, projectFromGenre } from '../store.js';
import { GENRES, genreById } from '../data/genres.js';
import { SCALES, NOTE_NAMES, slotChord } from '../core/theory.js';
import { playProject, stopAll } from '../player.js';

export function render(root, params) {
  if (params.g) return detail(root, genreById(params.g));
  const s = getState();
  const families = [...new Set(GENRES.map((g) => g.family))];
  root.append(header('🗺️ Atlas des styles', `${Object.keys(s.genres).length}/${GENRES.length} styles explorés. Chaque style = quelques ingrédients à connaître… pour mieux les mélanger.`));
  for (const f of families) {
    root.append(el('h3', { style: { margin: '10px 0 8px' } }, f),
      el('div.grid2.wide3', GENRES.filter((g) => g.family === f).map((g) => el('a.tile.genre-card', { href: `#/atlas?g=${g.id}` },
        el('div.ge', g.emoji), el('b', g.name + (s.genres[g.id] ? ' ✓' : '')), el('span', `${g.bpm} BPM · ${SCALES[g.scale].name}`)))));
  }
}

function detail(root, g) {
  // Lecture de l'idée complète du style sans écraser le projet de l'utilisateur
  const demo = projectFromGenre(g.id);
  const play = playButton(() => playProject(() => demo), () => stopAll(), 'Écouter la démo');
  const chords = g.prog.map((slot) => slotChord(g.rootPc, g.scale, slot, 3));
  root.append(
    header(`${g.emoji} ${g.name}`, `${g.family} · ${g.bpm} BPM${g.swing ? ` · swing ${Math.round(g.swing * 100)}%` : ''}`, '#/atlas'),
    card(el('p', g.desc), el('div.row.gap.wrap', play),
      el('p.small.muted', `Démo : ${NOTE_NAMES[g.rootPc]} ${SCALES[g.scale].name} — ${chords.map((c) => `${c.roman} (${c.symbol})`).join(' – ')}`)),
    card(el('h3', '🧪 Ingrédients signature'), el('ul.clean', g.signature.map((x) => el('li', x))),
      el('h3', '🎧 Références à écouter'), el('p', g.refs.join(' · ')),
      el('p.small.muted', 'Méthode : écoute 1 morceau de chaque référence en te demandant « où est le kick ? où est la snare ? qu’est-ce qui bouge ? »')),
    card(el('h3', '🎛️ Sur tes outils'),
      el('p', el('b', '🎛️ Live 12 : '), g.tips.ableton), el('p', el('b', '🎹 MPC Key 37 : '), g.tips.mpc), el('p', el('b', '🌊 Serum 2 : '), g.tips.serum)),
    card(el('h3', 'S’entraîner sur ce style'),
      el('div.row.gap.wrap',
        el('a.btn.small', { href: `#/beat?mode=ear&genre=${g.id}` }, '👂 Recréer le beat'),
        el('a.btn.small', { href: `#/beat?mode=constraint&genre=${g.id}` }, '🧩 Beat sous contrainte'),
        el('a.btn.small', { href: `#/chords?mode=recipe&genre=${g.id}` }, '🎼 Recette d’accords'),
        el('a.btn.small', { href: `#/melody?mode=challenge&genre=${g.id}` }, '🎵 Défi hook'),
        el('button.btn.small.primary', {
          onclick: () => {
            update((s) => { s.project = projectFromGenre(g.id); s.genres[g.id] = (s.genres[g.id] || 0) + 1; });
            location.hash = '#/melody';
          },
        }, '💡 Démarrer une idée dans ce style'))),
  );
  return () => stopAll();
}
