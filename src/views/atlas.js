import { el, card, header, playButton, toast, downloadMidi } from '../ui.js';
import { cleanFavs } from '../core/daily.js';
import { PATHS } from '../data/paths.js';
import { getState, update, projectFromGenre } from '../store.js';
import { GENRES, genreById } from '../data/genres.js';
import { SCALES, NOTE_NAMES, slotChord } from '../core/theory.js';
import { playProject, stopAll } from '../player.js';
import { DEMOS } from '../data/demos.js';
import { demoToSong, sectionAt } from '../core/demosong.js';
import { playDemo } from '../demoplayer.js';

export function render(root, params) {
  if (params.g) return detail(root, genreById(params.g));
  const s = getState();
  const families = [...new Set(GENRES.map((g) => g.family))];
  root.append(header('🗺️ Atlas des styles', `${Object.keys(s.genres).length}/${GENRES.length} styles explorés. Chaque style = quelques ingrédients à connaître… pour mieux les mélanger.`));
  const favs = cleanFavs(s.settings.favGenres || []);
  const tile = (g) => el('a.tile.genre-card', { href: `#/atlas?g=${g.id}` },
    el('div.ge', g.emoji), el('b', g.name + (s.genres[g.id] ? ' ✓' : '')), el('span', `${g.bpm} BPM · ${SCALES[g.scale].name}`));
  if (favs.length) root.append(el('h3', { style: { margin: '10px 0 8px' } }, '❤️ Tes styles préférés'), el('div.grid2.wide3', favs.map((id) => tile(genreById(id)))));
  for (const f of families) {
    root.append(el('h3', { style: { margin: '10px 0 8px' } }, f),
      el('div.grid2.wide3', GENRES.filter((g) => g.family === f).map(tile)));
  }
}

/** Ajoute / retire le style du top 3 (si le top est plein, il remplace le 3e). */
function favButton(g) {
  const b = el('button.btn', { type: 'button' });
  const paint = () => {
    const on = (getState().settings.favGenres || []).includes(g.id);
    b.textContent = on ? '💔 Retirer de mes favoris' : '❤️ Ajouter à mes favoris';
    b.setAttribute('aria-pressed', String(on));
  };
  b.addEventListener('click', () => {
    const favs = cleanFavs(getState().settings.favGenres || []);
    const on = favs.includes(g.id);
    update((st) => { st.settings.favGenres = on ? favs.filter((x) => x !== g.id) : cleanFavs([...favs.slice(0, 2), g.id]); });
    if (!on && favs.length >= 3) toast(`Top 3 plein : ${genreById(favs[2]).name} (3e) laisse sa place`, 'info');
    paint();
  });
  paint();
  return b;
}

/** Mini-maquette arrangée : lecture, frise des sections qui suit la lecture, export MIDI multipiste. */
function demoCard(g, d) {
  const song = d.song;
  const chips = song.sections.map((sec) => el('li.demo-sec', { style: { flexGrow: sec.bars } },
    el('b', `${sec.emoji} ${sec.name}`), el('small', `${sec.bars} mes.`)));
  const desc = el('p.small.demo-desc', song.sections[0].desc);
  const showSection = (i) => {
    chips.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('past', k < i); });
    if (song.sections[i]) desc.replaceChildren(el('b', `${song.sections[i].emoji} ${song.sections[i].name} — `), song.sections[i].desc);
  };
  let stop = null;
  const play = playButton(() => {
    stop = playDemo(song, { onStep: (s) => showSection(sectionAt(song, s)), onEnd: () => { play.reset(); showSection(-1); } });
  }, () => { stop?.(); showSection(-1); }, `Écouter la maquette (${Math.round(song.seconds)} s)`);
  chips.forEach((c, i) => c.addEventListener('click', () => showSection(i)));
  return card(
    el('h3', `🎧 Mini-maquette : ${song.title.replace(/ \(.*\)$/, '')}`),
    el('p.small.muted', `${song.bpm} BPM · ${song.bars} mesures · morceau original écrit dans les codes du style : écoute comment il est construit, section par section.`),
    el('div.row.gap.wrap', play,
      el('button.btn', { onclick: () => downloadMidi(`maquette-${g.id}-${song.bpm}bpm`, demoToSong(song)) }, '⬇ MIDI multipiste (Live)')),
    el('ol.demo-timeline', { 'aria-label': 'Sections de la maquette' }, chips),
    desc,
    el('h3', '🎧 Morceaux de référence'),
    el('ul.clean', d.refs.map((r) => el('li', r))),
    el('p.small.muted', d.listen));
}

function detail(root, g) {
  // Lecture de l'idée complète du style sans écraser le projet de l'utilisateur
  const demo = projectFromGenre(g.id);
  const maquette = DEMOS[g.id];
  const play = maquette ? null : playButton(() => playProject(() => demo), () => stopAll(), 'Écouter la démo');
  const chords = g.prog.map((slot) => slotChord(g.rootPc, g.scale, slot, 3));
  root.append(
    header(`${g.emoji} ${g.name}`, `${g.family} · ${g.bpm} BPM${g.swing ? ` · swing ${Math.round(g.swing * 100)}%` : ''}`, '#/atlas'),
    card(el('p', g.desc), el('div.row.gap.wrap', play, favButton(g), PATHS[g.id] ? el('a.btn.primary', { href: `#/path?g=${g.id}` }, `🎓 Parcours ${g.name} (${PATHS[g.id].steps.length} étapes)`) : null),
      el('p.small.muted', `${maquette ? 'Tonalité type' : 'Démo'} : ${NOTE_NAMES[g.rootPc]} ${SCALES[g.scale].name} — ${chords.map((c) => `${c.roman} (${c.symbol})`).join(' – ')}`)),
    maquette ? demoCard(g, maquette) : null,
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
