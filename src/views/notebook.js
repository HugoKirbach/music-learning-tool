import { el, card, header, segmented, downloadMidi, toast, modal } from '../ui.js';
import { getState, update } from '../store.js';
import { genreById } from '../data/genres.js';
import { projectToSong } from '../core/arrange.js';
import { DRUM_ROWS, VEL } from '../core/rhythm.js';

const TYPES = {
  idea: { emoji: '💡', name: 'Idées' },
  beat: { emoji: '🥁', name: 'Beats' },
  chords: { emoji: '🎼', name: 'Accords' },
  sound: { emoji: '🔊', name: 'Sons' },
  note: { emoji: '📝', name: 'Notes' },
};

function beatSong(it) {
  const notes = [];
  for (let b = 0; b < 4; b++) for (const r of DRUM_ROWS) it.drums[r.id].forEach((v, i) => { if (v) notes.push({ pitch: r.midi, start: b * 4 + i / 4, dur: 0.25, vel: VEL[v] }); });
  return { bpm: it.bpm, tracks: [{ name: 'Drums', channel: 9, notes }] };
}

/** Ouvre une idée du Carnet dans le Lab qui va avec. */
export function openItem(it) {
  update((s) => {
    if (it.type === 'idea') s.project = JSON.parse(JSON.stringify(it.project));
    if (it.type === 'idea' && it.arrangement) s.arrangement = JSON.parse(JSON.stringify(it.arrangement));
    if (it.type === 'beat') Object.assign(s.project, { drums: JSON.parse(JSON.stringify(it.drums)), bpm: it.bpm, swing: it.swing ?? s.project.swing, genre: it.genre || s.project.genre });
    if (it.type === 'chords') Object.assign(s.project, { chords: JSON.parse(JSON.stringify(it.chords)), rootPc: it.rootPc, scale: it.scale, ext: it.ext || 3 });
  });
  location.hash = { idea: it.arrangement ? '#/arrange' : '#/melody', beat: '#/beat', chords: '#/chords', sound: `#/synth?load=${it.id}` }[it.type] || '#/notebook';
}

/** Export MIDI d'une idée (null si l'élément n'a pas de notes : son, note texte). */
export function itemMidi(it) {
  if (it.type === 'idea' && it.project) return () => downloadMidi(`idee-${it.genre}`, projectToSong(it.project));
  if (it.type === 'beat') return () => downloadMidi(`beat-${it.genre}`, beatSong(it));
  if (it.type === 'chords') return () => downloadMidi('accords', projectToSong({ ...getState().project, chords: it.chords, rootPc: it.rootPc, scale: it.scale, ext: it.ext }, { chords: true, bass: true }));
  return null;
}

/** Retire une idée de la boîte « à finir sur PC ». */
export function markDone(id) {
  update((s) => { const n = s.notebook.find((x) => x.id === id); if (n) n.inbox = false; });
}

/** Garde l'idée en cours (mini-lecteur) dans le Carnet. */
export function saveCurrentIdea() {
  update((s) => { s.notebook.unshift({ id: Date.now(), type: 'idea', title: `Idée ${genreById(s.project.genre).name}`, date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)) }); });
  toast('💡 Idée gardée dans le Carnet', 'good');
}

const fold = (x = '') => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function render(root, params = {}) {
  let filter = params.filter || 'all';
  let q = '';
  const list = el('div');
  const filters = el('div');
  const search = el('input.nb-search', { type: 'search', placeholder: '🔍 Chercher dans le carnet (titre, style, note)…', 'aria-label': 'Chercher dans le carnet', oninput: (e) => { q = fold(e.target.value.trim()); draw(); } });
  const paintFilters = () => {
    const all = getState().notebook;
    const count = (k) => all.filter((n) => (k === 'inbox' ? n.inbox : n.type === k)).length;
    const opts = [{ value: 'all', label: `Tout (${all.length})` },
      ...(count('inbox') ? [{ value: 'inbox', label: `📲 À finir (${count('inbox')})` }] : []),
      ...Object.entries(TYPES).filter(([k]) => count(k)).map(([k, t]) => ({ value: k, label: `${t.emoji} ${t.name} (${count(k)})` }))];
    if (!opts.some((o) => o.value === filter)) filter = 'all';
    filters.replaceChildren(all.length ? segmented(opts, filter, (v) => { filter = v; draw(); }) : null);
    search.hidden = all.length < 6;
  };
  const draw = () => {
    paintFilters();
    const items = getState().notebook.filter((n) => (filter === 'all' || (filter === 'inbox' ? n.inbox : n.type === filter))
      && (!q || fold(`${n.title} ${n.note || ''} ${n.genre ? genreById(n.genre).name : ''}`).includes(q)));
    if (!items.length) {
      list.replaceChildren(card(q ? el('p.muted', `Rien ne correspond à « ${search.value} ».`) : el('div.nb-empty',
        el('p', el('b', 'Ton carnet est vide pour l’instant.')),
        el('p.small.muted', 'Tout ce que tu gardes depuis les ateliers (beats, accords, idées complètes, sons) arrive ici, prêt à être rouvert ou exporté en MIDI vers Live ou le MPC.'),
        el('div.row.gap.wrap',
          el('button.btn.small.primary', { onclick: () => { saveCurrentIdea(); draw(); } }, '💡 Garder mon idée en cours'),
          el('a.btn.small', { href: '#/hum' }, '🎤 Fredonner une idée'),
          el('a.btn.small', { href: '#/beat' }, '🥁 Faire un beat')))));
      return;
    }
    list.replaceChildren(...items.map((it) => card(el('div.note-item',
      el('span.ne', TYPES[it.type]?.emoji || '•'),
      el('div.nbody',
        el('b', it.title, it.inbox ? el('span.inbox-tag', '📲 à finir sur PC') : null),
        el('div.small.muted', new Date(it.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) + (it.genre ? ` · ${genreById(it.genre).name}` : '') + (it.bpm ? ` · ${it.bpm} BPM` : '')),
        it.note ? el('p', it.note) : null,
        el('div.row.gap.wrap',
          it.type !== 'note' ? el('button.btn.small', { onclick: () => openItem(it) }, '↗ Ouvrir') : null,
          it.type === 'idea' ? el('button.btn.small', { onclick: () => downloadMidi(`idee-${it.genre}`, projectToSong(it.project)) }, '⬇ MIDI') : null,
          it.type === 'idea' && it.project ? el('button.btn.small', { title: 'Partager par lien', 'aria-label': 'Partager par lien', onclick: () => import('../share.js').then(({ shareIdea }) => shareIdea(it.project, it.title)) }, '🔗') : null,
          it.type === 'beat' ? el('button.btn.small', { onclick: () => downloadMidi(`beat-${it.genre}`, beatSong(it)) }, '⬇ MIDI') : null,
          it.type === 'chords' ? el('button.btn.small', { onclick: () => downloadMidi('accords', projectToSong({ ...getState().project, chords: it.chords, rootPc: it.rootPc, scale: it.scale, ext: it.ext }, { chords: true, bass: true })) }, '⬇ MIDI') : null,
          it.inbox ? el('button.btn.small', { onclick: () => { markDone(it.id); draw(); } }, '✓ Fait dans Live') : null,
          el('button.btn.small', { title: 'Renommer / modifier la note', 'aria-label': 'Modifier', onclick: () => editNote(it, draw) }, '✏️'),
          el('button.btn.small.ghost', {
            title: 'Supprimer', 'aria-label': 'Supprimer',
            onclick: () => {
              if (!confirm('Supprimer cet élément ?')) return;
              update((s) => { s.notebook = s.notebook.filter((n) => n.id !== it.id); s.deleted = [...(s.deleted || []), it.id].slice(-300); });
              draw();
            },
          }, '🗑'),
        ),
      ),
    ))));
  };
  root.append(
    header('📓 Carnet d’idées', 'Tout ce que tu crées, prêt à être rouvert ou exporté en MIDI vers Ableton ou le MPC.', '#/home'),
    el('div.row.gap.wrap.nb-actions',
      el('button.btn.small.primary', { onclick: () => editNote(null, draw) }, '📝 Note rapide'),
      el('button.btn.small', { onclick: () => { saveCurrentIdea(); draw(); } }, '💡 Garder mon idée en cours')),
    search, filters, list,
  );
  draw();
  if (params.new) editNote(null, draw);
}

function editNote(it, after) {
  const title = el('input', { type: 'text', value: it ? it.title : '', placeholder: 'Titre (ex. « idée de hook dans le métro »)', style: { width: '100%', marginBottom: '8px' } });
  const txt = el('textarea', { placeholder: 'Ton idée, une référence à écouter, un réglage à tester…' });
  txt.value = it?.note || '';
  const close = modal(el('div', el('h2', it ? 'Modifier' : 'Nouvelle note'), title, txt,
    el('button.btn.primary.wide', {
      onclick: () => {
        const t = title.value.trim() || 'Note';
        update((s) => {
          if (it) { const n = s.notebook.find((x) => x.id === it.id); if (n) { n.title = t; n.note = txt.value; } }
          else s.notebook.unshift({ id: Date.now(), type: 'note', title: t, note: txt.value, date: Date.now() });
        });
        close();
        toast('Enregistré 📓', 'good');
        after();
      },
    }, 'Enregistrer')));
}
